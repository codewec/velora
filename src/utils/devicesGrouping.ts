import type { ComposerTranslation } from 'vue-i18n'

import type { Device, Expose } from '@/types/z2m'
import type { DevicesSortBy } from '@/composables/useDevicesSortingPreference'
import { roomLabelFromDeviceName } from '@/utils/deviceNamePattern'

export type DeviceCardEntry = {
  device: Device
  state?: Record<string, unknown>
  lastSeenAt: number | null
}

export type DevicesGroupBy = 'none' | 'room' | 'function' | 'type' | 'power' | 'vendor'

export type DeviceGroup = {
  key: string
  label: string
  entries: DeviceCardEntry[]
}

export function deviceStatusKey(entry: DeviceCardEntry) {
  if (entry.state?.availability === 'offline') {
    return 'offline'
  }

  return 'online'
}

function numericOrFallback(value: unknown, fallback: number) {
  return typeof value === 'number' ? value : fallback
}

function batterySortValue(entry: DeviceCardEntry) {
  const powerSource = entry.device.power_source?.toLowerCase() ?? ''

  if (powerSource.includes('mains')) {
    return Number.POSITIVE_INFINITY
  }

  return numericOrFallback(entry.state?.battery, Number.POSITIVE_INFINITY - 1)
}

function signalSortValue(entry: DeviceCardEntry) {
  return numericOrFallback(entry.state?.linkquality, Number.NEGATIVE_INFINITY)
}

function lastSeenSortValue(entry: DeviceCardEntry) {
  return entry.lastSeenAt ?? Number.NEGATIVE_INFINITY
}

export function sortDeviceCards(entries: DeviceCardEntry[], sortBy: DevicesSortBy) {
  return [...entries].sort((a, b) => {
    if (sortBy === 'signal') {
      const diff = signalSortValue(a) - signalSortValue(b)
      return diff !== 0 ? diff : a.device.friendly_name.localeCompare(b.device.friendly_name)
    }

    if (sortBy === 'battery') {
      const diff = batterySortValue(a) - batterySortValue(b)
      return diff !== 0 ? diff : a.device.friendly_name.localeCompare(b.device.friendly_name)
    }

    if (sortBy === 'last_seen') {
      const diff = lastSeenSortValue(b) - lastSeenSortValue(a)
      return diff !== 0 ? diff : a.device.friendly_name.localeCompare(b.device.friendly_name)
    }

    return a.device.friendly_name.localeCompare(b.device.friendly_name)
  })
}

function flattenExposeTokens(exposes: Expose[] | undefined): string[] {
  const tokens: string[] = []

  function visit(expose: Expose) {
    tokens.push(
      String(expose.type || '').toLowerCase(),
      String(expose.name || '').toLowerCase(),
      String(expose.property || '').toLowerCase(),
      String(expose.label || '').toLowerCase(),
    )

    if ('features' in expose && Array.isArray(expose.features)) {
      for (const feature of expose.features) {
        visit(feature)
      }
    }
  }

  for (const expose of exposes ?? []) {
    visit(expose)
  }

  return tokens
}

function includesAny(tokens: string[], values: string[]) {
  return values.some((value) => tokens.includes(value))
}

function includesAnyFragment(tokens: string[], values: string[]) {
  return values.some((value) => tokens.some((token) => token.includes(value)))
}

function functionalTypeKey(device: Device) {
  const tokens = flattenExposeTokens(device.definition?.exposes)
  const model = `${device.definition?.model || ''} ${device.model_id || ''} ${
    device.definition?.description || ''
  }`.toLowerCase()
  const powerSource = device.power_source?.toLowerCase() ?? ''
  const hasMeasurement = includesAny(tokens, ['power', 'current', 'voltage', 'energy'])
  const hasSwitchLike = includesAnyFragment(tokens, ['switch', 'state', 'relay'])
  const hasRemoteLike = includesAnyFragment(tokens, ['action', 'side', 'operation_mode'])

  if (
    includesAny(tokens, ['climate', 'current_heating_setpoint', 'local_temperature']) ||
    model.includes('thermostat') ||
    model.includes('trv')
  ) {
    return 'thermostats'
  }

  if (
    includesAny(tokens, ['brightness', 'color_temp', 'color_xy', 'light']) ||
    model.includes('light') ||
    model.includes('bulb')
  ) {
    return 'lights'
  }

  if (
    includesAny(tokens, ['cover', 'position']) ||
    model.includes('curtain') ||
    model.includes('blind') ||
    model.includes('cover')
  ) {
    return 'covers'
  }

  if (
    includesAny(tokens, ['contact', 'occupancy', 'illuminance', 'humidity', 'temperature']) ||
    model.includes('sensor') ||
    model.includes('motion')
  ) {
    return 'sensors'
  }

  if (
    (powerSource.includes('battery') &&
      (hasRemoteLike ||
        model.includes('remote') ||
        model.includes('button') ||
        model.includes('cube'))) ||
    model.includes('scene switch')
  ) {
    return 'remotes'
  }

  if (
    includesAnyFragment(tokens, ['plug', 'outlet', 'socket']) ||
    model.includes('plug') ||
    model.includes('outlet') ||
    model.includes('socket') ||
    (powerSource.includes('mains') && hasMeasurement && hasSwitchLike)
  ) {
    return 'plugs'
  }

  if (hasSwitchLike || model.includes('switch') || model.includes('relay')) {
    return 'switches'
  }

  return 'other'
}

