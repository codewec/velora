import type { DeviceStateValue, Expose } from '@/types/z2m'
import { isBinaryExpose, isNumericExpose } from '@/types/z2m'

export const MAX_TRAIL_TEXT_LENGTH = 56

export interface ValueTrailEntry {
  id: string
  text: string
  className: string
}

export function formatFeatureValue(expose: Expose, value: DeviceStateValue | undefined) {
  if (value == null) {
    return 'n/a'
  }

  if (isBinaryExpose(expose)) {
    if (value === expose.value_on) {
      return 'On'
    }

    if (value === expose.value_off) {
      return 'Off'
    }
  }

  if (isNumericExpose(expose) && typeof value === 'number') {
    return `${value}${expose.unit || ''}`
  }

  if (typeof value === 'boolean') {
    return value ? 'True' : 'False'
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return String(value)
  }

  return JSON.stringify(value)
}

export function buildValueTrail(
  currentValue: string,
  historyValues: Array<{ changedAt: number, value: DeviceStateValue }>,
  expose: Expose,
) {
  const collected: Array<{ changedAt: number, text: string }> = []
  let totalLength = currentValue.length

  // We cap the visual trail by the final rendered text length instead of
  // "number of values". This keeps short numeric sequences and long action
  // names balanced inside the same card width.
  for (const entry of historyValues) {
    const text = formatFeatureValue(expose, entry.value)
    const nextLength = totalLength + text.length + 1

    if (collected.length > 0 && nextLength > MAX_TRAIL_TEXT_LENGTH) {
      break
    }

    collected.push({ changedAt: entry.changedAt, text })
    totalLength = nextLength
  }

  // Newest values live on the right edge. Reversing the collected history lets
  // us render the visual trail from oldest -> newest -> current in a single
  // flex row, which naturally avoids overlap for values with different widths.
  const previous = collected.reverse().map((entry, index) => ({
    id: `${entry.changedAt}:${index}`,
    text: entry.text,
    className: 'text-slate-400/80 dark:text-slate-700/80',
  }))

  return [
    ...previous,
    {
      id: 'current',
      text: currentValue,
      className: 'text-slate-800 dark:text-slate-100',
    },
  ] satisfies ValueTrailEntry[]
}
