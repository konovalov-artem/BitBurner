import { ANALYZE_DATA, HOME_SERVER, FILES_TO_COPY } from '../lib/constants'
import { ScriptLib } from '../lib/script-lib'
import { NHacking } from '../lib/types'

class Subnet extends ScriptLib {
  constructor(
    readonly ns: NS,
    inputPort: number,
    outputPort: number,
  ) {
    super(ns, { inputPort, outputPort })
  }

  start() {
    this.ns.toast('Scanning subnet...', ToastVariant.INFO, 3000)
    this.ns.print('Scanning subnet...')

    const visitedHosts = new Map<string, string[]>()
    this.dfs(HOME_SERVER, visitedHosts)
    this.analyzeServers(visitedHosts)

    this.ns.toast('Subnet scan completed', ToastVariant.SUCCESS, 3000)
    this.ns.print('Subnet scan completed')

    return true
  }
  // DFS – Depth-First Search
  dfs(start: string, visited: Map<string, string[]>) {
    if (visited.has(start)) return
    const hosts = this.ns.scan(start)
    visited.set(start, hosts)
    for (const hostname of hosts) {
      this.dfs(hostname, visited)
    }
  }

  analyzeServers(hostList: Map<string, string[]>) {
    // const data = []
    const servers = {
      home: null,
      purchased: [],
      hacked: [],
    }
    hostList.forEach((hostsPath, hostname) => {
      const server = this.ns.getServer(hostname)
      const isHome = server.hostname == HOME_SERVER
      let serverType = NHacking.EServerTypes.HACKED
      if (isHome) serverType = NHacking.EServerTypes.HOME
      else if (server.purchasedByPlayer) serverType = NHacking.EServerTypes.PURCHASED

      const analyzedServer = {
        ...server,
        hostsPath,
        isHome,
        serverType,
      }
      this.execRoot(analyzedServer)
      // data.push(analyzedServer)
      if (isHome) servers.home = analyzedServer
      if (serverType === NHacking.EServerTypes.PURCHASED) servers.purchased.push(analyzedServer)
      if (serverType === NHacking.EServerTypes.HACKED) servers.hacked.push(analyzedServer)
    })
    // this.ns.write(ANALYZE_DATA, JSON.stringify(data, null, 2), 'w')
    this.sendDataToManager({ servers })
  }

  execRoot(server: NHacking.AnalyzedServer) {
    if (!server.hasAdminRights) {
      const portsRequired = server.numOpenPortsRequired || 0
      let portsOpened = server.openPortCount || 0

      const portPrograms = [
        { name: 'FTPCrack.exe', func: this.ns.ftpcrack, key: 'ftpPortOpen' },
        { name: 'BruteSSH.exe', func: this.ns.brutessh, key: 'sshPortOpen' },
        { name: 'relaySMTP.exe', func: this.ns.relaysmtp, key: 'smtpPortOpen' },
        { name: 'SQLInject.exe', func: this.ns.sqlinject, key: 'sqlPortOpen' },
        { name: 'HTTPWorm.exe', func: this.ns.httpworm, key: 'httpPortOpen' },
      ]

      for (const program of portPrograms) {
        if (portsOpened >= portsRequired) break
        if (!server[program.key] && this.ns.fileExists(program.name, HOME_SERVER)) {
          program.func(server.hostname)
          server[program.key] = true
          portsOpened++
        }
      }

      server.openPortCount = portsOpened

      if (portsRequired <= portsOpened) {
        server.hasAdminRights = this.ns.nuke(server.hostname)
      } else {
        this.ns.print(`Not enough opened ports at ${server.hostname}`)
      }
      if (server.hasAdminRights) this.ns.print(`Got root at: ${server.hostname}`)
      else
        this.ns.print(
          `Cant get root at: ${server.hostname} required ports ${portsRequired} opened ports ${portsOpened}`,
        )
    } else {
      this.ns.print(`Already have root at: ${server.hostname}`)
    }

    this.ns.scp(FILES_TO_COPY, server.hostname, HOME_SERVER)
  }
}

export const main = (ns: NS) => {
  const [inputPort, outputPort] = ns.args as number[]
  const subnet = new Subnet(ns, inputPort, outputPort)
  subnet.start()
}
