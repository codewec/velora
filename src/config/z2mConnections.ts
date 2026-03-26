import { getVeloraRuntimeConfig } from '@/config/runtimeConfig'

export type Z2MConnectionMode = 'ha-ingress' | 'direct' | 'proxy'

export interface Z2MConnectionConfig {
  id: string
  label: string
  mode: Z2MConnectionMode
  url: string
}

function normalizeConnectionConfig(connection: Z2MConnectionConfig): Z2MConnectionConfig {
  // Proxy connections must stay relative so the same bundle works both from the
  // standalone root URL and from a Home Assistant ingress subpath. Absolute
  // `/api/...` paths would bypass the ingress prefix and hit HA root instead.
  if (connection.mode === 'proxy' && connection.url.startsWith('/')) {
    return {
      ...connection,
      url: `.${connection.url}`,
    }
  }

  return connection
}

function isConnectionConfig(value: unknown): value is Z2MConnectionConfig {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.label === 'string' &&
    typeof candidate.mode === 'string' &&
    typeof candidate.url === 'string'
  )
}

function parseConnectionsEnv(): Z2MConnectionConfig[] {
  const runtimeConfig = getVeloraRuntimeConfig()
  const runtimeConnections = runtimeConfig.connections

  if (Array.isArray(runtimeConnections)) {
    return runtimeConnections.filter(isConnectionConfig).map(normalizeConnectionConfig)
  }

  if (typeof runtimeConfig.apiUrl === 'string' && runtimeConfig.apiUrl) {
    return [
      normalizeConnectionConfig({
        id: 'default',
        label: 'Default',
        mode: 'direct',
        url: runtimeConfig.apiUrl,
      }),
    ]
  }

  const raw = import.meta.env.VITE_Z2M_CONNECTIONS

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown

      if (Array.isArray(parsed)) {
        return parsed.filter(isConnectionConfig).map(normalizeConnectionConfig)
      }
    } catch {
      return []
    }
  }

  if (import.meta.env.VITE_Z2M_API_URL) {
    return [
      normalizeConnectionConfig({
        id: 'default',
        label: 'Default',
        mode: 'direct',
        url: import.meta.env.VITE_Z2M_API_URL,
      }),
    ]
  }

  return []
}

const connectionConfigs = parseConnectionsEnv()

export function getZ2MConnectionConfigs() {
  return connectionConfigs
}

export function getDefaultConnectionId() {
  return connectionConfigs[0]?.id ?? 'default'
}

export function getZ2MConnectionConfig(connectionId: string) {
  return connectionConfigs.find((connection) => connection.id === connectionId) ?? null
}
