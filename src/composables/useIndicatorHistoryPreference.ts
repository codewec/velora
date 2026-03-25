import { ref, watch } from 'vue'

const STORAGE_KEY = 'z2m-ui-indicator-history-enabled'

function readStoredPreference() {
  if (typeof window === 'undefined') {
    return true
  }

  const value = window.localStorage.getItem(STORAGE_KEY)
  return value == null ? true : value === 'true'
}

const enabled = ref(readStoredPreference())

watch(enabled, (value) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  }
}, { immediate: true })

export function useIndicatorHistoryPreference() {
  return {
    enabled,
  }
}