function deviceTypeLabel(device: Device, t: ComposerTranslation) {
  const type = device.type.toLowerCase()

  if (type === 'router') {
    return t('deviceCard.router')
  }

  if (type === 'enddevice') {
    return t('deviceCard.endDevice')
  }

  if (type === 'coordinator') {
    return t('deviceCard.coordinator')
  }

  return device.type
}

function devicePowerLabel(device: Device, t: ComposerTranslation) {
  const powerSource = device.power_source?.toLowerCase() ?? ''

  if (powerSource.includes('mains')) {
    return t('deviceCard.mains')
  }

  if (powerSource.includes('battery')) {
    return t('devicesPage.groupBattery')
  }

  return device.power_source || t('app.unknown')
}

function groupLabel(
  groupBy: Exclude<DevicesGroupBy, 'none'>,
  key: string,
  sample: DeviceCardEntry,
  t: ComposerTranslation,
  namingPattern: string,
) {
  if (groupBy === 'room') {
    return (
      roomLabelFromDeviceName(sample.device.friendly_name, namingPattern)?.label || t('app.unknown')
    )
  }

  if (groupBy === 'function') {
    if (key === 'switches') return t('devicesPage.functionSwitches')
    if (key === 'plugs') return t('devicesPage.functionPlugs')
    if (key === 'lights') return t('devicesPage.functionLights')
    if (key === 'sensors') return t('devicesPage.functionSensors')
    if (key === 'remotes') return t('devicesPage.functionRemotes')
    if (key === 'thermostats') return t('devicesPage.functionThermostats')
    if (key === 'covers') return t('devicesPage.functionCovers')
    return t('devicesPage.functionOther')
  }

  if (groupBy === 'type') {
    return deviceTypeLabel(sample.device, t)
  }

  if (groupBy === 'power') {
    return devicePowerLabel(sample.device, t)
  }

  return sample.device.manufacturer || t('app.unknown')
}

function groupSortWeight(groupBy: Exclude<DevicesGroupBy, 'none'>, key: string) {
  if (groupBy === 'room') {
    return 0
  }

  if (groupBy === 'function') {
    if (key === 'switches') return 0
    if (key === 'plugs') return 1
    if (key === 'lights') return 2
    if (key === 'sensors') return 3
    if (key === 'remotes') return 4
    if (key === 'thermostats') return 5
    if (key === 'covers') return 6
    return 7
  }

  return 100
}

function groupKey(
  groupBy: Exclude<DevicesGroupBy, 'none'>,
  entry: DeviceCardEntry,
  namingPattern: string,
) {
  if (groupBy === 'room') {
    return roomLabelFromDeviceName(entry.device.friendly_name, namingPattern)?.key || 'unknown'
  }

  if (groupBy === 'function') {
    return functionalTypeKey(entry.device)
  }

  if (groupBy === 'type') {
    return entry.device.type || 'unknown'
  }

  if (groupBy === 'power') {
    const powerSource = entry.device.power_source?.toLowerCase() ?? ''

    if (powerSource.includes('mains')) return 'mains'
    if (powerSource.includes('battery')) return 'battery'

    return entry.device.power_source || 'unknown'
  }

  return entry.device.manufacturer || 'unknown'
}

export function groupDeviceCards(
  entries: DeviceCardEntry[],
  groupBy: DevicesGroupBy,
  sortBy: DevicesSortBy,
  t: ComposerTranslation,
  namingPattern: string,
) {
  if (groupBy === 'none') {
    return []
  }

  const grouped = new Map<string, DeviceCardEntry[]>()

  for (const entry of entries) {
    const key = groupKey(groupBy, entry, namingPattern)
    const existing = grouped.get(key) ?? []
    existing.push(entry)
    grouped.set(key, existing)
  }

  return [...grouped.entries()]
    .map(([key, groupEntries]) => {
      const firstEntry = groupEntries[0]

      if (!firstEntry) {
        return null
      }

      return {
        key,
        label: groupLabel(groupBy, key, firstEntry, t, namingPattern),
        entries: sortDeviceCards(groupEntries, sortBy),
      }
    })
    .filter((group): group is DeviceGroup => group !== null)
    .sort((a, b) => {
      const weightDiff = groupSortWeight(groupBy, a.key) - groupSortWeight(groupBy, b.key)
      return weightDiff !== 0 ? weightDiff : a.label.localeCompare(b.label)
    })
}
