import type { Device } from '@/types/z2m'

export function deviceImageUrl(device: Device) {
  const model = device.definition?.model
  return model
    ? `https://www.zigbee2mqtt.io/images/devices/${model.replaceAll('/', '-')}.png`
    : null
}

export function deviceDisplayTitle(device: Device) {
  return device.description || device.definition?.description || device.friendly_name
}

export function deviceDisplaySubtitle(device: Device) {
  if (device.description || device.definition?.description) {
    return device.friendly_name
  }

  return device.definition?.model || device.model_id || device.ieee_address
}
