import { ref, watch } from 'vue'

export type DevicesSortBy = 'name' | 'signal' | 'battery' | 'last_seen'

const STORAGE_KEY = 'velora-devices-sort-by'

function readStoredPreference(): DevicesSortBy {
  if (typeof window === 'undefined') {
    return 'name'
  }

  const value = window.localStorage.getItem(STORAGE_KEY)

  if (value === 'name' || value === 'signal' || value === 'battery' || value === 'last_seen') {
    return value
  }

  return 'name'
}

const sortBy = ref<DevicesSortBy>(readStoredPreference())

watch(
  sortBy,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  },
  { immediate: true },
)

export function useDevicesSortingPreference() {
  return {
    sortBy,
  }
}
