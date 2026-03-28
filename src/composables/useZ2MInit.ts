import { onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getDefaultConnectionId } from '@/config/z2mConnections'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import { useIndicatorHistoryStore } from '@/stores/indicatorHistory'
import { useLogsStore } from '@/stores/logs'
import { i18n } from '@/i18n'
import { parseBridgeLoggingPayload } from '@/utils/logPresentation'
import type {
  BridgeEvent,
  BridgeHealth,
  BridgeInfo,
  BridgeLoggingMessage,
  BridgeNetworkMapResponse,
  BridgePermitJoinResponse,
  Device,
  DeviceState,
  Z2MMessage,
} from '@/types/z2m'
import { useZ2M } from './useZ2M'

function isDeviceStateTopic(topic: string) {
  return !topic.startsWith('bridge/') && !topic.endsWith('/set')
}

function getDeviceNameFromTopic(
  connectionId: string,
  topic: string,
  devicesStore: ReturnType<typeof useDevicesStore>,
) {
  const normalizedTopic = topic.endsWith('/set') ? topic.slice(0, -4) : topic
  const device = devicesStore
    .devicesFor(connectionId)
    .find(
      (entry) => entry.friendly_name === normalizedTopic || entry.ieee_address === normalizedTopic,
    )

  return device?.friendly_name || normalizedTopic
}

function isDeviceCommandTopic(topic: string) {
  return !topic.startsWith('bridge/') && topic.endsWith('/set')
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

function isBridgeLoggingMessage(value: unknown): value is BridgeLoggingMessage {
  return isRecord(value) && typeof value.message === 'string' && typeof value.level === 'string'
}

function isBridgeNetworkMapResponse(value: unknown): value is BridgeNetworkMapResponse {
  return isRecord(value)
}

function isOutboundDeviceLog(message: string) {
  return /\bto '([^']+)'/i.test(message)
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
        summary: i18n.global.t('logsPage.loadedDevices', { count: message.payload.length }),
        raw: JSON.stringify(message.payload, null, 2),
      })
      devicesStore.setDevices(connectionId, message.payload as Device[])
      return
    }

    if (message.topic === 'bridge/info' && isRecord(message.payload)) {
      logsStore.addLog(connectionId, {
        level: 'info',
        kind: 'bridge',
        summary: i18n.global.t('logsPage.bridgeInfoUpdated'),
        raw: JSON.stringify(message.payload, null, 2),
      })
      bridgeStore.setBridgeInfo(connectionId, message.payload as BridgeInfo)
      return
    }

    if (message.topic === 'bridge/health' && isRecord(message.payload)) {
      logsStore.addLog(connectionId, {
        level: 'info',
        kind: 'bridge',
        summary: i18n.global.t('logsPage.bridgeHealthUpdated'),
        raw: JSON.stringify(message.payload, null, 2),
      })
      bridgeStore.setBridgeHealth(connectionId, message.payload as unknown as BridgeHealth)
      return
    }

    if (message.topic === 'bridge/event' && isBridgeEvent(message.payload)) {
      logsStore.addLog(connectionId, {
        level: message.payload.type === 'device_interview' ? 'warning' : 'info',
        kind: 'event',
        summary: i18n.global.t('logsPage.bridgeEvent', { type: message.payload.type }),
        raw: JSON.stringify(message.payload, null, 2),
      })
      console.info('[velora] bridge/event', connectionId, message.payload)
      bridgeStore.handleEvent(connectionId, message.payload)
      return
    }

    if (
      message.topic === 'bridge/response/permit_join' &&
      isBridgePermitJoinResponse(message.payload)
    ) {
      logsStore.addLog(connectionId, {
        level: message.payload.status === 'ok' ? 'info' : 'warning',
        kind: 'bridge',
        summary: i18n.global.t('logsPage.permitJoinResponse'),
        raw: JSON.stringify(message.payload, null, 2),
      })
      bridgeStore.syncPermitJoinResponse(connectionId, message.payload)
      return
    }

    if (
      message.topic === 'bridge/response/networkmap' &&
      isBridgeNetworkMapResponse(message.payload)
    ) {
      logsStore.addLog(connectionId, {
        level: message.payload.status === 'ok' ? 'info' : 'error',
        kind: 'bridge',
        summary:
          message.payload.status === 'ok'
            ? i18n.global.t('logsPage.networkMapUpdated')
            : i18n.global.t('logsPage.networkMapFailed'),
        raw: JSON.stringify(message.payload, null, 2),
      })
      bridgeStore.setNetworkMapResponse(connectionId, message.payload)
      return
    }

    if (message.topic === 'bridge/logging' && isBridgeLoggingMessage(message.payload)) {
      const raw = JSON.stringify(message.payload, null, 2)
      const parsed = parseBridgeLoggingPayload(raw)
      const level =
        message.payload.level === 'error'
          ? 'error'
          : message.payload.level === 'warning'
            ? 'warning'
            : message.payload.level === 'debug'
              ? 'debug'
              : 'info'

      if (parsed?.deviceName && isOutboundDeviceLog(parsed.message)) {
        devicesStore.markDeviceBridgeTx(connectionId, parsed.deviceName)
      }

      logsStore.addLog(connectionId, {
        level,
        kind: 'bridge',
        summary: parsed?.deviceName
          ? level === 'error'
            ? i18n.global.t('logsPage.deviceErrorSummary', { device: parsed.deviceName })
            : i18n.global.t('logsPage.deviceLogSummary', { device: parsed.deviceName })
          : level === 'error'
            ? i18n.global.t('logsPage.errorToastTitle')
            : i18n.global.t('logsPage.bridgeLogSummary'),
        raw,
      })
      return
    }

    if (isDeviceCommandTopic(message.topic)) {
      const friendlyName = getDeviceNameFromTopic(connectionId, message.topic, devicesStore)

      logsStore.addLog(connectionId, {
        level: 'debug',
        kind: 'tx',
        summary: i18n.global.t('logsPage.sent', { topic: message.topic }),
        raw: JSON.stringify(message.payload, null, 2),
      })
      devicesStore.markDeviceBridgeTx(connectionId, friendlyName)
      return
    }

    if (isDeviceStateTopic(message.topic) && isRecord(message.payload)) {
      const friendlyName = getDeviceNameFromTopic(connectionId, message.topic, devicesStore)
      const currentState = devicesStore.deviceStatesFor(connectionId)[friendlyName] ?? {}

      logsStore.addLog(connectionId, {
        level: 'debug',
        kind: 'device',
        summary: i18n.global.t('logsPage.deviceUpdate', { topic: message.topic }),
        raw: JSON.stringify(message.payload, null, 2),
      })
      devicesStore.markDeviceRx(connectionId, friendlyName)
      indicatorHistoryStore.recordStateUpdate(
        connectionId,
        friendlyName,
        currentState,
        message.payload as DeviceState,
      )
      devicesStore.updateDeviceState(connectionId, friendlyName, message.payload as DeviceState)
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
