import type { Expose } from '@/types/z2m'

const ENDPOINT_SUFFIXES = new Set(['left', 'right', 'center', 'top', 'bottom'])

const FEATURE_ICONS: Record<string, string> = {
  state: 'i-lucide-power',
  state_left: 'i-lucide-toggle-left',
  state_right: 'i-lucide-toggle-right',
  state_center: 'i-lucide-toggle-right',
  battery: 'i-lucide-battery',
  battery_low: 'i-lucide-battery-warning',
  battery_state: 'i-lucide-battery',
  linkquality: 'i-lucide-signal',
  temperature: 'i-lucide-thermometer',
  device_temperature: 'i-lucide-thermometer',
  local_temperature: 'i-lucide-thermometer',
  local_temperature_calibration: 'i-lucide-thermometer',
  current_heating_setpoint: 'i-lucide-thermometer-sun',
  occupied_heating_setpoint: 'i-lucide-thermometer-sun',
  humidity: 'i-lucide-droplets',
  soil_moisture: 'i-lucide-droplets',
  pressure: 'i-lucide-gauge',
  occupancy: 'i-lucide-person-standing',
  presence: 'i-lucide-person-standing',
  motion: 'i-lucide-person-standing',
  contact: 'i-lucide-door-open',
  smoke: 'i-lucide-cloud-alert',
  gas: 'i-lucide-cloud-alert',
  carbon_monoxide: 'i-lucide-cloud-alert',
  co2: 'i-lucide-cloud-alert',
  voc: 'i-lucide-wind',
  pm25: 'i-lucide-wind',
  water_leak: 'i-lucide-droplet',
  tamper: 'i-lucide-shield-alert',
  vibration: 'i-lucide-vibrate',
  action: 'i-lucide-zap',
  side: 'i-lucide-box',
  operation_mode: 'i-lucide-sliders-horizontal',
  operating_mode: 'i-lucide-sliders-horizontal',
  mode: 'i-lucide-sliders-horizontal',
  preset: 'i-lucide-sliders-horizontal',
  preset_mode: 'i-lucide-sliders-horizontal',
  system_mode: 'i-lucide-thermometer',
  fan_mode: 'i-lucide-fan',
  power_on_behavior: 'i-lucide-power',
  switch_type: 'i-lucide-toggle-left',
  switch_type_button: 'i-lucide-toggle-left',
  indicator_mode: 'i-lucide-lightbulb',
  indicator_light: 'i-lucide-lightbulb',
  flip_indicator_light: 'i-lucide-lightbulb',
  child_lock: 'i-lucide-lock',
  brightness: 'i-lucide-sun-medium',
  illuminance: 'i-lucide-sun',
  illuminance_lux: 'i-lucide-sun',
  color_temp: 'i-lucide-lamp',
  color_mode: 'i-lucide-palette',
  color_xy: 'i-lucide-palette',
  color_hs: 'i-lucide-palette',
  current: 'i-lucide-activity',
  voltage: 'i-lucide-bolt',
  power: 'i-lucide-plug',
  energy: 'i-lucide-chart-column',
  power_outage_count: 'i-lucide-timer-reset',
  power_outage_memory: 'i-lucide-memory-stick',
  countdown: 'i-lucide-timer',
  position: 'i-lucide-square-dashed-bottom',
  tilt: 'i-lucide-axis-3d',
  lock: 'i-lucide-lock',
  lock_state: 'i-lucide-lock',
  update: 'i-lucide-download',
}

const FEATURE_ICON_RULES: Array<{ pattern: RegExp; icon: string }> = [
  { pattern: /battery/, icon: 'i-lucide-battery' },
  {
    pattern: /(temperature|heating_setpoint|cooling_setpoint|thermostat)/,
    icon: 'i-lucide-thermometer',
  },
  { pattern: /(humidity|moisture)/, icon: 'i-lucide-droplets' },
  { pattern: /pressure/, icon: 'i-lucide-gauge' },
  { pattern: /(occupancy|presence|motion|moving)/, icon: 'i-lucide-person-standing' },
  { pattern: /(contact|door|window)/, icon: 'i-lucide-door-open' },
  { pattern: /(water|leak)/, icon: 'i-lucide-droplet' },
  { pattern: /(smoke|gas|carbon_monoxide|co2|alarm)/, icon: 'i-lucide-cloud-alert' },
  { pattern: /(tamper|alarm)/, icon: 'i-lucide-shield-alert' },
  { pattern: /(action|scene|click|button)/, icon: 'i-lucide-zap' },
  { pattern: /(lock|child_lock)/, icon: 'i-lucide-lock' },
  { pattern: /(brightness|illuminance|light|lux)/, icon: 'i-lucide-sun' },
  { pattern: /color/, icon: 'i-lucide-palette' },
  { pattern: /(voltage|volt)/, icon: 'i-lucide-bolt' },
  { pattern: /(current|amp)/, icon: 'i-lucide-activity' },
  { pattern: /(power|outlet|plug)/, icon: 'i-lucide-plug' },
  { pattern: /(energy|consumption)/, icon: 'i-lucide-chart-column' },
  { pattern: /(mode|preset|behavior)/, icon: 'i-lucide-sliders-horizontal' },
  { pattern: /fan/, icon: 'i-lucide-fan' },
  { pattern: /(countdown|timer)/, icon: 'i-lucide-timer' },
  { pattern: /(position|cover|curtain|blind|shade)/, icon: 'i-lucide-blinds' },
  { pattern: /tilt/, icon: 'i-lucide-axis-3d' },
  { pattern: /(switch|state)/, icon: 'i-lucide-toggle-left' },
  { pattern: /update/, icon: 'i-lucide-download' },
]

export function featureTitle(expose: Expose) {
  return expose.label || expose.name || expose.property || expose.type
}

export function featureKey(expose: Expose) {
  return expose.property || expose.name || expose.type
}

export function featureEndpoint(expose: Expose) {
  const key = featureKey(expose)
  const parts = key.split('_')
  const suffix = parts.at(-1)?.toLowerCase()

  return suffix && ENDPOINT_SUFFIXES.has(suffix) ? suffix : null
}

export function featureBaseKey(expose: Expose) {
  const endpoint = featureEndpoint(expose)
  const key = featureKey(expose)

  return endpoint ? key.slice(0, -(endpoint.length + 1)) : key
}

export function featureSubtitle(expose: Expose) {
  if (!expose.label) {
    return null
  }

  return featureKey(expose)
}

export function featureDescription(expose: Expose) {
  return expose.description || null
}

export function featureIcon(expose: Expose) {
  const key = featureBaseKey(expose).toLowerCase()
  if (FEATURE_ICONS[key]) {
    return FEATURE_ICONS[key]
  }

  const matchedRule = FEATURE_ICON_RULES.find((rule) => rule.pattern.test(key))
  return matchedRule?.icon || 'i-lucide-settings-2'
}
