import { GROW, HACK, WEAKEN } from '../lib/constants'
import { NHacking } from '../lib/types'

// calculate RAM for batch hack atack
export const getBatchRam = (ns: NS, threads: NHacking.BatchThreads): number => {
  const { weakenThreads = 0, growThreads = 0, hackThreads = 0 } = threads
  const wRam = ns.getScriptRam(WEAKEN) * weakenThreads
  const gRam = ns.getScriptRam(GROW) * growThreads
  const hRam = ns.getScriptRam(HACK) * hackThreads

  return wRam + gRam + hRam
}
