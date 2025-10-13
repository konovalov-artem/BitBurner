import { ToastVariant } from '../lib/constants'
import { ScriptLib } from '../lib/script-lib'
import { NHacknet } from '../lib/types'

class Hacknet extends ScriptLib {
  totalProduction = 0
  constructor(
    readonly ns: NS,
    inputPort: number,
    outputPort: number,
  ) {
    super(ns, { inputPort, outputPort })
  }

  start() {
    this.ns.toast('Hacknet running', ToastVariant.INFO, 3000)
    // buy option
    const bestOption = this.readDataFromManager().hacknet.bestOption
    if (bestOption) this.buyUpgrade(bestOption)

    // find new option
    const bestUpgrade = this.getUpgradeOption()

    let waitMs = 0
    if (bestUpgrade) waitMs = this.waitForMoney(bestUpgrade.cost)
    this.sendDataToManager({
      hacknet: {
        bestOption: bestUpgrade,
        waitTill: Date.now() + waitMs,
        totalProduction: this.totalProduction,
      },
    })

    this.ns.toast('Hacknet completed', ToastVariant.SUCCESS, 3000)

    return true
  }

  buyUpgrade(option: NHacknet.UpgradeOption) {
    if (option.cost > this.ns.getPlayer().money) {
      return false
    }
    this.toast(`✅ Upgrade completed: ${option.type} on node #${option.id || 'new node'}!`, ToastVariant.SUCCESS, 3000)
    switch (option.type) {
      case 'level':
        return this.ns.hacknet.upgradeLevel(option.id)
      case 'ram':
        return this.ns.hacknet.upgradeRam(option.id)
      case 'cpu':
        return this.ns.hacknet.upgradeCore(option.id)
      case 'node':
        return this.ns.hacknet.purchaseNode()
      default:
        return false
    }
  }

  getUpgradeOption(): NHacknet.UpgradeOption | null {
    let bestOption: NHacknet.UpgradeOption = null
    const numNodes = this.ns.hacknet.numNodes()
    this.totalProduction = 0

    for (let i = 0; i < numNodes; i++) {
      const stats = this.ns.hacknet.getNodeStats(i)
      const currentProduction = this.estimateProduction(stats.level, stats.ram, stats.cores)
      this.totalProduction += stats.production

      // Upgrade Level
      const levelCost = this.ns.hacknet.getLevelUpgradeCost(i, 1)
      const newLevelProduction = this.estimateProduction(stats.level + 1, stats.ram, stats.cores)
      const lvlRoi = (newLevelProduction - currentProduction) / levelCost
      if (levelCost < Infinity && lvlRoi > bestOption?.roi) {
        bestOption = {
          type: 'level',
          id: i,
          cost: levelCost,
          roi: lvlRoi,
        }
      }

      // Upgrade Cpu
      const cpuCost = this.ns.hacknet.getCoreUpgradeCost(i, 1)
      const newCpuProduction = this.estimateProduction(stats.level, stats.ram, stats.cores + 1)
      const cpuRoi = (newCpuProduction - currentProduction) / cpuCost
      if (cpuCost < Infinity && cpuRoi > bestOption?.roi) {
        bestOption = {
          type: 'cpu',
          id: i,
          cost: cpuCost,
          roi: cpuRoi,
        }
      }

      // Upgrade RAM
      const ramCost = this.ns.hacknet.getRamUpgradeCost(i, 1)
      const newRamProduction = this.estimateProduction(stats.level, stats.ram * 2, stats.cores)
      const ramRoi = (newRamProduction - currentProduction) / ramCost
      if (ramCost < Infinity && ramRoi > bestOption?.roi) {
        bestOption = {
          type: 'ram',
          id: i,
          cost: ramCost,
          roi: ramRoi,
        }
      }
    }

    // Purchase new node
    const nodeCost = this.ns.hacknet.getPurchaseNodeCost()
    const newNodeProduction = this.estimateProduction(1, 1, 1) // New node starts at level 1, 1GB RAM, 1 core
    const nodeRoi = newNodeProduction / nodeCost
    if (!bestOption || nodeRoi > bestOption.roi) {
      bestOption = {
        type: 'node',
        cost: nodeCost,
        roi: nodeRoi,
      }
    }

    return bestOption
  }

  estimateProduction(level: number, ram: number, cores: number): number {
    const base = 1.5
    const ramMult = Math.pow(1.035, Math.log2(ram))
    const coreMult = 1 + (cores - 1) / 5
    return base * level * ramMult * coreMult
  }

  waitForMoney(cost: number): number {
    const player = this.ns.getPlayer()

    if (this.totalProduction === 0) {
      if (player.money < cost) {
        return 10000
      }
    }
    return (1 + Math.floor(cost / (this.totalProduction / 1.5))) * 1000
  }
}

export const main = (ns: NS) => {
  const [inputPort, outputPort] = ns.args as number[]
  const subnet = new Hacknet(ns, inputPort, outputPort)
  subnet.start()
}
