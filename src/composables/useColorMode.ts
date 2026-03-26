import { computed, onMounted, ref, watch } from 'vue'

type ColorModePreference = 'light' | 'dark' | 'system'
type ColorModeValue = 'light' | 'dark'

const STORAGE_KEY = 'nuxt-color-mode'

function readStoredPreference(): ColorModePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const value = window.localStorage.getItem(STORAGE_KEY)

  if (value === 'light' || value === 'dark' || value === 'system') {
    return value
  }

  return 'system'
}

function systemMode(): ColorModeValue {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const preference = ref<ColorModePreference>(readStoredPreference())

function applyMode(value: ColorModeValue) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.classList.toggle('dark', value === 'dark')
}

if (typeof window !== 'undefined') {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    if (preference.value === 'system') {
      applyMode(systemMode())
    }
  })
}

watch(
  preference,
  (value) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, value)
    }

    applyMode(value === 'system' ? systemMode() : value)
  },
  { immediate: true },
)

export function useColorMode() {
  const state = computed<ColorModeValue>({
    get() {
      return preference.value === 'system' ? systemMode() : preference.value
    },
    set(next) {
      preference.value = next
    },
  })

  onMounted(() => {
    applyMode(state.value)
  })

  return {
    forced: false,
    get preference() {
      return preference.value
    },
    set preference(next: ColorModePreference) {
      preference.value = next
    },
    get value() {
      return state.value
    },
    set value(next: ColorModeValue) {
      state.value = next
    },
  }
}
