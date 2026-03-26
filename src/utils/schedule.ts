const SCHEDULE_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type ScheduleDay = (typeof SCHEDULE_DAYS)[number]

export interface ScheduleEntry {
  time: string
  temperature: number | null
}

export interface DaySchedule {
  day: ScheduleDay
  key: `schedule_${ScheduleDay}`
  value: string
  entries: ScheduleEntry[]
}

export interface ScheduleSegment {
  startMinutes: number
  endMinutes: number
  widthPercent: number
  offsetPercent: number
  time: string
  temperature: number | null
}

export function sortScheduleEntries(entries: ScheduleEntry[]) {
  return [...entries].sort((left, right) => left.time.localeCompare(right.time))
}

export function isScheduleKey(value: string) {
  return /^schedule_(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i.test(value)
}

export function parseScheduleValue(value: string): ScheduleEntry[] {
  return value
    .split(/\s+/)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [time, temperature] = chunk.split('/')

      return {
        time: time || '--:--',
        temperature: typeof temperature === 'string' && temperature.length > 0
          ? Number.parseFloat(temperature)
          : null,
      }
    })
}

export function scheduleDaysFromState(state: Record<string, unknown>): DaySchedule[] {
  return SCHEDULE_DAYS.flatMap((day) => {
    const key = `schedule_${day}` as const
    const raw = state[key]

    if (typeof raw !== 'string' || !raw.trim()) {
      return []
    }

    return [{
      day,
      key,
      value: raw,
      entries: parseScheduleValue(raw),
    }]
  })
}

export function scheduleEditorDaysFromState(state: Record<string, unknown>): DaySchedule[] {
  return SCHEDULE_DAYS.map((day) => {
    const key = `schedule_${day}` as const
    const raw = typeof state[key] === 'string' ? state[key] : ''

    return {
      day,
      key,
      value: raw,
      entries: raw.trim() ? sortScheduleEntries(parseScheduleValue(raw)) : [],
    }
  })
}

export function serializeScheduleValue(entries: ScheduleEntry[]) {
  return sortScheduleEntries(entries)
    .filter(entry => entry.time.trim())
    .map((entry) => {
      const temperature = entry.temperature == null || Number.isNaN(entry.temperature)
        ? ''
        : entry.temperature.toFixed(1)

      return `${entry.time}/${temperature}`
    })
    .filter(value => !value.endsWith('/'))
    .join(' ')
}

export function timeToMinutes(value: string) {
  const parts = value.split(':')
  const hours = Number.parseInt(parts[0] ?? '', 10)
  const minutes = Number.parseInt(parts[1] ?? '', 10)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0
  }

  return Math.min(24 * 60, Math.max(0, hours * 60 + minutes))
}

export function buildScheduleSegments(entries: ScheduleEntry[]): ScheduleSegment[] {
  const sorted = sortScheduleEntries(entries)

  if (!sorted.length) {
    return []
  }

  const firstEntry = sorted[0]
  const lastEntry = sorted[sorted.length - 1]
  const firstStartMinutes = timeToMinutes(firstEntry?.time ?? '00:00')
  const segments: ScheduleSegment[] = []

  if (firstStartMinutes > 0 && lastEntry) {
    segments.push({
      startMinutes: 0,
      endMinutes: firstStartMinutes,
      widthPercent: (firstStartMinutes / (24 * 60)) * 100,
      offsetPercent: 0,
      time: lastEntry.time,
      temperature: lastEntry.temperature,
    })
  }

  sorted.forEach((entry, index) => {
    const startMinutes = timeToMinutes(entry.time)
    const nextEntry = sorted[index + 1]
    const endMinutes = nextEntry ? timeToMinutes(nextEntry.time) : 24 * 60
    const safeEndMinutes = Math.max(startMinutes + 1, endMinutes)
    const durationMinutes = safeEndMinutes - startMinutes

    segments.push({
      startMinutes,
      endMinutes: safeEndMinutes,
      widthPercent: (durationMinutes / (24 * 60)) * 100,
      offsetPercent: (startMinutes / (24 * 60)) * 100,
      time: entry.time,
      temperature: entry.temperature,
    })
  })

  return segments
}
