import { ref } from 'vue'
import { defineStore } from 'pinia'
import { formatBrowserTime } from '@/utils/dateTime'

export type LogLevel = 'info' | 'warning' | 'error' | 'debug'
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

const MAX_LOGS = 1000

export const useLogsStore = defineStore('logs', () => {
  const entries = ref<Record<string, LogEntry[]>>({})

  function logsFor(connectionId: string) {
    return entries.value[connectionId] ?? []
  }

  function addLog(
    connectionId: string,
    entry: Omit<LogEntry, 'id' | 'connectionId' | 'timestamp' | 'time'>,
  ) {
    const next: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      connectionId,
      timestamp: formatBrowserTime(Date.now()),
      time: Date.now(),
      ...entry,
    }

    entries.value = {
      ...entries.value,
      [connectionId]: [next, ...logsFor(connectionId)].slice(0, MAX_LOGS),
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
