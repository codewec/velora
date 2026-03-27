import { ref, watch } from 'vue'

export type DevicesViewMode = 'cards' | 'table'

const STORAGE_KEY = 'velora-devices-view-mode'

function readStoredPreference(): DevicesViewMode {
  if (typeof window === 'undefined') {
    return 'cards'
  }

  const value = window.localStorage.getItem(STORAGE_KEY)
  return value === 'table' ? 'table' : 'cards'
}

const viewMode = ref<DevicesViewMode>(readStoredPreference())

watch(
  viewMode,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value)
    }
  },
  { immediate: true },
)

export function useDevicesViewPreference() {
  return {
    viewMode,
  }
}
