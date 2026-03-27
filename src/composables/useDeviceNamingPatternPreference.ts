import { ref, watch } from 'vue'

import { defaultDeviceNamePattern } from '@/utils/deviceNamePattern'

const STORAGE_KEY = 'velora-device-naming-pattern'

function readStoredPattern() {
  if (typeof window === 'undefined') {
    return defaultDeviceNamePattern()
  }

  return window.localStorage.getItem(STORAGE_KEY) || defaultDeviceNamePattern()
}

const pattern = ref(readStoredPattern())

watch(
  pattern,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value || defaultDeviceNamePattern())
    }
  },
  { immediate: true },
)

export function useDeviceNamingPatternPreference() {
  return {
    pattern,
  }
}
