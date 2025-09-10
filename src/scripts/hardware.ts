import { ANALYZE_DATA, FILES_TO_COPY, HOME_SERVER } from '../lib/constants'

// 1.6 + 0.5 + 1.05 + 0.05
export const main = async (ns: NS) => {
  const player = ns.getPlayer()
  // 10% of total money
  const moneyToSpend = player.money * 0.1
  const purchasedServers = ns.getPurchasedServers()
  const serversLimit = ns.getPurchasedServerLimit()

  // remove file if soft reset
  if (!purchasedServers.length) ns.rm(ANALYZE_DATA)

  if (serversLimit > purchasedServers.length) {
    const maxToBuy = serversLimit - purchasedServers.length
    const newServerRam = 8

    let moneyLeft = ns.args[0] as number
    let newServerCost = ns.getPurchasedServerCost(newServerRam)
    let idx = purchasedServers.length + 1

    while (maxToBuy > idx) {
      if (moneyLeft < newServerCost) ns.purchaseServer(`server-${idx}`, newServerRam)
      moneyLeft -= newServerCost
      newServerCost = ns.getPurchasedServerCost(newServerRam)
      idx++
    }
  } else if (purchasedServers.length) {
    let serverToUpgrade: Server | undefined
    const maxRam = ns.getPurchasedServerMaxRam()
    for (const hostname of purchasedServers) {
      const server = ns.getServer(hostname)
      if (server.maxRam == maxRam) continue
      if (!serverToUpgrade) serverToUpgrade = server
      if (serverToUpgrade.maxRam > server.maxRam) serverToUpgrade = server
    }

    if (serverToUpgrade) {
      let upgradeRamTo = Math.pow(2, Math.log2(serverToUpgrade.maxRam) + 1)
      let moneyLeft = moneyToSpend
      let upgradeCost = ns.getPurchasedServerUpgradeCost(serverToUpgrade.hostname, upgradeRamTo)
      while (moneyLeft >= upgradeCost && upgradeRamTo < maxRam) {
        ns.upgradePurchasedServer(serverToUpgrade.hostname, upgradeRamTo)
        moneyLeft -= upgradeCost
        upgradeCost = ns.getPurchasedServerUpgradeCost(serverToUpgrade.hostname, upgradeRamTo)
        upgradeRamTo = Math.pow(2, Math.log2(upgradeRamTo) + 1)
      }
    }
  }
  if (purchasedServers.length) {
    const serverList = []
    for (const hostname of purchasedServers) {
      serverList.push(ns.getServer(hostname))
      ns.scp(FILES_TO_COPY, hostname, HOME_SERVER)
    }
  }
}
