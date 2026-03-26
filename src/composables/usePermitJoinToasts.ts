import { computed, h, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import PermitJoinToastDescription from '@/components/PermitJoinToastDescription.vue'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'

export function usePermitJoinToasts() {
  const toast = useToast()
  const { t } = useI18n()
  const bridgeStore = useBridgeStore()
  const devicesStore = useDevicesStore()
  const activeToastIds = new Set<string>()
  const initialTimeoutByConnection = new Map<string, number>()

  const pairingState = computed(() => {
    const connectionIds = new Set([
      ...Object.keys(bridgeStore.permitJoinByConnection),
      ...Object.keys(bridgeStore.permitJoinTimeoutByConnection),
      ...Object.keys(bridgeStore.permitJoinTargetByConnection),
    ])

    return [...connectionIds].sort().map((connectionId) => ({
      connectionId,
      enabled: bridgeStore.permitJoin(connectionId),
      timeout: bridgeStore.permitJoinTimeout(connectionId),
      target: bridgeStore.permitJoinTarget(connectionId),
      deviceNames: devicesStore.devicesFor(connectionId).map((device) => device.friendly_name),
    }))
  })

  function syncToast(connectionId: string) {
    const id = `permit-join:${connectionId}`
    const timeout = bridgeStore.permitJoinTimeout(connectionId)
    const enabled = bridgeStore.permitJoin(connectionId) && timeout > 0

    if (!enabled) {
      if (activeToastIds.has(id)) {
        toast.remove(id)
        activeToastIds.delete(id)
      }
      initialTimeoutByConnection.delete(connectionId)
      return
    }

    if (!initialTimeoutByConnection.has(connectionId)) {
      initialTimeoutByConnection.set(connectionId, timeout)
    }

    const initialTimeout = initialTimeoutByConnection.get(connectionId) ?? timeout

    const payload = {
      id,
      title: t('permitJoin.enabled'),
      description: h(PermitJoinToastDescription, { connectionId, initialTimeout }),
      color: 'warning' as const,
      duration: timeout * 1000,
      progress: false,
      close: false,
      actions: [
        {
          label: t('permitJoin.stop'),
          color: 'error' as const,
          variant: 'outline' as const,
          onClick: () => {
            bridgeStore.setPermitJoin(
              connectionId,
              false,
              0,
              bridgeStore.permitJoinTarget(connectionId),
            )
            toast.remove(id)
          },
        },
      ],
    }

    if (!activeToastIds.has(id)) {
      toast.add(payload)
      activeToastIds.add(id)
    }
  }

  watch(
    pairingState,
    (states) => {
      for (const state of states) {
        syncToast(state.connectionId)
      }
    },
    { deep: true, immediate: true },
  )
}
