// json data
export const ANALYZE_DATA = 'hosts-list.json'
// scripts
export const MANAGER = 'manager.ts'
// executable by manager
export const HACKNET = 'hacknet.ts'
export const HARDWARE = 'hardware.ts'
export const HACKING = 'hacking.ts'
export const PREPARE_SERVER = 'prepare-server.ts'
export const SUBNET = 'subnet.ts'
// -- end of manager scripts
// simple scripts for hacking
export const HACK = 'hack.ts'
export const GROW = 'grow.ts'
export const WEAKEN = 'weaken.ts'
export const SHARE = 'share.ts'
// ANSI colors
export const ANSIcolors = {
  black: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  purple: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
  reset: '\u001b[0m',
}
// files to copy to remote servers
// todo move to config/options
export const FILES_TO_COPY = [HACK, GROW, WEAKEN, SHARE]
// home server hostname
export const HOME_SERVER = 'home'

// HACKING default values
// default weaken value
export const WEAKEN_VALUE = 0.05
// default hack security value
export const HACK_FORTIFY_VALUE = 0.02
// default grow security value
export const GROW_FORTIFY_VALUE = 2 * HACK_FORTIFY_VALUE
// default gap between scripts ms
export const HACKING_SCRIPT_GAP = 20
