import { ref, watch } from 'vue'

export type DevicesGroupBy = 'none' | 'room' | 'function' | 'type' | 'power' | 'vendor'

const STORAGE_KEY = 'velora-devices-group-by'

function readStoredPreference(): DevicesGroupBy {
  if (typeof window === 'undefined') {
    return 'none'
  }

  const value = window.localStorage.getItem(STORAGE_KEY)

  if (
    value === 'none' ||
    value === 'room' ||
    value === 'function' ||
    value === 'type' ||
    value === 'power' ||
    value === 'vendor'
  ) {
    return value
  }

  return 'none'
}

const groupBy = ref<DevicesGroupBy>(readStoredPreference())

watch(
  groupBy,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  },
  { immediate: true },
)

export function useDevicesGroupingPreference() {
  return {
    groupBy,
  }
}
