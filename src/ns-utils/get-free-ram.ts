import { scripts } from '../manager'
import { NHacking } from '../lib/types'

// 0.1 + 0.05 = 0.15 gb
export const getFreeRam = (ns: NS, server: NHacking.AnalyzedServer) => {
  let reservedRam = 0
  if (server.isHome) {
    reservedRam += Math.max(...scripts.map(s => ns.getScriptRam(s.script)))
  }

  return server.maxRam - ns.getServerUsedRam(server.hostname) - reservedRam
}
