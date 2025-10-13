import { HACKING, HACKNET, PREPARE_SERVER, SUBNET, WEAKEN } from './lib/constants'
import { getProgressBar } from './lib/helpers'
import { NHacking, NManager, NHacknet } from './lib/types'
import { calculateIncome } from './ns-utils/calculate-income'
import { getBatchThreads } from './ns-utils/get-batch-threads'
import { getHGWtime } from './ns-utils/get-hgw-time'

export const scripts: NManager.ScriptTask[] = [
  {
    script: `./scripts/${HACKING}`,
    port: 1,
    priority: 3,
    condition(data: NManager.ManagerData): boolean {
      return true
    },
  },
  {
    script: `./scripts/${SUBNET}`,
    port: 1,
    priority: 1,
    condition(data: NManager.ManagerData): boolean {
      const serversWithRoot = (data.servers.hacked || []).filter(({ hasAdminRights }) => hasAdminRights)

      if (data.servers.hacked?.length > 0 && serversWithRoot.length === data.servers.hacked?.length) return false
      return true
    },
  },
  {
    script: `./scripts/${PREPARE_SERVER}`,
    port: 1,
    priority: 2,
    condition(data: NManager.ManagerData): boolean {
      return true
    },
  },
  {
    script: `./scripts/${HACKNET}`,
    port: 1,
    priority: 2,
    condition(data: NManager.ManagerData): boolean {
      if (data.hacknet.waitTill > Date.now()) return false
      return true
    },
  },
]

class Manager {
  private readonly CMD_PORT = 20
  private readonly DATA_PORT = 19
  private taskQueue: NManager.ScriptTask[] = []
  private isRunning = true
  private data: NManager.ManagerData = {
    scriptsLimit: 1e5,
    servers: {
      home: null,
      purchased: [],
      hacked: [],
    },
    hackServers: [NHacking.EServerTypes.PURCHASED, NHacking.EServerTypes.HOME],
    shareServers: [NHacking.EServerTypes.HACKED],
    previousBatchTime: 0,
    // hacknet
    hacknet: {
      bestOption: null,
      waitTill: Date.now(),
      totalProduction: 0,
    },
  }

  constructor(readonly ns: NS) {}

  async start() {
    this.setUI()
    // cmd port
    this.ns.clearPort(this.CMD_PORT)

    while (true) {
      // clear data port
      this.ns.clearPort(this.DATA_PORT)
      this.ns.clearLog()
      this.ns.print(`[`, new Date(Date.now()).toDateString(), ' ', new Date(Date.now()).toLocaleTimeString(), `]`)
      this.data.player = this.ns.getPlayer()

      // handle cmd
      while (this.isPortHasData(this.CMD_PORT)) {
        const msg: NManager.ManagerCmd = this.getPortData(this.CMD_PORT)
        switch (msg.cmd) {
          case NManager.ManagerCmdType.ADD: {
            const script = scripts.find(s => s.script === msg.script)
            if (script) {
              // add with highest priority
              this.taskQueue.push({ ...script, priority: 0 })
              this.ns.print(`➕ Task added: ${script.script}`)
            }
            break
          }
          case NManager.ManagerCmdType.TOGGLE:
            this.toggleRunning()
            break
          default:
            this.ns.print(`❓ Unknown cmd: ${msg.cmd}`)
            break
        }
      }
      if (this.isRunning) {
        if (this.taskQueue.length > 0) {
          // sort by priority and get first task
          this.taskQueue.sort((a, b) => a.priority - b.priority)
          const task = this.taskQueue.shift()

          // todo remove??
          // check condition
          if (!task.condition(this.data)) continue

          // send data to script through port
          this.ns.writePort(this.DATA_PORT, JSON.stringify(this.data))
          // run script
          this.ns.print(`🚀 Run: ${task.script}`)
          const pid = this.ns.run(task.script, 1, this.DATA_PORT, task.port)

          // wait until script will be finished
          while (this.ns.isRunning(pid)) await this.ns.sleep(100)

          // get output from script through port
          if (this.isPortHasData(task.port)) this.data = { ...this.data, ...this.getPortData(task.port) }
        } else {
          this.ns.print(`🚀 Run: update queue +${scripts.length}`)
          for (const script of scripts) {
            // this.ns.print(`📄 Script: ${script.script}, Priority: ${script.priority}`)
            if (script.condition(this.data)) this.taskQueue.push(script)
          }
        }
        this.logData()
      } else {
        this.ns.print('⏸ Manager paused')
      }

      await this.ns.sleep(10000)
    }
  }

  private logData() {
    this.logPlayer()
    this.logHome()
    this.logServers()
    this.logTarget()
    this.logHacknet()
  }

  private logPlayer() {
    this.ns.print(`📊 STATS:`)
    this.ns.print(`   MONEY         - ${this.ns.formatNumber(this.data.player.money)}`)
    this.ns.print(`   HACKING       - ${this.data.player.skills.hacking}`)
    this.ns.print(`   KARMA         - ${Math.round(this.data.player.karma)}`)
  }

