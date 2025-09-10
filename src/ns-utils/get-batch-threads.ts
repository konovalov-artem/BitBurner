import { GROW_FORTIFY_VALUE, HACK_FORTIFY_VALUE } from '../lib/constants'
import { NHacking } from '../lib/types'
import { getBatchRam } from './get-batch-ram'
import { getGrowThreads } from './get-grow-threads'
import { getWeakenThreads } from './get-weaken-threads'

// calculte batck threads per action
export const getBatchThreads = (
  ns: NS,
  server: NHacking.AnalyzedServer,
  availableRam: number,
  maxScripts: number,
  cpuCores: number = 1,
) => {
  const hackAnalyze = ns.hackAnalyze(server.hostname)
  const maxHackThreads = Math.floor(1 / hackAnalyze)
  let hackThreads = 0
  let growThreads = 0
  let hwThreads = 0
  let gwThreads = 0

  for (let optimalHackThreads = 1; optimalHackThreads <= maxHackThreads; optimalHackThreads++) {
    const stealPercent = hackAnalyze * optimalHackThreads
    const optimalGrowThreads = getGrowThreads(ns, server, stealPercent, cpuCores)
    const optimalHwThreads = getWeakenThreads(ns, optimalHackThreads * HACK_FORTIFY_VALUE, cpuCores)
    const optimalGwThreads = getWeakenThreads(ns, optimalGrowThreads * GROW_FORTIFY_VALUE, cpuCores)

    const threads: NHacking.BatchThreads = {
      hackThreads: optimalHackThreads,
      growThreads: optimalGrowThreads,
      weakenThreads: hwThreads + gwThreads,
    }
    const batchRam = getBatchRam(ns, threads)

    const maxBatches = Math.floor(availableRam / batchRam)
    const totalScripts = maxBatches * 4

    if (totalScripts <= maxScripts) {
      hackThreads = optimalHackThreads
      growThreads = optimalGrowThreads
      hwThreads = optimalHwThreads
      gwThreads = optimalGwThreads
    } else {
      break
    }
  }

  return {
    hackThreads,
    growThreads,
    hwThreads,
    gwThreads,
    get totalThreads() {
      return this.hackThreads + this.hwThreads + this.growThreads + this.gwThreads
    },
  }
}
