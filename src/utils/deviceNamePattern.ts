const DEFAULT_DEVICE_NAME_PATTERN = '{room}_{type}_{placement}'

type DeviceNameParts = {
  room?: string
  type?: string
  placement?: string
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function humanizeSegment(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (char) => char.toUpperCase())
}

export function defaultDeviceNamePattern() {
  return DEFAULT_DEVICE_NAME_PATTERN
}

export function parseDeviceNameByPattern(
  name: string,
  pattern: string | null | undefined,
): DeviceNameParts | null {
  const source = pattern?.trim() || DEFAULT_DEVICE_NAME_PATTERN
  const placeholderPattern = /\{(room|type|placement)\}/g
  const placeholders = [...source.matchAll(placeholderPattern)]

  if (!placeholders.length) {
    return null
  }

  const regexSource = `^${escapeRegExp(source).replace(
    /\\\{(room|type|placement)\\\}/g,
    (_match, placeholder: string) => {
      return placeholder === 'placement' ? `(?<${placeholder}>.+)` : `(?<${placeholder}>[^_]+)`
    },
  )}$`

  const match = new RegExp(regexSource).exec(name)
  const groups = match?.groups

  if (!groups) {
    return null
  }

  return {
    room: groups.room || undefined,
    type: groups.type || undefined,
    placement: groups.placement || undefined,
  }
}

export function roomLabelFromDeviceName(name: string, pattern: string | null | undefined) {
  const parts = parseDeviceNameByPattern(name, pattern)
  const room = parts?.room?.trim()

  if (!room) {
    return null
  }

  return {
    key: room.toLowerCase(),
    label: humanizeSegment(room),
  }
}
