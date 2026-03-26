export interface Z2MMessage {
  topic: string
  payload: unknown
}

export interface RoutedZ2MMessage extends Z2MMessage {
  connectionId: string
}

export interface DeviceDefinition {
  model: string
  vendor?: string
  description?: string
  exposes?: Expose[]
}

export interface Device {
  ieee_address: string
  friendly_name: string
  type: string
  interview_completed?: boolean
  interviewing?: boolean
  manufacturer?: string
  model_id?: string
  power_source?: string
  software_build_id?: string
  date_code?: string
  network_address?: number
  supported?: boolean
  disabled?: boolean
  description?: string
  definition: DeviceDefinition | null
}

export type DeviceStateValue = string | number | boolean | null
export type DeviceState = Record<string, DeviceStateValue>

interface ExposeBase {
  type: string
  name?: string
  property?: string
  label?: string
  description?: string
  access?: number
  unit?: string
  category?: string
  features?: Expose[]
}

export interface BinaryExpose extends ExposeBase {
  type: 'binary'
  value_on?: DeviceStateValue
  value_off?: DeviceStateValue
  value_toggle?: DeviceStateValue
}

export interface NumericExpose extends ExposeBase {
  type: 'numeric'
  value_min?: number
  value_max?: number
  value_step?: number
  preset?: string
}

export interface EnumExpose extends ExposeBase {
  type: 'enum'
  values: string[]
}

export interface TextExpose extends ExposeBase {
  type: 'text'
}

export interface CompositeExpose extends ExposeBase {
  type: 'light' | 'switch' | 'cover' | 'lock' | 'fan' | 'climate' | 'composite' | string
  features?: Expose[]
}

export type PrimitiveExpose = BinaryExpose | NumericExpose | EnumExpose | TextExpose
export type Expose = PrimitiveExpose | CompositeExpose

export interface BridgeInfo {
  version?: string
  commit?: string
  permit_join?: boolean
  permit_join_end?: number
  restart_required?: boolean
  zigbee_herdsman_converters?: {
    version?: string
  }
  zigbee_herdsman?: {
    version?: string
  }
  os?: {
    version?: string
    release?: string
    node_version?: string
    cpus?: number
    memory_mb?: number
  }
  mqtt?: {
    server?: string
    version?: string
  }
  coordinator?: {
    type?: string
    ieee_address?: string
    meta?: Record<string, unknown> & {
      revision?: string
    }
  }
  config?: {
    homeassistant?: {
      enabled?: boolean
    }
    mqtt?: {
      server?: string
      base_topic?: string
    }
  }
  [key: string]: unknown
}

export interface BridgeHealthDevice {
  messages?: number
  messages_per_sec?: number
  leave_count?: number
  network_address_changes?: number
  [key: string]: unknown
}

export interface BridgeHealth {
  response_time: number
  os: {
    load_average: number[]
    memory_used_mb: number
    memory_percent: number
  }
  process: {
    uptime_sec: number
    memory_used_mb: number
    memory_percent: number
  }
  mqtt: {
    connected: boolean
    queued: number
    received: number
    published: number
  }
  devices: Record<string, BridgeHealthDevice>
}

export interface BridgePermitJoinResponse {
  status?: string
  data?: {
    value?: boolean
    time?: number
    device?: string
    friendly_name?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface BridgeLoggingMessage {
  level: 'error' | 'warning' | 'info' | 'debug' | string
  message: string
  namespace?: string
  [key: string]: unknown
}

export interface NetworkMapNode {
  ieeeAddr: string
  friendlyName: string
  type: string
  networkAddress?: number
  lastSeen?: number
  isolated?: boolean
}

export interface NetworkMapLinkEndpoint {
  ieeeAddr: string
  networkAddress?: number
}

export interface NetworkMapRoute {
  destinationAddress?: number
  nextHop?: number
  status?: string
}

export interface NetworkMapLink {
  source: NetworkMapLinkEndpoint
  target: NetworkMapLinkEndpoint
  linkquality?: number
  routes?: NetworkMapRoute[]
}

export interface NetworkMapValue {
  nodes: NetworkMapNode[]
  links: NetworkMapLink[]
}

export interface BridgeNetworkMapResponse {
  status?: 'ok' | 'error' | string
  error?: string
  transaction?: string | number
  data?: {
    type?: 'raw' | 'graphviz' | 'plantuml' | string
    routes?: boolean
    value?: NetworkMapValue | string
  }
}

export interface BridgeEventBase {
  type: string
  data?: Record<string, unknown>
}

export interface InterviewSession {
  ieeeAddress: string
  friendlyName: string
  status: 'joined' | 'interview_started' | 'successful' | 'failed'
  startedAt: number
  finishedAt?: number
  error?: string
}

export interface BridgeDeviceInterviewEvent extends BridgeEventBase {
  type: 'device_interview'
  data?: {
    friendly_name?: string
    ieee_address?: string
    status?: InterviewSession['status'] | 'started'
    error?: string
    supported?: boolean
  }
}

export interface BridgeDeviceJoinedEvent extends BridgeEventBase {
  type: 'device_joined'
  data?: {
    friendly_name?: string
    ieee_address?: string
    error?: string
  }
}

export type BridgeEvent = BridgeDeviceInterviewEvent | BridgeDeviceJoinedEvent | BridgeEventBase

export function isBinaryExpose(expose: Expose): expose is BinaryExpose {
  return expose.type === 'binary'
}

export function isNumericExpose(expose: Expose): expose is NumericExpose {
  return expose.type === 'numeric'
}

export function isEnumExpose(expose: Expose): expose is EnumExpose {
  return expose.type === 'enum'
}

export function isTextExpose(expose: Expose): expose is TextExpose {
  return expose.type === 'text'
}
