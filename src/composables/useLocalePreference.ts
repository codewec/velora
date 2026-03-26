import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { persistLocale, type AppLocale } from '@/i18n'

export function useLocalePreference() {
  const { locale } = useI18n()

  watch(
    locale,
    (value) => {
      persistLocale(value as AppLocale)
    },
    { immediate: true },
  )

  return {
    locale: computed({
      get: () => locale.value as AppLocale,
      set: (value) => {
        locale.value = value
      },
    }),
  }
}
