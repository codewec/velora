import type { LogEntry } from '@/stores/logs'
import { formatBrowserDateTime } from '@/utils/dateTime'

export interface ParsedTopicPayload {
  topic: string
  payload: string
}

export interface ParsedBridgeLoggingPayload {
  level?: string
  message: string
  deviceName: string | null
  shortReason: string | null
}

export function compactJson(value: unknown) {
  return JSON.stringify(value)
}

export function prettyJson(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

export function parseTopicPayload(raw: string): ParsedTopicPayload | null {
  try {
    const parsed = JSON.parse(raw) as { topic?: unknown; payload?: unknown }

    if (typeof parsed.topic !== 'string') {
      return null
    }

    return {
      topic: parsed.topic,
      payload: typeof parsed.payload === 'string' ? parsed.payload : compactJson(parsed.payload),
    }
  } catch {
    return null
  }
}

export function parseBridgeLoggingPayload(raw: string): ParsedBridgeLoggingPayload | null {
  try {
    const parsed = JSON.parse(raw) as { level?: unknown; message?: unknown }

    if (typeof parsed.message !== 'string') {
      return null
    }

    const deviceName =
      parsed.message.match(/to '([^']+)' failed/i)?.[1] ??
      parsed.message.match(/topic 'zigbee2mqtt\/([^']+)'/i)?.[1] ??
      parsed.message.match(/from '([^']+)'/i)?.[1] ??
      null
    const shortReason =
      parsed.message.match(/\(([^()]+)\)\s*'?$/)?.[1] ??
      parsed.message.match(/failed:\s*'?(.*)$/i)?.[1] ??
      null

    return {
      level: typeof parsed.level === 'string' ? parsed.level : undefined,
      message: parsed.message,
      deviceName,
      shortReason: shortReason?.trim() || null,
    }
  } catch {
    return null
  }
}

export function rawNamespace(kind: string) {
  switch (kind) {
    case 'tx':
    case 'rx':
      return 'mqtt'
    case 'transport':
      return 'frontend'
    case 'bridge':
      return 'bridge'
    case 'event':
      return 'event'
    case 'device':
      return 'device'
    default:
      return 'app'
  }
}

export function rawAction(entry: LogEntry) {
  const topicPayload = parseTopicPayload(entry.raw)
  const bridgeLoggingPayload = parseBridgeLoggingPayload(entry.raw)

  if (entry.kind === 'tx' && topicPayload) {
    return `MQTT publish: topic '${topicPayload.topic}', payload '${topicPayload.payload}'`
  }

  if ((entry.kind === 'rx' || entry.kind === 'device') && topicPayload) {
    return `MQTT receive: topic '${topicPayload.topic}', payload '${topicPayload.payload}'`
  }

  if (entry.kind === 'bridge' && topicPayload) {
    return `Bridge message: topic '${topicPayload.topic}', payload '${topicPayload.payload}'`
  }

  if (entry.kind === 'bridge' && bridgeLoggingPayload) {
    return bridgeLoggingPayload.message
  }

  const compactRaw = entry.raw.replaceAll('\n', ' ').replace(/\s+/g, ' ').trim()
  return compactRaw ? `${entry.summary}: ${compactRaw}` : entry.summary
}

export function rawLine(entry: LogEntry, lineNumber?: number) {
  const line = `[${formatBrowserDateTime(entry.time)}] z2m:${rawNamespace(entry.kind)}: ${rawAction(entry)}`
  return typeof lineNumber === 'number' ? `${lineNumber} ${line}` : line
}

export function compactDetails(entry: LogEntry) {
  const topicPayload = parseTopicPayload(entry.raw)
  const bridgeLoggingPayload = parseBridgeLoggingPayload(entry.raw)

  if (topicPayload) {
    return `topic '${topicPayload.topic}' · payload '${topicPayload.payload}'`
  }

  if (bridgeLoggingPayload) {
    return bridgeLoggingPayload.message
  }

  const compactRaw = entry.raw.replaceAll('\n', ' ').replace(/\s+/g, ' ').trim()
  return compactRaw || entry.summary
}
