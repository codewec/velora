import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getDefaultConnectionId } from '@/config/z2mConnections'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import { useIndicatorHistoryStore } from '@/stores/indicatorHistory'
import { useLogsStore } from '@/stores/logs'
import type {
  BridgeEvent,
  BridgeHealth,
  BridgeInfo,
  BridgePermitJoinResponse,
  Device,
  DeviceState,
  Z2MMessage,
} from '@/types/z2m'
import { useZ2M } from './useZ2M'

function isDeviceStateTopic(topic: string) {
  return !topic.startsWith('bridge/')
}

function getFriendlyNameFromTopic(topic: string) {
  return topic
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBridgeEvent(value: unknown): value is BridgeEvent {
  return isRecord(value) && typeof value.type === 'string'
}

function isBridgePermitJoinResponse(value: unknown): value is BridgePermitJoinResponse {
  return isRecord(value)
}

export function useZ2MInit() {
  const route = useRoute()
  const devicesStore = useDevicesStore()
  const bridgeStore = useBridgeStore()
  const indicatorHistoryStore = useIndicatorHistoryStore()
  const logsStore = useLogsStore()
  let unsubscribe: (() => void) | null = null
  let activeConnectionId: string | null = null

  function routeMessage(connectionId: string, message: Z2MMessage) {
    if (message.topic === 'bridge/devices' && Array.isArray(message.payload)) {
      logsStore.addLog(connectionId, {
        level: 'info',
        kind: 'bridge',
        summary: `Loaded devices (${message.payload.length})`,
        raw: JSON.stringify(message.payload, null, 2),
      })
      devicesStore.setDevices(connectionId, message.payload as Device[])
      return
    }

    if (message.topic === 'bridge/info' && isRecord(message.payload)) {
      logsStore.addLog(connectionId, {
        level: 'info',
        kind: 'bridge',
        summary: 'Bridge info updated',
        raw: JSON.stringify(message.payload, null, 2),
      })
      bridgeStore.setBridgeInfo(connectionId, message.payload as BridgeInfo)
      return
    }

    if (message.topic === 'bridge/health' && isRecord(message.payload)) {
      logsStore.addLog(connectionId, {
        level: 'info',
        kind: 'bridge',
        summary: 'Bridge health updated',
        raw: JSON.stringify(message.payload, null, 2),
      })
      bridgeStore.setBridgeHealth(connectionId, message.payload as unknown as BridgeHealth)
      return
    }

    if (message.topic === 'bridge/event' && isBridgeEvent(message.payload)) {
      logsStore.addLog(connectionId, {
        level: message.payload.type === 'device_interview' ? 'warning' : 'info',
        kind: 'event',
        summary: `Bridge event: ${message.payload.type}`,
        raw: JSON.stringify(message.payload, null, 2),
      })
      console.info('[z2m-ui] bridge/event', connectionId, message.payload)
      bridgeStore.handleEvent(connectionId, message.payload)
      return
    }

    if (message.topic === 'bridge/response/permit_join' && isBridgePermitJoinResponse(message.payload)) {
      logsStore.addLog(connectionId, {
        level: message.payload.status === 'ok' ? 'info' : 'warning',
        kind: 'bridge',
        summary: 'Permit join response',
        raw: JSON.stringify(message.payload, null, 2),
      })
      bridgeStore.syncPermitJoinResponse(connectionId, message.payload)
      return
    }

    if (isDeviceStateTopic(message.topic) && isRecord(message.payload)) {
      const friendlyName = getFriendlyNameFromTopic(message.topic)
      const currentState = devicesStore.deviceStatesFor(connectionId)[friendlyName] ?? {}

      logsStore.addLog(connectionId, {
        level: 'debug',
        kind: 'device',
        summary: `Device update: ${message.topic}`,
        raw: JSON.stringify(message.payload, null, 2),
      })
      devicesStore.markDeviceRx(connectionId, friendlyName)
      indicatorHistoryStore.recordStateUpdate(
        connectionId,
        friendlyName,
        currentState,
        message.payload as DeviceState,
      )
      devicesStore.updateDeviceState(
        connectionId,
        friendlyName,
        message.payload as DeviceState,
      )
    }
  }

  function bindConnection(connectionId: string) {
    if (activeConnectionId === connectionId) {
      return
    }

    if (activeConnectionId) {
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }

      useZ2M(activeConnectionId).disconnect()
    }

    const z2m = useZ2M(connectionId)
    unsubscribe = z2m.subscribe((message) => routeMessage(connectionId, message))
    z2m.connect()
    activeConnectionId = connectionId
  }

  onMounted(() => {
    watch(
      () => String(route.params.connectionId || getDefaultConnectionId()),
      (connectionId) => {
        bindConnection(connectionId)
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }

    if (activeConnectionId) {
      useZ2M(activeConnectionId).disconnect()
    }
  })
}
