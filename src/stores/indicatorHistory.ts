import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { useIndicatorHistoryPreference } from '@/composables/useIndicatorHistoryPreference'
import type { DeviceState, DeviceStateValue } from '@/types/z2m'

export interface IndicatorHistoryEntry {
  value: DeviceStateValue
  changedAt: number
}

const MAX_FEATURE_HISTORY = 100

function isSameValue(left: DeviceStateValue | undefined, right: DeviceStateValue | undefined) {
  return left === right
}

export const useIndicatorHistoryStore = defineStore('indicator-history', () => {
  const historyByConnection = ref<
    Record<string, Record<string, Record<string, IndicatorHistoryEntry[]>>>
  >({})
  const { enabled } = useIndicatorHistoryPreference()

  function featureHistory(connectionId: string, deviceName: string, feature: string) {
    return historyByConnection.value[connectionId]?.[deviceName]?.[feature] ?? []
  }

  function recordChange(
    connectionId: string,
    deviceName: string,
    feature: string,
    value: DeviceStateValue,
    changedAt: number,
  ) {
    const deviceHistory = historyByConnection.value[connectionId]?.[deviceName] ?? {}
    const featureEntries = deviceHistory[feature] ?? []
    const previous = featureEntries[0]

    if (previous && isSameValue(previous.value, value)) {
      return
    }

    historyByConnection.value = {
      ...historyByConnection.value,
      [connectionId]: {
        ...historyByConnection.value[connectionId],
        [deviceName]: {
          ...deviceHistory,
          [feature]: [{ value, changedAt }, ...featureEntries].slice(0, MAX_FEATURE_HISTORY),
        },
      },
    }
  }

  function recordStateUpdate(
    connectionId: string,
    deviceName: string,
    currentState: DeviceState,
    nextState: DeviceState,
  ) {
    if (!enabled.value) {
      return
    }

    // We persist the timestamp once per incoming payload so all fields changed
    // by the same device update share the same "moment in time". This keeps the
    // visual trail consistent when a single Zigbee message updates multiple
    // indicators at once.
    const changedAt = Date.now()

    for (const [feature, rawValue] of Object.entries(nextState)) {
      const value = rawValue as DeviceStateValue

      if (isSameValue(currentState[feature], value)) {
        continue
      }

      recordChange(connectionId, deviceName, feature, value, changedAt)
    }
  }

  function renameDevice(connectionId: string, from: string, to: string) {
    const connectionHistory = historyByConnection.value[connectionId]

    if (!connectionHistory || from === to || !(from in connectionHistory)) {
      return
    }

    const fromHistory = connectionHistory[from]

    if (!fromHistory) {
      return
    }

    // History is keyed by friendly_name for the same reason as device state:
    // incoming device messages are routed by topic name, not by IEEE address.
    // When the visible device name changes we migrate the full history bucket
    // so the trail continues seamlessly after the rename.
    const nextConnectionHistory = { ...connectionHistory }
    delete nextConnectionHistory[from]
    nextConnectionHistory[to] = fromHistory

    historyByConnection.value = {
      ...historyByConnection.value,
      [connectionId]: {
        ...nextConnectionHistory,
      },
    }
  }

  function clear() {
    historyByConnection.value = {}
  }

  watch(enabled, (value) => {
    if (!value) {
      clear()
    }
  })

  return {
    enabled,
    historyByConnection,
    featureHistory,
    recordStateUpdate,
    renameDevice,
    clear,
  }
})
