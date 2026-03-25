import { onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

import { useBridgeStore } from '@/stores/bridge'
import type { InterviewSession } from '@/types/z2m'

function toastColor(status: InterviewSession['status']) {
  switch (status) {
    case 'successful':
      return 'success' as const
    case 'failed':
      return 'error' as const
    default:
      return 'warning' as const
  }
}

function toastDescription(session: InterviewSession) {
  switch (session.status) {
    case 'interview_started':
      return 'Interview started'
    case 'successful':
      return 'Interview completed successfully'
    case 'failed':
      return session.error || 'Interview failed'
    default:
      return 'Device joined, waiting for interview'
  }
}

export function useInterviewToasts() {
  const toast = useToast()
  const router = useRouter()
  const bridgeStore = useBridgeStore()
  const statusBySession = new Map<string, InterviewSession['status']>()
  const removeTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function upsertToast(connectionId: string, session: InterviewSession) {
    const id = `interview:${connectionId}:${session.ieeeAddress}`
    const finished = session.status === 'successful' || session.status === 'failed'
    const actions: Array<{
      label: string
      color: 'neutral' | 'error'
      variant: 'outline'
      onClick: () => void
    }> = [{
      label: 'Open device',
      color: 'neutral' as const,
      variant: 'outline' as const,
      onClick: () => {
        router.push(`/connections/${connectionId}/devices/${session.ieeeAddress}`)
      },
    }]

    if (finished && bridgeStore.permitJoin(connectionId)) {
      actions.push({
        label: 'Stop pairing',
        color: 'error' as const,
        variant: 'outline' as const,
        onClick: () => {
          bridgeStore.setPermitJoin(connectionId, false, 0, bridgeStore.permitJoinTarget(connectionId))
        },
      })
    }

    const payload = {
      id,
      title: session.friendlyName,
      description: toastDescription(session),
      color: toastColor(session.status),
      duration: finished ? 5000 : 0,
      close: false,
      progress: finished,
      actions,
    }

    if (statusBySession.has(id)) {
      toast.update(id, payload)
    } else {
      toast.add(payload)
    }

    statusBySession.set(id, session.status)

    const currentTimer = removeTimers.get(id)
    if (currentTimer) {
      clearTimeout(currentTimer)
      removeTimers.delete(id)
    }

    if (finished) {
      const timer = setTimeout(() => {
        toast.remove(id)
        removeTimers.delete(id)
        statusBySession.delete(id)
      }, 5200)

      removeTimers.set(id, timer)
    }
  }

  watch(
    () => ({
      active: bridgeStore.activeSessionsByConnection,
      completed: bridgeStore.completedSessionsByConnection,
    }),
    (snapshot) => {
      for (const [connectionId, sessions] of Object.entries(snapshot.active)) {
        for (const session of sessions) {
          const id = `interview:${connectionId}:${session.ieeeAddress}`
          if (statusBySession.get(id) !== session.status) {
            upsertToast(connectionId, session)
          }
        }
      }

      for (const [connectionId, sessions] of Object.entries(snapshot.completed)) {
        for (const session of sessions) {
          const id = `interview:${connectionId}:${session.ieeeAddress}`
          if (statusBySession.get(id) !== session.status) {
            upsertToast(connectionId, session)
          }
        }
      }
    },
    { deep: true, immediate: true },
  )

  onUnmounted(() => {
    for (const timer of removeTimers.values()) {
      clearTimeout(timer)
    }
    removeTimers.clear()
  })
}
