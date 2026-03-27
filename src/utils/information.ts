import type { BridgeHealthDevice, Device } from '@/types/z2m'

export function formatInfoDateTime(value: number | undefined, unknownLabel: string) {
  if (!value) {
    return unknownLabel
  }

  return new Date(value).toLocaleString()
}

export function formatInfoDuration(seconds: number | undefined, unknownLabel: string) {
  if (typeof seconds !== 'number') {
    return unknownLabel
  }

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

export function formatInfoMb(bytes: number) {
  return `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`
}

export function coordinatorRevisionLabel(
  meta: Record<string, unknown> | null | undefined,
  unknownLabel: string,
) {
  if (!meta || typeof meta !== 'object') {
    return unknownLabel
  }

  return String(meta.revision ?? unknownLabel)
}

export function buildDeviceHealthRows(
  devices: Device[],
  healthDevices: Record<string, BridgeHealthDevice> | undefined,
) {
  return Object.entries(healthDevices ?? {})
    .map(([ieee, health]) => {
      const device = devices.find((entry) => entry.ieee_address === ieee)

      return device
        ? {
            device,
            health,
          }
        : null
    })
    .filter((value): value is { device: Device; health: BridgeHealthDevice } => value !== null)
    .sort((a, b) => a.device.friendly_name.localeCompare(b.device.friendly_name))
}

function buildCounts(devices: Device[], keyResolver: (device: Device) => string) {
  const counts: Record<string, number> = {}

  for (const device of devices) {
    if (device.type === 'Coordinator') {
      continue
    }

    const key = keyResolver(device)
    counts[key] = (counts[key] ?? 0) + 1
  }

  return counts
}

export function statsByType(devices: Device[]) {
  return buildCounts(devices, (device) => device.type)
}

export function statsByPowerSource(devices: Device[], unknownLabel: string) {
  return buildCounts(devices, (device) => device.power_source || unknownLabel)
}

export function statsByModel(devices: Device[], unknownLabel: string) {
  return buildCounts(devices, (device) => device.model_id || unknownLabel)
}

export function statsByVendor(devices: Device[], unknownLabel: string) {
  return buildCounts(devices, (device) => device.manufacturer || unknownLabel)
}
