import { AnalyzedServer } from '../lib/types'

export const countRunningScripts = (ns: NS, servers: AnalyzedServer[] = []): number => {
  let totalCount = 0
  for (const server of servers) {
    const processList = ns.ps(server.hostname)

    totalCount += processList.length
  }

  return totalCount
}