  private logHome() {
    // find home server and display its stats
    if (!this.data.servers.home) return
    const homeRam = this.data.servers.home.maxRam
    if (!homeRam) return
    const ramCost = homeRam * 3.2 * 10 ** 4 * 1.58 ** Math.log2(homeRam)
    const homeCpu = this.data.servers.home.cpuCores
    const cpuCost = 10 ** 9 * 7.5 ** homeCpu
    const ramBuyProgress = Math.min(this.data.player.money / ramCost, 1) * 10
    const cpuBuyProgress = Math.min(this.data.player.money / cpuCost, 1) * 10
    this.ns.print(`💻 HOME STATS:`)
    this.ns.print(`   THREADS       - ~${Math.floor(homeRam / this.ns.getScriptRam(WEAKEN))}`)
    this.ns.print(`   CPU           - ${homeCpu}`)
    this.ns.print(`   RAM           - ${this.ns.formatRam(homeRam)}`)
    this.ns.print(`   CPU🔼 ${getProgressBar(cpuBuyProgress)}  ${this.ns.formatNumber(cpuCost)}`)
    this.ns.print(`   RAM🔼 ${getProgressBar(ramBuyProgress)}  ${this.ns.formatNumber(ramCost)}`)
  }

  private logServers() {
    const serversWithRoot = (this.data.servers.hacked || []).filter(({ hasAdminRights }) => hasAdminRights)
    const purchasedServers = this.data.servers.purchased || []
    const purchasedServersRam = purchasedServers.reduce(
      (acc: number, { maxRam }: NHacking.AnalyzedServer) => acc + maxRam,
      0,
    )
    this.ns.print(`🌐 SERVERS STATS: `)
    this.ns.print(`   ROOT               - ${serversWithRoot.length}/${this.data.servers.hacked?.length || 0}`)
    this.ns.print(`   PURCHASED COUNT    - ${purchasedServers.length}`)
    if (purchasedServers.length) {
      this.ns.print(`   PURCHASED RAM      - ${this.ns.formatRam(purchasedServersRam)}`)
      this.ns.print(`   PURCHASED THREADS  - ~${Math.floor(purchasedServersRam / this.ns.getScriptRam(WEAKEN))}`)
    }
  }

  private logTarget() {
    if (!this.data.targetServer) return
    // current server to hack stats
    const targetProfit = calculateIncome(this.ns, this.data.targetServer)
    const targetServerTime = getHGWtime(this.ns, this.data.targetServer.hostname, 's')
    this.ns.print(`🖥 TARGET SERVER:`)
    this.ns.print(`   HOSTNAME      - ${this.data.targetServer.hostname}`)
    this.ns.print(`   MAX MONEY     - ${this.ns.formatNumber(this.data.targetServer.moneyMax)}`)
    this.ns.print(`   MAX TIME      - ${targetServerTime.weakenTime.toFixed(2)}s`)
    this.ns.print(`   PROFIT        - ${this.ns.formatNumber(targetProfit)}/s`)
    this.ns.print(
      `   BATCH THREADS - ${getBatchThreads(this.ns, this.data.targetServer, this.data.servers.home.maxRam, this.data.scriptsLimit).totalThreads}`,
    )
  }

  private logHacknet() {
    let upgradeLog = 'N/A'
    const bestOption = this.data.hacknet.bestOption
    if (bestOption) {
      upgradeLog = bestOption.type === 'node' ? `📦 Purchase` : `🛠 Upgrade ${bestOption.type} #${bestOption.id}`
    }

    this.ns.print(`💻 HACKNET:`)
    this.ns.print(`   PRODUCTION      - ${this.data.hacknet.totalProduction?.toFixed(2) || '0'}/s`)
    this.ns.print(`   NEXT SCAN       - ${new Date(this.data.hacknet.waitTill).toLocaleTimeString()}`)
    this.ns.print(`   BEST OPTION     - ${upgradeLog}`)
    if (bestOption) {
      this.ns.print(`                   | 💵 Cost: $${this.ns.formatNumber(bestOption.cost)}`)
      this.ns.print(`                   | 📊 ROI: ${bestOption.roi?.toFixed(5)}`)
    }
  }
  private toggleRunning() {
    this.isRunning = !this.isRunning
    this.ns.print(`⏯ Manager ${this.isRunning ? 'running' : 'paused'}`)
  }

  private isPortHasData(port: number) {
    return this.ns.peek(port) !== 'NULL PORT DATA'
  }

  private getPortData(port: number) {
    return JSON.parse(this.ns.readPort(port) || '{}')
  }
  private setUI() {
    this.ns.ui.openTail()
    this.ns.ui.setTailTitle('🧠 Process Manager')
    this.ns.ui.moveTail(this.ns.ui.windowSize()[0] - 350, 0)
    this.ns.ui.resizeTail(350, 500)

    this.ns.disableLog('ALL')
  }
}

export const main = async (ns: NS) => {
  const manager = new Manager(ns)
  await manager.start()
}
