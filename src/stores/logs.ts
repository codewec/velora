import { ref } from 'vue'
import { defineStore } from 'pinia'
import { usePreferences } from '@/composables/usePreferences'
import { formatBrowserTime } from '@/utils/dateTime'
import { meetsMinimumLogLevel, type AppLogLevel } from '@/utils/logging'

export type LogLevel = AppLogLevel
export type LogKind = 'transport' | 'tx' | 'rx' | 'bridge' | 'device' | 'event'

export interface LogEntry {
  id: string
  connectionId: string
  timestamp: string
  time: number
  level: LogLevel
  kind: LogKind
  summary: string
  raw: string
}

export const useLogsStore = defineStore('logs', () => {
  const entries = ref<Record<string, LogEntry[]>>({})
  const { minLogLevel, maxLogEntries } = usePreferences()

  function logsFor(connectionId: string) {
    return (entries.value[connectionId] ?? [])
      .filter((entry) => meetsMinimumLogLevel(entry.level, minLogLevel.value))
      .slice(0, maxLogEntries.value)
  }

  function addLog(
    connectionId: string,
    entry: Omit<LogEntry, 'id' | 'connectionId' | 'timestamp' | 'time'>,
  ) {
    if (!meetsMinimumLogLevel(entry.level, minLogLevel.value)) {
      return
    }

    const next: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      connectionId,
      timestamp: formatBrowserTime(Date.now()),
      time: Date.now(),
      ...entry,
    }

    entries.value = {
      ...entries.value,
      [connectionId]: [next, ...(entries.value[connectionId] ?? [])].slice(0, maxLogEntries.value),
    }
  }

  function clear(connectionId: string) {
    entries.value = {
      ...entries.value,
      [connectionId]: [],
    }
  }

  return {
    entries,
    logsFor,
    addLog,
    clear,
  }
})
