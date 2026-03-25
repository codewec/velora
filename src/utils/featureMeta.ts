import type { Expose } from '@/types/z2m'

const FEATURE_ICONS: Record<string, string> = {
  state: 'i-lucide-power',
  battery: 'i-lucide-battery',
  battery_low: 'i-lucide-battery-warning',
  battery_state: 'i-lucide-battery',
  linkquality: 'i-lucide-signal',
  temperature: 'i-lucide-thermometer',
  humidity: 'i-lucide-droplets',
  pressure: 'i-lucide-gauge',
  occupancy: 'i-lucide-person-standing',
  contact: 'i-lucide-door-open',
  smoke: 'i-lucide-cloud-alert',
  water_leak: 'i-lucide-droplet',
  tamper: 'i-lucide-shield-alert',
  action: 'i-lucide-zap',
  side: 'i-lucide-box',
  operation_mode: 'i-lucide-sliders-horizontal',
  operating_mode: 'i-lucide-sliders-horizontal',
  mode: 'i-lucide-sliders-horizontal',
  power_on_behavior: 'i-lucide-power',
  brightness: 'i-lucide-sun-medium',
  color_temp: 'i-lucide-lamp',
  current: 'i-lucide-activity',
  voltage: 'i-lucide-bolt',
  power: 'i-lucide-plug',
  energy: 'i-lucide-chart-column',
  position: 'i-lucide-square-dashed-bottom',
  tilt: 'i-lucide-axis-3d',
  lock: 'i-lucide-lock',
  lock_state: 'i-lucide-lock',
  fan_mode: 'i-lucide-fan',
  system_mode: 'i-lucide-thermometer',
}

export function featureTitle(expose: Expose) {
  return expose.label || expose.name || expose.property || expose.type
}

export function featureKey(expose: Expose) {
  return expose.property || expose.name || expose.type
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
  const key = featureKey(expose).toLowerCase()
  return FEATURE_ICONS[key] || 'i-lucide-settings-2'
}
