import { NHacking } from '../lib/types'

// get grow threads needed
export const getGrowThreads = (
  ns: NS,
  server: NHacking.AnalyzedServer,
  percentOfHack?: number,
  cpuCores: number = 1,
) => {
  const maxMoney = server.moneyMax || 0
  const availableMoney = ns.getServerMoneyAvailable(server.hostname)
  const growAmount = percentOfHack ? maxMoney * percentOfHack : availableMoney / maxMoney

  if (growAmount === 0 || maxMoney === 0) {
    return 0
  }

  const multiplier = maxMoney / growAmount
  const threads = ns.growthAnalyze(server.hostname, multiplier, cpuCores)

  return Math.ceil(threads)
}
