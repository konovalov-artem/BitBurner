import { Hacknet } from '../lib/types'

function estimateProduction(level: number, ram: number, cores: number): number {
  const base = 1.5
  const ramMult = Math.pow(1.035, Math.log2(ram))
  const coreMult = 1 + (cores - 1) / 5
  return base * level * ramMult * coreMult
}

let totalProduction = 0

const getUpgradeOption = (ns: NS): Hacknet.UpgradeOption => {
  let bestOption: Hacknet.UpgradeOption
  const numNodes = ns.hacknet.numNodes()
  totalProduction = 0

  for (let i = 0; i < numNodes; i++) {
    const stats = ns.hacknet.getNodeStats(i)
    const currentProduction = estimateProduction(stats.level, stats.ram, stats.cores)
    totalProduction += stats.production

    // Upgrade Level
    const levelCost = ns.hacknet.getLevelUpgradeCost(i, 1)
    const newLevelProduction = estimateProduction(stats.level + 1, stats.ram, stats.cores)
    const lvlRoi = (newLevelProduction - currentProduction) / levelCost
    if (levelCost < Infinity && lvlRoi > bestOption?.roi) {
      bestOption = {
        type: 'level',
        id: i,
        cost: levelCost,
        roi: lvlRoi,
        func() {
          ns.hacknet.upgradeLevel(this.id)
        },
      }
    }

    // Upgrade Cpu
    const cpuCost = ns.hacknet.getCoreUpgradeCost(i, 1)
    const newCpuProduction = estimateProduction(stats.level, stats.ram, stats.cores + 1)
    const cpuRoi = (newCpuProduction - currentProduction) / cpuCost
    if (cpuCost < Infinity && cpuRoi > bestOption?.roi) {
      bestOption = {
        type: 'cpu',
        id: i,
        cost: cpuCost,
        roi: cpuRoi,
        func() {
          ns.hacknet.upgradeCore(this.id)
        },
      }
    }

    // Upgrade RAM
    const ramCost = ns.hacknet.getRamUpgradeCost(i, 1)
    const newRamProduction = estimateProduction(stats.level, stats.ram * 2, stats.cores)
    const ramRoi = (newRamProduction - currentProduction) / ramCost
    if (ramCost < Infinity && ramRoi > bestOption?.roi) {
      bestOption = {
        type: 'ram',
        id: i,
        cost: ramCost,
        roi: ramRoi,
        func() {
          ns.hacknet.upgradeRam(this.id)
        },
      }
    }
  }

  // Purchase new node
  const nodeCost = ns.hacknet.getPurchaseNodeCost()
  const newNodeProduction = estimateProduction(1, 1, 1) // New node starts at level 1, 1GB RAM, 1 core
  const nodeRoi = newNodeProduction / nodeCost
  if (!bestOption || nodeRoi > bestOption.roi) {
    bestOption = {
      type: 'node',
      cost: nodeCost,
      roi: nodeRoi,
      func() {
        ns.hacknet.purchaseNode()
      },
    }
  }

  return bestOption
}

const waitForMoney = async (ns: NS, cost: number) => {
  const player = ns.getPlayer()
  if (player.money < cost) {
    if (totalProduction === 0) {
      ns.print(`⏳ Waiting: Not enough money. Sleeping 10s...`)
      return ns.asleep(10_000)
    }
    const seconds = 1 + Math.floor(cost / (totalProduction / 2))
    ns.print(`⏳ Waiting for funds. Sleeping ${seconds}s...`)
    await ns.asleep(seconds * 1000)
  }
}

const logUpgrade = (ns: NS, best: Hacknet.UpgradeOption) => {
  const label = best.type === 'node' ? `📦 Purchase node` : `🛠 Upgrade ${best.type} on node #${best.id}`
  const log = `${label} | 💵 Cost: $${best.cost.toFixed(0)} | 📈 Gain: ${best.gain.toFixed(2)} | 📊 ROI: ${best.roi.toFixed(5)}`
  ns.print(log)
}

const upgradeHacknet = async (ns: NS) => {
  const bestUpgrade = getUpgradeOption(ns)
  if (!bestUpgrade) {
    ns.print('⚠️ No upgrade options available.')
    return
  }

  logUpgrade(ns, bestUpgrade)
  await waitForMoney(ns, bestUpgrade.cost)

  bestUpgrade.func()
  ns.print(`✅ Upgrade completed: ${bestUpgrade.type} on node #${bestUpgrade.id || 'new node'}!`)
  ns.print(`Current total production: ${ns.formatNumber(totalProduction)} per second.`)
}

export async function main(ns: NS) {
  ns.disableLog('ALL')

  while (true) {
    await upgradeHacknet(ns)
    await ns.sleep(200)
  }
}
