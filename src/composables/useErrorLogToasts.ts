import { watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLogDetailsStore } from '@/stores/logDetails'
import { useLogsStore } from '@/stores/logs'
import { parseBridgeLoggingPayload } from '@/utils/logPresentation'

function truncateText(value: string, maxLength = 200) {
  const normalized = value.replaceAll(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function useErrorLogToasts() {
  const toast = useToast()
  const { t } = useI18n()
  const logsStore = useLogsStore()
  const logDetailsStore = useLogDetailsStore()
  const ERROR_TOAST_DURATION_MS = 10000
  const seenIds = new Set<string>()
  let initialized = false

  watch(
    () => logsStore.entries,
    (entriesByConnection) => {
      for (const entries of Object.values(entriesByConnection)) {
        for (const entry of entries) {
          if (!initialized) {
            seenIds.add(entry.id)
            continue
          }

          if (seenIds.has(entry.id)) {
            continue
          }

          seenIds.add(entry.id)

          if (entry.level !== 'error') {
            continue
          }

          const bridgeLoggingPayload = parseBridgeLoggingPayload(entry.raw)
          const description = truncateText(
            bridgeLoggingPayload?.deviceName
              ? bridgeLoggingPayload.shortReason
                ? `${t('logsPage.deviceErrorSource', { device: bridgeLoggingPayload.deviceName })} · ${bridgeLoggingPayload.shortReason}`
                : t('logsPage.deviceErrorSource', { device: bridgeLoggingPayload.deviceName })
              : bridgeLoggingPayload?.shortReason || bridgeLoggingPayload?.message || entry.summary,
          )

          toast.add({
            id: `log-error:${entry.id}`,
            title: t('logsPage.errorToastTitle'),
            description,
            icon: 'i-lucide-triangle-alert',
            color: 'error',
            duration: ERROR_TOAST_DURATION_MS,
            progress: true,
            close: true,
            actions: [
              {
                label: t('logsPage.details'),
                color: 'neutral',
                variant: 'outline',
                onClick: () => {
                  logDetailsStore.open(entry)
                },
              },
            ],
          })
        }
      }

      initialized = true
    },
    { deep: true, immediate: true },
  )
}
