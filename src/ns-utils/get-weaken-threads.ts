import { WEAKEN_VALUE } from '../lib/constants'

// todo add bitNodeMultiplier
export const getWeakenThreads = (ns: NS, securityValue: number, cpuCores: number = 1): number => {
  const bitNodeMultiplier: number = 1
  const coreBonus = 1 + (cpuCores - 1) / 16
  const weakenStrength = WEAKEN_VALUE * coreBonus * bitNodeMultiplier
  return Math.ceil(securityValue / weakenStrength)
}
