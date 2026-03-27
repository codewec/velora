import type { ComposerTranslation } from 'vue-i18n'

import type { Device } from '@/types/z2m'
import { formatBrowserDateTime } from '@/utils/dateTime'

type DeviceCardBadge = {
  label: string
  tooltip: string
  icon: string
  iconClass: string
}

export function deviceTypeBadge(device: Device, t: ComposerTranslation): DeviceCardBadge {
  const type = device.type.toLowerCase()

  if (type === 'router') {
    return {
      label: t('deviceCard.router'),
      icon: 'lucide:router',
      tooltip: t('deviceCard.router'),
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  if (type === 'enddevice') {
    return {
      label: t('deviceCard.endDevice'),
      icon: 'lucide:smartphone-nfc',
      tooltip: t('deviceCard.endDevice'),
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  if (type === 'coordinator') {
    return {
      label: t('deviceCard.coordinator'),
      icon: 'i-lucide-waypoints',
      tooltip: t('deviceCard.coordinator'),
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  return {
    label: device.type,
    icon: 'i-lucide-cpu',
    tooltip: device.type,
    iconClass: 'text-slate-500 dark:text-slate-400',
  }
}

export function staleThresholdMsForDevice(device: Device) {
  const powerSource = device.power_source?.toLowerCase() ?? ''
  return powerSource.includes('mains') ? 10 * 60 * 1000 : 60 * 60 * 1000
}

export function formatLastUpdateTooltip(timestamp: number, now: number, t: ComposerTranslation) {
  const elapsedMs = now - timestamp

  if (elapsedMs < 60000) {
    return t('deviceCard.lastUpdateJustNow')
  }

  if (elapsedMs >= 24 * 60 * 60 * 1000) {
    return t('deviceCard.lastUpdateAt', {
      value: formatBrowserDateTime(timestamp),
    })
  }

  const totalMinutes = Math.round(elapsedMs / 60000)

  if (totalMinutes < 60) {
    return t('deviceCard.lastUpdateMinutes', { count: totalMinutes })
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (minutes === 0) {
    return t('deviceCard.lastUpdateHours', { hours })
  }

  return t('deviceCard.lastUpdateHoursMinutes', { hours, minutes })
}

export function formatLastSeenLabel(timestamp: number, now: number, t: ComposerTranslation) {
  const elapsedMs = now - timestamp

  if (elapsedMs < 60000) {
    return t('deviceCard.now')
  }

  const minutesAgo = Math.round(elapsedMs / 60000)

  if (minutesAgo < 60) {
    return `${minutesAgo} ${t('deviceCard.minuteShort')}`
  }

  const hoursAgo = Math.round(minutesAgo / 60)
  if (hoursAgo < 24) {
    return `${hoursAgo} ${t('deviceCard.hourShort')}`
  }

  const daysAgo = Math.round(hoursAgo / 24)
  return `${daysAgo} ${t('deviceCard.dayShort')}`
}

export function signalBadge(linkquality: unknown, t: ComposerTranslation): DeviceCardBadge | null {
  if (typeof linkquality !== 'number') {
    return null
  }

  if (linkquality >= 180) {
    return {
      label: String(linkquality),
      tooltip: t('deviceCard.signalQuality', { value: linkquality }),
      icon: 'i-lucide-signal-high',
      iconClass: 'text-emerald-500 dark:text-emerald-400',
    }
  }

  if (linkquality >= 120) {
    return {
      label: String(linkquality),
      tooltip: t('deviceCard.signalQuality', { value: linkquality }),
      icon: 'i-lucide-signal-medium',
      iconClass: 'text-sky-500 dark:text-sky-400',
    }
  }

  if (linkquality >= 60) {
    return {
      label: String(linkquality),
      tooltip: t('deviceCard.signalQuality', { value: linkquality }),
      icon: 'i-lucide-signal-low',
      iconClass: 'text-amber-500 dark:text-amber-400',
    }
  }

  return {
    label: String(linkquality),
    tooltip: t('deviceCard.signalQuality', { value: linkquality }),
    icon: 'i-lucide-signal-zero',
    iconClass: 'text-rose-500 dark:text-rose-400',
  }
}

export function powerBadge(
  device: Device,
  battery: unknown,
  batteryLow: unknown,
  t: ComposerTranslation,
): DeviceCardBadge | null {
  const powerSource = device.power_source?.toLowerCase()

  if (powerSource?.includes('mains')) {
    return {
      label: t('deviceCard.mains'),
      tooltip: t('deviceCard.poweredByMains'),
      icon: 'i-lucide-plug',
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  if (typeof battery === 'number') {
    if (battery >= 75) {
      return {
        label: `${battery}%`,
        tooltip: t('deviceCard.batteryLevel', { value: battery }),
        icon: 'i-lucide-battery-full',
        iconClass: 'text-emerald-500 dark:text-emerald-400',
      }
    }

    if (battery >= 40) {
      return {
        label: `${battery}%`,
        tooltip: t('deviceCard.batteryLevel', { value: battery }),
        icon: 'i-lucide-battery-medium',
        iconClass: 'text-amber-500 dark:text-amber-400',
      }
    }

    return {
      label: `${battery}%`,
      tooltip: t('deviceCard.batteryLevel', { value: battery }),
      icon: 'i-lucide-battery-low',
      iconClass: 'text-rose-500 dark:text-rose-400',
    }
  }

  if (powerSource?.includes('battery')) {
    return {
      label: batteryLow === true ? t('deviceCard.low') : t('deviceCard.ok'),
      tooltip: t('deviceCard.batteryState', {
        value: batteryLow === true ? t('deviceCard.lowLower') : t('deviceCard.okLower'),
      }),
      icon: batteryLow === true ? 'i-lucide-battery-warning' : 'i-lucide-battery',
      iconClass:
        batteryLow === true
          ? 'text-rose-500 dark:text-rose-400'
          : 'text-emerald-500 dark:text-emerald-400',
    }
  }

  if (batteryLow === true) {
    return {
      label: t('deviceCard.low'),
      tooltip: t('deviceCard.batteryState', { value: t('deviceCard.lowLower') }),
      icon: 'i-lucide-battery-warning',
      iconClass: 'text-rose-500 dark:text-rose-400',
    }
  }

  return device.power_source
    ? {
        label: device.power_source,
        tooltip: t('deviceCard.powerSource', { value: device.power_source }),
        icon: 'i-lucide-battery',
        iconClass: 'text-slate-500 dark:text-slate-400',
      }
    : null
}
