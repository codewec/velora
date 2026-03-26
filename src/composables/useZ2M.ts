import { readonly, ref, type Ref } from 'vue'

import { getZ2MConnectionConfig } from '@/config/z2mConnections'
import { i18n } from '@/i18n'
import { useLogsStore } from '@/stores/logs'
import type { Z2MMessage } from '@/types/z2m'

type MessageHandler = (message: Z2MMessage) => void

const RECONNECT_DELAY_MS = 3000

interface WebSocketMetrics {
  messagesSent: number
  bytesSent: number
  messagesReceived: number
  messagesBridge: number
  messagesDevice: number
  bytesReceived: number
  reconnects: number
  lastMessageTs: number
  pendingRequests: number
}

interface Z2MClient {
  connect: () => void
  disconnect: () => void
  send: (topic: string, payload: unknown) => boolean
  subscribe: (handler: MessageHandler) => () => void
  isConnected: Readonly<Ref<boolean>>
  isReconnecting: Readonly<Ref<boolean>>
  metrics: Readonly<Ref<WebSocketMetrics>>
  logs: Readonly<Ref<readonly Z2MLogEntry[]>>
  clearLogs: () => void
}

interface Z2MLogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
}

const clients = new Map<string, Z2MClient>()

function normalizeMessage(data: unknown): Z2MMessage | null {
  if (typeof data !== 'string') {
    return null
  }

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>
    const topic = typeof parsed.topic === 'string' ? parsed.topic : null
    const payload = parsed.payload ?? parsed.message

    if (!topic) {
      return null
    }

    return { topic, payload }
  } catch {
    return null
  }
}

