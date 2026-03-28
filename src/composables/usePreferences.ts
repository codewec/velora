import { ref, watch } from 'vue'

import { defaultDeviceNamePattern } from '@/utils/deviceNamePattern'
import { isLogLevel, type AppLogLevel } from '@/utils/logging'

const LOG_LEVEL_KEY = 'velora-preferences-log-level'
const LOG_COUNT_KEY = 'velora-preferences-log-count'
const DEVICE_NAMING_PATTERN_KEY = 'velora-device-naming-pattern'

const DEFAULT_MIN_LOG_LEVEL: AppLogLevel = 'info'
const DEFAULT_MAX_LOG_ENTRIES = 1000
const MIN_LOG_ENTRIES = 100
const MAX_LOG_ENTRIES = 10000

function readStoredLogLevel() {
  if (typeof window === 'undefined') {
    return DEFAULT_MIN_LOG_LEVEL
  }

  const value = window.localStorage.getItem(LOG_LEVEL_KEY)
  return isLogLevel(value) ? value : DEFAULT_MIN_LOG_LEVEL
}

function normalizeLogEntries(value: number) {
  return Math.min(MAX_LOG_ENTRIES, Math.max(MIN_LOG_ENTRIES, Math.round(value)))
}

function readStoredLogEntries() {
  if (typeof window === 'undefined') {
    return DEFAULT_MAX_LOG_ENTRIES
  }

  const raw = Number(window.localStorage.getItem(LOG_COUNT_KEY))
  return Number.isFinite(raw) ? normalizeLogEntries(raw) : DEFAULT_MAX_LOG_ENTRIES
}

function readStoredPattern() {
  if (typeof window === 'undefined') {
    return defaultDeviceNamePattern()
  }

  return window.localStorage.getItem(DEVICE_NAMING_PATTERN_KEY) || defaultDeviceNamePattern()
}

const minLogLevel = ref<AppLogLevel>(readStoredLogLevel())
const maxLogEntries = ref<number>(readStoredLogEntries())
const deviceNamingPattern = ref<string>(readStoredPattern())

watch(
  minLogLevel,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOG_LEVEL_KEY, value)
    }
  },
  { immediate: true },
)

watch(
  maxLogEntries,
  (value) => {
    const normalized = normalizeLogEntries(value)

    if (normalized !== value) {
      maxLogEntries.value = normalized
      return
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOG_COUNT_KEY, String(normalized))
    }
  },
  { immediate: true },
)

watch(
  deviceNamingPattern,
  (value) => {
    const normalized = value?.trim() || defaultDeviceNamePattern()

    if (normalized !== value) {
      deviceNamingPattern.value = normalized
      return
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEVICE_NAMING_PATTERN_KEY, normalized)
    }
  },
  { immediate: true },
)

export function usePreferences() {
  return {
    minLogLevel,
    maxLogEntries,
    deviceNamingPattern,
  }
}
