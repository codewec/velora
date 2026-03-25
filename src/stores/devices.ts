import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { useIndicatorHistoryStore } from '@/stores/indicatorHistory'
import type { Device, DeviceState } from '@/types/z2m'

export const useDevicesStore = defineStore('devices', () => {
  const devicesByConnection = ref<Record<string, Device[]>>({})
  const deviceStatesByConnection = ref<Record<string, Record<string, DeviceState>>>({})
  const loadingByConnection = ref<Record<string, boolean>>({})
  const activityByConnection = ref<Record<string, Record<string, { rx: boolean, tx: boolean }>>>({})
  const observedLastSeenByConnection = ref<Record<string, Record<string, number>>>({})
  const reportedLastSeenByConnection = ref<Record<string, Record<string, number>>>({})

  const rxTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const txTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const indicatorHistoryStore = useIndicatorHistoryStore()

  const totalDevices = computed(() =>
    Object.values(devicesByConnection.value).reduce((count, devices) => count + devices.length, 0),
  )

  function devicesFor(connectionId: string) {
    return devicesByConnection.value[connectionId] ?? []
  }

  function peripheralDevices(connectionId: string) {
    return devicesFor(connectionId).filter((device) => device.type.toLowerCase() !== 'coordinator')
  }

  function permitJoinDevices(connectionId: string) {
    return devicesFor(connectionId).filter((device) => {
      const type = device.type.toLowerCase()
      return !device.disabled && (type === 'coordinator' || type === 'router')
    })
  }

  function deviceStatesFor(connectionId: string) {
    return deviceStatesByConnection.value[connectionId] ?? {}
  }

  function isLoading(connectionId: string) {
    return loadingByConnection.value[connectionId] ?? true
  }

  function activityFor(connectionId: string) {
    return activityByConnection.value[connectionId] ?? {}
  }

  function observedLastSeenFor(connectionId: string) {
    return observedLastSeenByConnection.value[connectionId] ?? {}
  }

  function reportedLastSeenFor(connectionId: string) {
    return reportedLastSeenByConnection.value[connectionId] ?? {}
  }

  function deviceActivity(connectionId: string, friendlyName: string) {
    return activityFor(connectionId)[friendlyName] ?? { rx: false, tx: false }
  }

  function deviceLastSeen(connectionId: string, friendlyName: string) {
    return observedLastSeenFor(connectionId)[friendlyName] ?? null
  }

  function deviceReportedLastSeen(connectionId: string, friendlyName: string) {
    return reportedLastSeenFor(connectionId)[friendlyName] ?? null
  }

  function setObservedLastSeen(connectionId: string, friendlyName: string, timestamp: number) {
    const current = observedLastSeenFor(connectionId)
    observedLastSeenByConnection.value = {
      ...observedLastSeenByConnection.value,
      [connectionId]: {
        ...current,
        [friendlyName]: timestamp,
      },
    }
  }

  function setReportedLastSeen(connectionId: string, friendlyName: string, timestamp: number) {
    const current = reportedLastSeenFor(connectionId)
    reportedLastSeenByConnection.value = {
      ...reportedLastSeenByConnection.value,
      [connectionId]: {
        ...current,
        [friendlyName]: timestamp,
      },
    }
  }

  function parseLastSeen(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value > 10_000_000_000 ? value : value * 1000
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value)
      if (!Number.isNaN(parsed)) {
        return parsed
      }
    }

    return null
  }

  function setActivityFlag(connectionId: string, friendlyName: string, direction: 'rx' | 'tx', active: boolean) {
    const currentActivity = activityFor(connectionId)
    const currentDeviceActivity = currentActivity[friendlyName] ?? { rx: false, tx: false }

    activityByConnection.value = {
      ...activityByConnection.value,
      [connectionId]: {
        ...currentActivity,
        [friendlyName]: {
          ...currentDeviceActivity,
          [direction]: active,
        },
      },
    }
  }

  function pulseActivity(connectionId: string, friendlyName: string, direction: 'rx' | 'tx') {
    const timerKey = `${connectionId}:${friendlyName}`
    const timers = direction === 'rx' ? rxTimers : txTimers

    setActivityFlag(connectionId, friendlyName, direction, true)

    const existingTimer = timers.get(timerKey)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    timers.set(timerKey, setTimeout(() => {
      setActivityFlag(connectionId, friendlyName, direction, false)
      timers.delete(timerKey)
    }, 700))
  }

  function setDevices(connectionId: string, nextDevices: Device[]) {
    devicesByConnection.value = {
      ...devicesByConnection.value,
      [connectionId]: nextDevices,
    }
    loadingByConnection.value = {
      ...loadingByConnection.value,
      [connectionId]: false,
    }
  }

  function updateDeviceDescription(connectionId: string, ieeeAddress: string, description: string) {
    devicesByConnection.value = {
      ...devicesByConnection.value,
      [connectionId]: devicesFor(connectionId).map((device) =>
        device.ieee_address === ieeeAddress
          ? { ...device, description }
          : device,
      ),
    }
  }

  function moveConnectionEntry<T>(
    source: Record<string, Record<string, T>>,
    connectionId: string,
    from: string,
    to: string,
  ): Record<string, Record<string, T>> {
    const connectionData = source[connectionId]

    if (!connectionData || from === to) {
      return source
    }

    const fromValue = connectionData[from]

    if (fromValue === undefined) {
      return source
    }

    const nextConnectionData = { ...connectionData }
    delete nextConnectionData[from]
    nextConnectionData[to] = fromValue

    return {
      ...source,
      [connectionId]: nextConnectionData,
    }
  }

  function renameDevice(connectionId: string, ieeeAddress: string, friendlyName: string) {
    const previous = devicesFor(connectionId).find(device => device.ieee_address === ieeeAddress)

    if (!previous || previous.friendly_name === friendlyName) {
      return
    }

    const previousName = previous.friendly_name

    // Zigbee2MQTT identifies the device by IEEE address, but most frontend
    // state dictionaries are keyed by friendly_name because incoming device
    // topics are also friendly_name-based. After a rename we have to move every
    // cached entry to the new key so state, activity and last-seen data remain
    // attached to the same physical device.
    devicesByConnection.value = {
      ...devicesByConnection.value,
      [connectionId]: devicesFor(connectionId).map((device) =>
        device.ieee_address === ieeeAddress
          ? { ...device, friendly_name: friendlyName }
          : device,
      ),
    }

    deviceStatesByConnection.value = moveConnectionEntry(
      deviceStatesByConnection.value,
      connectionId,
      previousName,
      friendlyName,
    )
    activityByConnection.value = moveConnectionEntry(
      activityByConnection.value,
      connectionId,
      previousName,
      friendlyName,
    )
    observedLastSeenByConnection.value = moveConnectionEntry(
      observedLastSeenByConnection.value,
      connectionId,
      previousName,
      friendlyName,
    )
    reportedLastSeenByConnection.value = moveConnectionEntry(
      reportedLastSeenByConnection.value,
      connectionId,
      previousName,
      friendlyName,
    )
    indicatorHistoryStore.renameDevice(connectionId, previousName, friendlyName)
  }

  function updateDeviceState(connectionId: string, friendlyName: string, nextState: DeviceState) {
    const currentStates = deviceStatesFor(connectionId)
    const current = currentStates[friendlyName] ?? {}
    const parsedLastSeen = parseLastSeen(nextState.last_seen)

    deviceStatesByConnection.value = {
      ...deviceStatesByConnection.value,
      [connectionId]: {
        ...currentStates,
        [friendlyName]: {
          ...current,
          ...nextState,
        },
      },
    }

    if (parsedLastSeen) {
      setReportedLastSeen(connectionId, friendlyName, parsedLastSeen)
      setObservedLastSeen(connectionId, friendlyName, parsedLastSeen)
    }
  }

  function markDeviceRx(connectionId: string, friendlyName: string) {
    setObservedLastSeen(connectionId, friendlyName, Date.now())
    pulseActivity(connectionId, friendlyName, 'rx')
  }

  function markDeviceTx(connectionId: string, friendlyName: string) {
    pulseActivity(connectionId, friendlyName, 'tx')
  }

  function deviceById(connectionId: string, id: string) {
    return devicesFor(connectionId).find((device) => device.ieee_address === id) ?? null
  }

  function deviceWithState(connectionId: string, friendlyName: string) {
    const device = devicesFor(connectionId).find((entry) => entry.friendly_name === friendlyName) ?? null

    if (!device) {
      return null
    }

    return {
      ...device,
      state: deviceStatesFor(connectionId)[friendlyName] ?? {},
    }
  }

  return {
    devicesByConnection,
    deviceStatesByConnection,
    loadingByConnection,
    activityByConnection,
    observedLastSeenByConnection,
    reportedLastSeenByConnection,
    totalDevices,
    devicesFor,
    deviceStatesFor,
    isLoading,
    activityFor,
    observedLastSeenFor,
    reportedLastSeenFor,
    deviceActivity,
    deviceLastSeen,
    deviceReportedLastSeen,
    peripheralDevices,
    permitJoinDevices,
    setDevices,
    updateDeviceDescription,
    renameDevice,
    updateDeviceState,
    markDeviceRx,
    markDeviceTx,
    deviceById,
    deviceWithState,
  }
})
