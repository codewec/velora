import type { Device, NetworkMapLink, NetworkMapNode, NetworkMapValue } from '@/types/z2m'
import { formatBrowserDateTime } from '@/utils/dateTime'

export type NetworkMapCacheEntry = {
  updatedAt: number
  value: NetworkMapValue
}

export function networkMapCacheKey(connectionId: string) {
  return `velora:network-map:${connectionId}`
}

export function loadNetworkMapCache(connectionId: string) {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(networkMapCacheKey(connectionId))
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as NetworkMapCacheEntry
    if (!parsed || typeof parsed.updatedAt !== 'number' || !parsed.value) {
      return null
    }

    return parsed
  } catch {
    window.localStorage.removeItem(networkMapCacheKey(connectionId))
    return null
  }
}

export function persistNetworkMapCache(connectionId: string, value: NetworkMapValue) {
  if (typeof window === 'undefined') {
    return null
  }

  const entry: NetworkMapCacheEntry = {
    updatedAt: Date.now(),
    value,
  }

  window.localStorage.setItem(networkMapCacheKey(connectionId), JSON.stringify(entry))
  return entry
}

export function clearNetworkMapCache(connectionId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(networkMapCacheKey(connectionId))
}

export function buildNetworkMapNodes(
  mapNodes: NetworkMapNode[] | undefined,
  inventoryDevices: Device[],
) {
  const knownNodes = new Map((mapNodes ?? []).map((node) => [node.ieeeAddr, node]))

  // Zigbee2MQTT raw network maps do not always include isolated devices.
  // To keep the graph useful, we enrich the topology with the device inventory
  // and render missing devices as standalone nodes with zero links.
  for (const device of inventoryDevices) {
    if (knownNodes.has(device.ieee_address)) {
      continue
    }

    knownNodes.set(device.ieee_address, {
      ieeeAddr: device.ieee_address,
      friendlyName: device.friendly_name,
      type: device.type,
      networkAddress: device.network_address,
      isolated: true,
    })
  }

  return [...knownNodes.values()].sort((a, b) => a.friendlyName.localeCompare(b.friendlyName))
}

export function sortNetworkMapLinks(links: NetworkMapLink[] | undefined) {
  return [...(links ?? [])].sort((a, b) => {
    const left = `${a.source.ieeeAddr}-${a.target.ieeeAddr}`
    const right = `${b.source.ieeeAddr}-${b.target.ieeeAddr}`
    return left.localeCompare(right)
  })
}

export function roleColor(type: string) {
  if (type === 'Coordinator') {
    return 'error'
  }

  if (type === 'Router') {
    return 'primary'
  }

  return 'neutral'
}

export function formatNodeName(node: NetworkMapNode | null, fallbackIeee: string) {
  if (!node) {
    return fallbackIeee
  }

  return node.friendlyName || node.ieeeAddr
}

export function formatNetworkMapLastSeen(value: number | undefined, unknownLabel: string) {
  if (!value) {
    return unknownLabel
  }

  return formatBrowserDateTime(value)
}

export function formatNetworkAddress(value: number | undefined, unknownLabel: string) {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value !== 'number') {
    return unknownLabel
  }

  return `0x${value.toString(16).toUpperCase()}`
}

export function normalizeNetworkAddress(value: number | string | undefined) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim()

    if (/^0x[0-9a-f]+$/i.test(normalized)) {
      return Number.parseInt(normalized.slice(2), 16)
    }

    if (/^\d+$/.test(normalized)) {
      return Number.parseInt(normalized, 10)
    }
  }

  return null
}

export function formatLinkLabel(link: NetworkMapLink) {
  const lqi = typeof link.linkquality === 'number' ? `LQI ${link.linkquality}` : 'LQI ?'
  const routes = link.routes?.length ? ` · ${link.routes.length} routes` : ''
  return `${lqi}${routes}`
}

export function networkMapNodeByIeee(map: NetworkMapValue | null | undefined, ieeeAddr: string) {
  return map?.nodes.find((node) => node.ieeeAddr === ieeeAddr) ?? null
}

export function networkMapNodeByAddress(
  map: NetworkMapValue | null | undefined,
  networkAddress: number | string | undefined,
) {
  const normalized = normalizeNetworkAddress(networkAddress)

  if (normalized == null) {
    return null
  }

  return map?.nodes.find((node) => node.networkAddress === normalized) ?? null
}

export function networkMapLinksForDevice(
  map: NetworkMapValue | null | undefined,
  ieeeAddr: string,
) {
  return (map?.links ?? []).filter(
    (link) => link.source.ieeeAddr === ieeeAddr || link.target.ieeeAddr === ieeeAddr,
  )
}

export function networkMapPeerIeee(link: NetworkMapLink, ieeeAddr: string) {
  if (link.source.ieeeAddr === ieeeAddr) {
    return link.target.ieeeAddr
  }

  return link.source.ieeeAddr
}

export function networkMapParentCandidate(map: NetworkMapValue | null | undefined, device: Device) {
  if (device.type !== 'EndDevice') {
    return null
  }

  const nodesByIeee = new Map((map?.nodes ?? []).map((node) => [node.ieeeAddr, node]))

  return (
    networkMapLinksForDevice(map, device.ieee_address)
      .map((link) => {
        const peerIeee = networkMapPeerIeee(link, device.ieee_address)
        const peerNode = nodesByIeee.get(peerIeee) ?? null

        return {
          link,
          peerNode,
        }
      })
      .filter((item) => item.peerNode?.type === 'Router' || item.peerNode?.type === 'Coordinator')
      .sort((a, b) => (b.link.linkquality ?? -1) - (a.link.linkquality ?? -1))[0] ?? null
  )
}

export function nodeFill(type: string) {
  if (type === 'Coordinator') {
    return '#f43f5e'
  }

  if (type === 'Router') {
    return '#0ea5e9'
  }

  return '#94a3b8'
}

export function edgeStroke(linkquality?: number) {
  if (typeof linkquality !== 'number') {
    return '#94a3b8'
  }

  if (linkquality >= 200) {
    return '#10b981'
  }

  if (linkquality >= 120) {
    return '#0ea5e9'
  }

  if (linkquality >= 60) {
    return '#f59e0b'
  }

  return '#f43f5e'
}

export function createSeedLayouts(nodes: NetworkMapNode[]) {
  const coordinator = nodes.find((node) => node.type === 'Coordinator')

  return {
    nodes: coordinator
      ? {
          [coordinator.ieeeAddr]: {
            x: 0,
            y: 0,
            fixed: true,
          },
        }
      : {},
  }
}
