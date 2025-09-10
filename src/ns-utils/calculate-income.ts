import { NHacking } from '../lib/types'
import { getHGWtime } from './get-hgw-time'

export const calculateIncome = (ns: NS, server: NHacking.AnalyzedServer) => {
  // const { hackThreads, hwThreads, growThreads, gwThreads } = getBatchThreads(ns, server, 1,)
  // const threads: BatchThreads = {
  //   hackThreads,
  //   growThreads,
  //   weakenThreads: hwThreads + gwThreads,
  // }
  // const totalRam = getBatchRam(ns, threads)
  // ns.print(totalRam)
  // const maxRam = ns.getServerMaxRam(HOME_SERVER)

  const { weakenTime } = getHGWtime(ns, server.hostname, 's')
  const maxMoney = server.moneyMax || 0
  const hackAnalyze = ns.hackAnalyze(server.hostname)

  return ((maxMoney * hackAnalyze) / weakenTime) * ns.hackAnalyzeChance(server.hostname) // * (maxRam / totalRam)
}
