import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { useZ2M } from '@/composables/useZ2M'
import type {
  BridgeEvent,
  BridgeHealth,
  BridgeInfo,
  BridgePermitJoinResponse,
  DeviceStateValue,
  InterviewSession,
} from '@/types/z2m'

function upsertSession(
  sessions: InterviewSession[],
  next: InterviewSession,
): InterviewSession[] {
  const index = sessions.findIndex((session) => session.ieeeAddress === next.ieeeAddress)

  if (index === -1) {
    return [next, ...sessions]
  }

  const updated = [...sessions]
  updated[index] = { ...updated[index], ...next }
  return updated
}

function normalizeInterviewStatus(status: unknown): InterviewSession['status'] {
  if (status === 'started') {
    return 'interview_started'
  }

  if (
    status === 'joined' ||
    status === 'interview_started' ||
    status === 'successful' ||
    status === 'failed'
  ) {
    return status
  }

  return 'joined'
}

export const useBridgeStore = defineStore('bridge', () => {
  const infoByConnection = ref<Record<string, BridgeInfo | null>>({})
  const healthByConnection = ref<Record<string, BridgeHealth | null>>({})
  const permitJoinByConnection = ref<Record<string, boolean>>({})
  const permitJoinTimeoutByConnection = ref<Record<string, number>>({})
  const permitJoinTargetByConnection = ref<Record<string, string>>({})
  const activeSessionsByConnection = ref<Record<string, InterviewSession[]>>({})
  const completedSessionsByConnection = ref<Record<string, InterviewSession[]>>({})

  const totalActiveSessions = computed(() =>
    Object.values(activeSessionsByConnection.value).reduce((count, sessions) => count + sessions.length, 0),
  )

  function infoFor(connectionId: string) {
    return infoByConnection.value[connectionId] ?? null
  }

  function permitJoin(connectionId: string) {
    return permitJoinByConnection.value[connectionId] ?? false
  }

  function healthFor(connectionId: string) {
    return healthByConnection.value[connectionId] ?? null
  }

  function permitJoinTimeout(connectionId: string) {
    return permitJoinTimeoutByConnection.value[connectionId] ?? 0
  }

  function permitJoinTarget(connectionId: string) {
    return permitJoinTargetByConnection.value[connectionId] ?? 'all'
  }

  function activeSessions(connectionId: string) {
    return activeSessionsByConnection.value[connectionId] ?? []
  }

  function completedSessions(connectionId: string) {
    return completedSessionsByConnection.value[connectionId] ?? []
  }

  function lastCompletedSessions(connectionId: string) {
    return completedSessions(connectionId).slice(0, 3)
  }

  function syncPermitJoinFromInfo(connectionId: string, nextInfo: BridgeInfo) {
    permitJoinByConnection.value = {
      ...permitJoinByConnection.value,
      [connectionId]: Boolean(nextInfo.permit_join),
    }

    if (!nextInfo.permit_join_end) {
      permitJoinTimeoutByConnection.value = {
        ...permitJoinTimeoutByConnection.value,
        [connectionId]: 0,
      }
      return
    }

    const permitJoinEnd = nextInfo.permit_join_end
    const currentEpochSeconds = Math.floor(Date.now() / 1000)
    const currentEpochMilliseconds = Date.now()
    const seconds = permitJoinEnd > 10_000_000_000
      ? Math.max(0, Math.ceil((permitJoinEnd - currentEpochMilliseconds) / 1000))
      : Math.max(0, permitJoinEnd - currentEpochSeconds)

    permitJoinTimeoutByConnection.value = {
      ...permitJoinTimeoutByConnection.value,
      [connectionId]: seconds,
    }
  }

  function setBridgeInfo(connectionId: string, nextInfo: BridgeInfo) {
    infoByConnection.value = {
      ...infoByConnection.value,
      [connectionId]: nextInfo,
    }
    syncPermitJoinFromInfo(connectionId, nextInfo)
  }

  function setBridgeHealth(connectionId: string, nextHealth: BridgeHealth) {
    healthByConnection.value = {
      ...healthByConnection.value,
      [connectionId]: nextHealth,
    }
  }

  function syncPermitJoinResponse(connectionId: string, response: BridgePermitJoinResponse) {
    if (typeof response.data?.time === 'number') {
      permitJoinTimeoutByConnection.value = {
        ...permitJoinTimeoutByConnection.value,
        [connectionId]: response.data.time,
      }

      permitJoinByConnection.value = {
        ...permitJoinByConnection.value,
        [connectionId]: response.data.time > 0,
      }
    }

    if (typeof response.data?.device === 'string' && response.data.device) {
      permitJoinTargetByConnection.value = {
        ...permitJoinTargetByConnection.value,
        [connectionId]: response.data.device,
      }
      return
    }

    permitJoinTargetByConnection.value = {
      ...permitJoinTargetByConnection.value,
      [connectionId]: 'all',
    }
  }

  function handleEvent(connectionId: string, event: BridgeEvent) {
    if (typeof event.data?.ieee_address !== 'string') {
      return
    }

    const status = event.type === 'device_joined'
      ? 'joined'
      : normalizeInterviewStatus('status' in event.data ? event.data.status : undefined)
    const friendlyName =
      typeof event.data.friendly_name === 'string'
        ? event.data.friendly_name
        : event.data.ieee_address
    const error = typeof event.data.error === 'string' ? event.data.error : undefined
    const session: InterviewSession = {
      ieeeAddress: event.data.ieee_address,
      friendlyName,
      status,
      startedAt: Date.now(),
      error,
      finishedAt: status === 'successful' || status === 'failed' ? Date.now() : undefined,
    }

    if (status === 'successful' || status === 'failed') {
      activeSessionsByConnection.value = {
        ...activeSessionsByConnection.value,
        [connectionId]: activeSessions(connectionId).filter(
        (item) => item.ieeeAddress !== session.ieeeAddress,
        ),
      }
      completedSessionsByConnection.value = {
        ...completedSessionsByConnection.value,
        [connectionId]: upsertSession(completedSessions(connectionId), session),
      }
      return
    }

    activeSessionsByConnection.value = {
      ...activeSessionsByConnection.value,
      [connectionId]: upsertSession(activeSessions(connectionId), session),
    }
  }

  function setPermitJoinTarget(connectionId: string, target: string) {
    permitJoinTargetByConnection.value = {
      ...permitJoinTargetByConnection.value,
      [connectionId]: target || 'all',
    }
  }

  function setPermitJoin(
    connectionId: string,
    enabled: boolean,
    seconds = enabled ? 254 : 0,
    device?: string,
  ) {
    permitJoinByConnection.value = {
      ...permitJoinByConnection.value,
      [connectionId]: enabled,
    }
    permitJoinTimeoutByConnection.value = {
      ...permitJoinTimeoutByConnection.value,
      [connectionId]: enabled ? seconds : 0,
    }

    const payload: Record<string, DeviceStateValue> = { time: seconds }

    if (enabled && device && device !== 'all') {
      payload.device = device
    }

    useZ2M(connectionId).send('bridge/request/permit_join', payload)
  }

  function tickTimeout(connectionId: string) {
    if (permitJoinTimeout(connectionId) <= 0) {
      permitJoinByConnection.value = {
        ...permitJoinByConnection.value,
        [connectionId]: false,
      }
      permitJoinTimeoutByConnection.value = {
        ...permitJoinTimeoutByConnection.value,
        [connectionId]: 0,
      }
      return
    }

    const nextTimeout = permitJoinTimeout(connectionId) - 1
    permitJoinTimeoutByConnection.value = {
      ...permitJoinTimeoutByConnection.value,
      [connectionId]: nextTimeout,
    }

    if (nextTimeout === 0) {
      permitJoinByConnection.value = {
        ...permitJoinByConnection.value,
        [connectionId]: false,
      }
    }
  }

  return {
    infoByConnection,
    healthByConnection,
    permitJoinByConnection,
    permitJoinTimeoutByConnection,
    permitJoinTargetByConnection,
    activeSessionsByConnection,
    completedSessionsByConnection,
    totalActiveSessions,
    infoFor,
    healthFor,
    permitJoin,
    permitJoinTimeout,
    permitJoinTarget,
    activeSessions,
    completedSessions,
    lastCompletedSessions,
    setBridgeInfo,
    setBridgeHealth,
    syncPermitJoinResponse,
    handleEvent,
    setPermitJoinTarget,
    setPermitJoin,
    tickTimeout,
  }
})