function createClient(connectionId: string, url: string): Z2MClient {
  const isConnected = ref(false)
  const isReconnecting = ref(false)
  const metrics = ref<WebSocketMetrics>({
    messagesSent: 0,
    bytesSent: 0,
    messagesReceived: 0,
    messagesBridge: 0,
    messagesDevice: 0,
    bytesReceived: 0,
    reconnects: 0,
    lastMessageTs: 0,
    pendingRequests: 0,
  })
  const logs = ref<Z2MLogEntry[]>([])
  const handlers = new Set<MessageHandler>()
  const logsStore = useLogsStore()

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let shouldReconnect = false
  function pushLog(level: Z2MLogEntry['level'], message: string) {
    logs.value = [
      {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
      },
      ...logs.value,
    ].slice(0, 200)
  }

  function pushStoreLog(level: 'info' | 'warning' | 'error' | 'debug', kind: 'transport' | 'tx' | 'rx', summary: string, raw: string) {
    logsStore.addLog(connectionId, {
      level,
      kind,
      summary,
      raw,
    })
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function cleanupSocket(activeSocket?: WebSocket | null) {
    if (activeSocket) {
      activeSocket.onopen = null
      activeSocket.onclose = null
      activeSocket.onerror = null
      activeSocket.onmessage = null
    }

    if (!activeSocket || socket === activeSocket) {
      socket = null
    }
  }

  function scheduleReconnect() {
    if (!shouldReconnect || reconnectTimer) {
      return
    }

    isReconnecting.value = true
    metrics.value = {
      ...metrics.value,
      reconnects: metrics.value.reconnects + 1,
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, RECONNECT_DELAY_MS)
  }

  function connect() {
    if (socket || !url) {
      return
    }

    pushLog('info', i18n.global.t('logsPage.connectingTo', { url }))
    pushStoreLog('info', 'transport', i18n.global.t('logsPage.connecting'), url)
    clearReconnectTimer()
    shouldReconnect = true

    const activeSocket = new WebSocket(url)
    socket = activeSocket

    activeSocket.onopen = () => {
      isConnected.value = true
      isReconnecting.value = false
      pushLog('info', i18n.global.t('logsPage.connectionEstablished'))
      pushStoreLog('info', 'transport', i18n.global.t('logsPage.connectionEstablished'), url)
    }

    activeSocket.onmessage = (event) => {
      const message = normalizeMessage(event.data)

      if (!message) {
        return
      }

      const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data)
      metrics.value = {
        ...metrics.value,
        messagesReceived: metrics.value.messagesReceived + 1,
        bytesReceived: metrics.value.bytesReceived + raw.length,
        lastMessageTs: Date.now(),
        messagesBridge: metrics.value.messagesBridge + (message.topic.startsWith('bridge/') ? 1 : 0),
        messagesDevice: metrics.value.messagesDevice + (message.topic.startsWith('bridge/') ? 0 : 1),
      }

      pushStoreLog('debug', 'rx', i18n.global.t('logsPage.received', { topic: message.topic }), JSON.stringify(message, null, 2))

      for (const handler of handlers) {
        handler(message)
      }
    }

    activeSocket.onerror = () => {
      isConnected.value = false
      pushLog('error', i18n.global.t('logsPage.websocketError'))
      pushStoreLog('error', 'transport', i18n.global.t('logsPage.websocketError'), url)
      scheduleReconnect()
    }

    activeSocket.onclose = (event) => {
      isConnected.value = false
      pushLog(
        event.code === 1000 ? 'info' : 'warning',
        event.reason
          ? i18n.global.t('logsPage.connectionClosedWithReason', { code: event.code, reason: event.reason })
          : i18n.global.t('logsPage.connectionClosed', { code: event.code }),
      )
      pushStoreLog(
        event.code === 1000 ? 'info' : 'warning',
        'transport',
        i18n.global.t('logsPage.connectionClosed', { code: event.code }),
        JSON.stringify({ code: event.code, reason: event.reason || null }, null, 2),
      )
      cleanupSocket(activeSocket)
      scheduleReconnect()
    }
  }

  function disconnect() {
    shouldReconnect = false
    isConnected.value = false
    isReconnecting.value = false
    clearReconnectTimer()

    if (!socket) {
      return
    }

    const activeSocket = socket
    cleanupSocket(activeSocket)
    pushLog('info', i18n.global.t('logsPage.connectionClosedByClient'))
    pushStoreLog('info', 'transport', i18n.global.t('logsPage.connectionClosedByClient'), url)
    activeSocket.close()
  }

  function send(topic: string, payload: unknown) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      pushLog('warning', i18n.global.t('logsPage.sendSkippedClosed', { topic }))
      pushStoreLog('warning', 'tx', i18n.global.t('logsPage.sendSkipped', { topic }), JSON.stringify({ topic, payload }, null, 2))
      return false
    }

    socket.send(JSON.stringify({ topic, payload }))
    const raw = JSON.stringify({ topic, payload })
    metrics.value = {
      ...metrics.value,
      messagesSent: metrics.value.messagesSent + 1,
      bytesSent: metrics.value.bytesSent + raw.length,
    }
    pushLog('info', i18n.global.t('logsPage.sent', { topic }))
    pushStoreLog('info', 'tx', i18n.global.t('logsPage.sent', { topic }), JSON.stringify({ topic, payload }, null, 2))
    return true
  }

  function subscribe(handler: MessageHandler) {
    handlers.add(handler)

    return () => {
      handlers.delete(handler)
    }
  }

  return {
    connect,
    disconnect,
    send,
    subscribe,
    isConnected: readonly(isConnected),
    isReconnecting: readonly(isReconnecting),
    metrics: readonly(metrics),
    logs: readonly(logs),
    clearLogs: () => {
      logs.value = []
    },
  }
}

export function useZ2M(connectionId: string) {
  const existing = clients.get(connectionId)

  if (existing) {
    return existing
  }

  const connection = getZ2MConnectionConfig(connectionId)
  const client = createClient(connectionId, connection?.url ?? '')

  clients.set(connectionId, client)
  return client
}
