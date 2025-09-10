import { WEAKEN_VALUE } from '../lib/constants'

// todo add bitNodeMultiplier
export const getWeakenValue = (ns: NS, threds: number, cpuCores: number = 1) => {
  const bitNodeMultiplier: number = 1
  const cpuBonus = 1 + (cpuCores - 1) / 16
  return threds * cpuBonus * bitNodeMultiplier * WEAKEN_VALUE
}
