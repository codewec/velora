import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import type { InterviewSession } from '@/types/z2m'

type InterviewToastStatus = InterviewSession['status'] | 'requested'

const INTERVIEW_TOAST_DURATION_MS = 6000

function toastStatusIcon(status: InterviewToastStatus) {
  switch (status) {
    case 'requested':
      return 'i-lucide-send'
    case 'joined':
      return 'i-lucide-plug-zap'
    case 'interview_started':
      return 'i-lucide-scan-search'
    case 'successful':
      return 'i-lucide-badge-check'
    case 'failed':
      return 'i-lucide-triangle-alert'
  }
}

function toastStatusColor(status: InterviewToastStatus) {
  switch (status) {
    case 'failed':
      return 'error' as const
    case 'successful':
      return 'success' as const
    case 'requested':
    case 'joined':
    case 'interview_started':
      return 'neutral' as const
  }
}

function toastStatusDescription(
  t: ReturnType<typeof useI18n>['t'],
  status: InterviewToastStatus,
  error?: string,
) {
  switch (status) {
    case 'requested':
      return t('interview.requested')
    case 'joined':
      return t('interview.joined')
    case 'interview_started':
      return t('interview.started')
    case 'successful':
      return t('interview.completed')
    case 'failed':
      return error || t('interview.failed')
  }
}

export function useInterviewToasts() {
  const toast = useToast()
  const { t } = useI18n()
  const bridgeStore = useBridgeStore()
  const devicesStore = useDevicesStore()
  const lastStatusBySession = new Map<string, InterviewToastStatus>()
  let initialized = false

  const interviewState = computed(() => {
    const connectionIds = new Set([
      ...Object.keys(bridgeStore.pendingInterviewRequestsByConnection),
      ...Object.keys(bridgeStore.activeSessionsByConnection),
      ...Object.keys(bridgeStore.completedSessionsByConnection),
    ])

    return [...connectionIds].sort().map((connectionId) => ({
      connectionId,
      pending: Object.values(bridgeStore.pendingInterviewRequests(connectionId)),
      active: bridgeStore.activeSessions(connectionId),
      completed: bridgeStore.completedSessions(connectionId),
    }))
  })

  function sessionKey(connectionId: string, ieeeAddress: string) {
    return `${connectionId}:${ieeeAddress}`
  }

  function interviewDeviceLabel(connectionId: string, ieeeAddress: string, fallbackName: string) {
    const device = devicesStore
      .devicesFor(connectionId)
      .find((entry) => entry.ieee_address === ieeeAddress)

    if (!device) {
      return fallbackName
    }

    return device.description || device.friendly_name
  }

  function addInterviewToast(
    connectionId: string,
    ieeeAddress: string,
    fallbackName: string,
    status: InterviewToastStatus,
    error?: string,
  ) {
    toast.add({
      title: interviewDeviceLabel(connectionId, ieeeAddress, fallbackName),
      description: toastStatusDescription(t, status, error),
      icon: toastStatusIcon(status),
      color: toastStatusColor(status),
      duration: INTERVIEW_TOAST_DURATION_MS,
      progress: true,
      close: true,
    })
  }

  watch(
    interviewState,
    (connections) => {
      for (const connection of connections) {
        for (const pending of connection.pending) {
          const key = sessionKey(connection.connectionId, pending.ieeeAddress)

          if (!initialized) {
            lastStatusBySession.set(key, 'requested')
            continue
          }

          if (lastStatusBySession.get(key) === 'requested') {
            continue
          }

          lastStatusBySession.set(key, 'requested')
          addInterviewToast(
            connection.connectionId,
            pending.ieeeAddress,
            pending.friendlyName,
            'requested',
          )
        }

        for (const active of connection.active) {
          const key = sessionKey(connection.connectionId, active.ieeeAddress)

          if (!initialized) {
            lastStatusBySession.set(key, active.status)
            continue
          }

          if (lastStatusBySession.get(key) === active.status) {
            continue
          }

          lastStatusBySession.set(key, active.status)
          addInterviewToast(
            connection.connectionId,
            active.ieeeAddress,
            active.friendlyName,
            active.status,
            active.error,
          )
        }

        for (const completed of connection.completed) {
          const key = sessionKey(connection.connectionId, completed.ieeeAddress)

          if (!initialized) {
            lastStatusBySession.set(key, completed.status)
            continue
          }

          if (lastStatusBySession.get(key) === completed.status) {
            continue
          }

          lastStatusBySession.set(key, completed.status)
          addInterviewToast(
            connection.connectionId,
            completed.ieeeAddress,
            completed.friendlyName,
            completed.status,
            completed.error,
          )
        }
      }

      initialized = true
    },
    { deep: true, immediate: true },
  )
}
