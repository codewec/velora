import { usePreferences } from '@/composables/usePreferences'

export function useDeviceNamingPatternPreference() {
  const { deviceNamingPattern } = usePreferences()

  return {
    pattern: deviceNamingPattern,
  }
}
