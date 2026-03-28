import { ref, watch } from 'vue'

const PRIMARY_KEY = 'velora-ui-primary'
const NEUTRAL_KEY = 'velora-ui-neutral'
const DEFAULT_PRIMARY = 'green'
const DEFAULT_NEUTRAL = 'zinc'

function readStoredColor(key: string, fallback: string) {
  if (typeof window === 'undefined') {
    return fallback
  }

  return window.localStorage.getItem(key) || fallback
}

const primary = ref(readStoredColor(PRIMARY_KEY, DEFAULT_PRIMARY))
const neutral = ref(readStoredColor(NEUTRAL_KEY, DEFAULT_NEUTRAL))

export function useUiColorPreferences() {
  const appConfig = useAppConfig()

  watch(
    primary,
    (value) => {
      appConfig.ui.colors.primary = value

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(PRIMARY_KEY, value)
      }
    },
    { immediate: true },
  )

  watch(
    neutral,
    (value) => {
      appConfig.ui.colors.neutral = value

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NEUTRAL_KEY, value)
      }
    },
    { immediate: true },
  )

  return {
    primary,
    neutral,
  }
}
