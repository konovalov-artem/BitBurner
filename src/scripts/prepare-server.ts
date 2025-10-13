import { GROW, GROW_FORTIFY_VALUE, HACKING_SCRIPT_GAP, WEAKEN, ToastVariant } from '../lib/constants'
import { NHacking } from '../lib/types'
import { getHGWtime } from '../ns-utils/get-hgw-time'
import { getFreeRam } from '../ns-utils/get-free-ram'
import { getBatchRam } from '../ns-utils/get-batch-ram'
import { getGrowThreads } from '../ns-utils/get-grow-threads'
import { getWeakenThreads } from '../ns-utils/get-weaken-threads'
import { getWeakenValue } from '../ns-utils/get-weaken-value'
import { calculateIncome } from '../ns-utils/calculate-income'
import { ScriptLib } from '../lib/script-lib'

class PrepareServer extends ScriptLib {
  constructor(
    readonly ns: NS,
    readonly inputPort: number,
    readonly outputPort: number,
  ) {
    super(ns, { inputPort, outputPort })
  }

  start() {
    const data = this.readDataFromManager()
    const servers = [...data.servers.purchased, data.servers.home]
    const player = this.ns.getPlayer()
    const bestServerToHack = this.getBestSeverToHack(data.servers.hacked, player)
    if (!bestServerToHack) {
      this.ns.print(data.servers.hacked)
      return this.toast('⚠️ [PREPARE] No server to hack found', ToastVariant.WARNING)
    }
    this.preareServer(bestServerToHack, servers)
  }

  private getBestSeverToHack(servers: NHacking.AnalyzedServer[], player: Player) {
    const filteredServers = servers
      .filter(({ requiredHackingSkill, moneyMax }) => {
        const isHasMoney = (moneyMax || 0) > 0
        const isEnoughSkill = (requiredHackingSkill || 0) <= player.skills.hacking
        return isHasMoney && isEnoughSkill
      })
      .map(server => ({
        server,
        income: calculateIncome(this.ns, server),
      }))

    if (!filteredServers.length) return null
    return filteredServers.reduce((best, curr) => (curr.income > best.income ? curr : best)).server
  }

  private getCurrentPrepareThreads(servers: NHacking.AnalyzedServer[]) {
    let growThreads = 0
    let weakenThreads = 0

    for (const server of servers) {
      const processes = this.ns.ps(server.hostname).filter(process => process.args.includes('prepare'))
      processes.forEach(process => {
        // filepath ps => "folder/script.ts"
        if (process.filename === GROW) growThreads += process.threads
        if (process.filename === WEAKEN) weakenThreads += process.threads
      })
    }

    return { growThreads, weakenThreads }
  }

  private preareServer(targetServer: NHacking.AnalyzedServer, servers: NHacking.AnalyzedServer[]) {
    const minSeurity = targetServer.minDifficulty
    const maxMoney = targetServer.moneyMax || 0

    const availableMoney = this.ns.getServerMoneyAvailable(targetServer.hostname)
    let currentSecurity = this.ns.getServerSecurityLevel(targetServer.hostname)

    const isNeedsGrow = maxMoney > availableMoney
    let isNeedsWeaken = minSeurity < currentSecurity

    if (!isNeedsWeaken && !isNeedsGrow) {
      return this.sendDataToManager({ targetServer, serverToPerepare: null })
    }

    const { weakenTime, growTime } = getHGWtime(this.ns, targetServer.hostname)

    const weakenRam = this.ns.getScriptRam(WEAKEN)
    const growRam = this.ns.getScriptRam(GROW)

    let growThreads = isNeedsGrow ? getGrowThreads(this.ns, targetServer) : 0

    // check if there are tunning prepare threads
    const runningThreads = this.getCurrentPrepareThreads(servers)
    growThreads = Math.max(growThreads, growThreads - runningThreads.growThreads)
    const runningWeakenValue = getWeakenValue(this.ns, runningThreads.weakenThreads, 1)
    isNeedsWeaken = currentSecurity - runningWeakenValue < minSeurity

    for (const server of servers) {
      isNeedsWeaken = minSeurity < currentSecurity

      if (!isNeedsWeaken && !growThreads) break

      let freeRam = getFreeRam(this.ns, server)

      // minimize weaken
      if (isNeedsWeaken && freeRam >= weakenRam) {
        const needsToWeaken = currentSecurity - runningWeakenValue - minSeurity
        const weakenThreads = getWeakenThreads(this.ns, needsToWeaken, server.cpuCores)
        const threads = Math.min(Math.floor(freeRam / weakenRam), weakenThreads)

        if (threads > 0) {
          currentSecurity -= getWeakenValue(this.ns, threads, server.cpuCores)
          this.ns.exec(WEAKEN, server.hostname, { threads }, targetServer.hostname)
          freeRam -= threads * weakenRam
        }
      }

      // grow server money
      if (isNeedsGrow && freeRam >= growRam + weakenRam) {
        let optimalGrowThreads = 0
        let optimalWeakenThreads = 0
        for (let i = 1; i < growThreads; i++) {
          const weakenThreads = getWeakenThreads(this.ns, i * GROW_FORTIFY_VALUE, server.cpuCores)
          const threads: NHacking.BatchThreads = {
            hackThreads: 0,
            growThreads: i,
            weakenThreads,
          }
          const batchRam = getBatchRam(this.ns, threads)
          if (batchRam <= freeRam) {
            optimalGrowThreads = i
            optimalWeakenThreads = weakenThreads
          } else {
            break
          }
        }
        if (optimalGrowThreads > 0) {
          growThreads -= optimalGrowThreads
          const weakenGapTime = 2 * HACKING_SCRIPT_GAP
          const growGapTime = weakenTime - growTime
          this.ns.exec(WEAKEN, server.hostname, { threads: optimalWeakenThreads }, targetServer.hostname, weakenGapTime)
          this.ns.exec(GROW, server.hostname, { threads: optimalGrowThreads }, targetServer.hostname, growGapTime)
        }
      }
    }
  }
}

export const main = (ns: NS) => {
  const [inputPort, outputPort] = ns.args as number[]
  const preareServer = new PrepareServer(ns, inputPort, outputPort)
  preareServer.start()
}
