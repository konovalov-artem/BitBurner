import { ANSIcolors } from '../lib/constants'

// convert array to object by key
export const keyBy = <T = Record<string, any>>(array: Array<T>, key: keyof T) => {
  const result: Record<string, T> = {}

  for (const item of array) {
    const keyValue = item[key] as string
    result[keyValue] = item
  }

  return result
}

export const getProgressBar = (repeat: number, color?: keyof typeof ANSIcolors): string => {
  return colorize(`${Math.round(repeat * 10)}% ${'▓'.repeat(repeat)}${'░'.repeat(10 - repeat)}`, color)
}
// colorize string with ANSI colors
export const colorize = (str: string, colorKey?: keyof typeof ANSIcolors): string => {
  const color = colorKey ? ANSIcolors[colorKey] : null
  return color ? `${color}${str}${ANSIcolors.reset}` : str
}
