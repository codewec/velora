<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { useDevicesStore } from '@/stores/devices'
import type { Device } from '@/types/z2m'

const STALE_THRESHOLD_MAINS_MS = 10 * 60 * 1000
const STALE_THRESHOLD_BATTERY_MS = 60 * 60 * 1000

const props = defineProps<{
  connectionId: string
  device: Device
  state?: Record<string, unknown>
}>()

const imageFailed = ref(false)
const devicesStore = useDevicesStore()
const now = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null

const imageUrl = computed(() => {
  const model = props.device.definition?.model
  return model
    ? `https://www.zigbee2mqtt.io/images/devices/${model.replaceAll('/', '-')}.png`
    : null
})

const isOnline = computed(() => props.state?.availability !== 'offline')
const lastSeenAt = computed(() =>
  devicesStore.deviceLastSeen(props.connectionId, props.device.friendly_name),
)
const reportedLastSeenAt = computed(() =>
  devicesStore.deviceReportedLastSeen(props.connectionId, props.device.friendly_name),
)

const staleThresholdMs = computed(() => {
  const powerSource = props.device.power_source?.toLowerCase() ?? ''
  return powerSource.includes('mains') ? STALE_THRESHOLD_MAINS_MS : STALE_THRESHOLD_BATTERY_MS
})

const isStale = computed(() => {
  if (!lastSeenAt.value || !isOnline.value) {
    return false
  }

  return now.value - lastSeenAt.value > staleThresholdMs.value
})

const staleTooltip = computed(() => {
  if (!lastSeenAt.value) {
    return 'No recent device updates'
  }

  const minutesAgo = Math.max(1, Math.round((now.value - lastSeenAt.value) / 60000))
  return `Last update ${minutesAgo} minute${minutesAgo === 1 ? '' : 's'} ago`
})

const lastSeenLabel = computed(() => {
  if (!reportedLastSeenAt.value || isStale.value) {
    return null
  }

  const minutesAgo = Math.max(1, Math.round((now.value - reportedLastSeenAt.value) / 60000))

  if (minutesAgo < 60) {
    return `${minutesAgo}m`
  }

  const hoursAgo = Math.round(minutesAgo / 60)
  if (hoursAgo < 24) {
    return `${hoursAgo}h`
  }

  const daysAgo = Math.round(hoursAgo / 24)
  return `${daysAgo}d`
})

const description = computed(
  () => props.device.description || props.device.definition?.description || null,
)

const signalBadge = computed(() => {
  const linkquality = props.state?.linkquality

  if (typeof linkquality !== 'number') {
    return null
  }

  if (linkquality >= 180) {
    return {
      label: String(linkquality),
      tooltip: `Signal quality: ${linkquality}`,
      icon: 'i-lucide-signal-high',
      iconClass: 'text-emerald-500 dark:text-emerald-400',
    }
  }

  if (linkquality >= 120) {
    return {
      label: String(linkquality),
      tooltip: `Signal quality: ${linkquality}`,
      icon: 'i-lucide-signal-medium',
      iconClass: 'text-sky-500 dark:text-sky-400',
    }
  }

  if (linkquality >= 60) {
    return {
      label: String(linkquality),
      tooltip: `Signal quality: ${linkquality}`,
      icon: 'i-lucide-signal-low',
      iconClass: 'text-amber-500 dark:text-amber-400',
    }
  }

  return {
    label: String(linkquality),
    tooltip: `Signal quality: ${linkquality}`,
    icon: 'i-lucide-signal-zero',
    iconClass: 'text-rose-500 dark:text-rose-400',
  }
})

const powerBadge = computed(() => {
  const battery = props.state?.battery
  const batteryLow = props.state?.battery_low
  const powerSource = props.device.power_source?.toLowerCase()

  if (powerSource?.includes('mains')) {
    return {
      label: 'Mains',
      tooltip: 'Powered by mains',
      icon: 'i-lucide-plug',
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  if (typeof battery === 'number') {
    if (battery >= 75) {
      return {
        label: `${battery}%`,
        tooltip: `Battery level: ${battery}%`,
        icon: 'i-lucide-battery-full',
        iconClass: 'text-emerald-500 dark:text-emerald-400',
      }
    }

    if (battery >= 40) {
      return {
        label: `${battery}%`,
        tooltip: `Battery level: ${battery}%`,
        icon: 'i-lucide-battery-medium',
        iconClass: 'text-amber-500 dark:text-amber-400',
      }
    }

    return {
      label: `${battery}%`,
      tooltip: `Battery level: ${battery}%`,
      icon: 'i-lucide-battery-low',
      iconClass: 'text-rose-500 dark:text-rose-400',
    }
  }

  if (powerSource?.includes('battery')) {
    return {
      label: batteryLow === true ? 'Low' : 'OK',
      tooltip: `Battery state: ${batteryLow === true ? 'low' : 'ok'}`,
      icon: batteryLow === true ? 'i-lucide-battery-warning' : 'i-lucide-battery',
      iconClass:
        batteryLow === true
          ? 'text-rose-500 dark:text-rose-400'
          : 'text-emerald-500 dark:text-emerald-400',
    }
  }

  if (batteryLow === true) {
    return {
      label: 'Low',
      tooltip: 'Battery state: low',
      icon: 'i-lucide-battery-warning',
      iconClass: 'text-rose-500 dark:text-rose-400',
    }
  }

  return props.device.power_source
    ? {
        label: props.device.power_source,
        tooltip: `Power source: ${props.device.power_source}`,
        icon: 'i-lucide-battery',
        iconClass: 'text-slate-500 dark:text-slate-400',
      }
    : null
})

const deviceTypeLabel = computed(() => {
  const type = props.device.type.toLowerCase()

  if (type === 'enddevice') {
    return 'EndDevice'
  }

  if (type === 'router') {
    return 'Router'
  }

  if (type === 'coordinator') {
    return 'Coordinator'
  }

  return props.device.type
})

const deviceTypeBadge = computed(() => {
  const type = props.device.type.toLowerCase()

  if (type === 'router') {
    return {
      icon: 'i-lucide-route',
      tooltip: 'Router',
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  if (type === 'enddevice') {
    return {
      icon: 'i-lucide-smartphone',
      tooltip: 'EndDevice',
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  if (type === 'coordinator') {
    return {
      icon: 'i-lucide-waypoints',
      tooltip: 'Coordinator',
      iconClass: 'text-slate-500 dark:text-slate-400',
    }
  }

  return {
    icon: 'i-lucide-cpu',
    tooltip: deviceTypeLabel.value,
    iconClass: 'text-slate-500 dark:text-slate-400',
  }
})

const activity = computed(() =>
  devicesStore.deviceActivity(props.connectionId, props.device.friendly_name),
)

const isInterviewing = computed(
  () => props.device.interviewing === true || props.device.interview_completed === false,
)

onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = Date.now()
  }, 30000)
})

onUnmounted(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
})
</script>

<template>
  <RouterLink
    :to="`/connections/${connectionId}/devices/${device.ieee_address}`"
    class="block h-full"
  >
    <UCard
      class="relative h-full border-slate-200/80 bg-white/80 backdrop-blur transition hover:border-emerald-400/60 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-400/50 dark:hover:bg-white/8"
      :class="isOnline ? '' : 'opacity-60 saturate-75'"
      :ui="{ body: 'p-5 sm:p-6' }"
    >
      <div
        v-if="activity.rx || activity.tx"
        class="absolute bottom-4 right-4 z-10 flex items-center gap-1.5"
      >
        <UBadge v-if="activity.rx" color="info" variant="soft" class="animate-pulse"> RX </UBadge>
        <UBadge v-if="activity.tx" color="warning" variant="soft" class="animate-pulse">
          TX
        </UBadge>
      </div>

      <div
        v-if="isStale || lastSeenLabel"
        class="absolute right-4 top-4 z-10 flex items-center gap-1.5"
      >
        <UTooltip v-if="lastSeenLabel" :delay-duration="0" :text="staleTooltip">
          <UBadge color="neutral" variant="soft">
            {{ lastSeenLabel }}
          </UBadge>
        </UTooltip>

        <UTooltip v-if="isStale" :delay-duration="0" :text="staleTooltip">
          <UBadge color="warning" variant="soft"> Stale </UBadge>
        </UTooltip>
      </div>

      <div class="flex items-start gap-4">
        <div class="relative shrink-0">
          <UChip
            :color="isOnline ? 'success' : 'error'"
            size="3xl"
            inset
            standalone
            class="absolute -right-0.5 -top-0.5 z-10"
          />

          <div
            class="flex h-18 w-18 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring ring-slate-200 dark:bg-slate-900/80 dark:ring-white/10"
          >
            <div
              v-if="isInterviewing"
              class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-950/20 backdrop-blur-[1px] dark:bg-slate-950/40"
            >
              <UIcon
                class="animate-spin text-lg text-white drop-shadow-sm"
                name="i-lucide-loader-circle"
              />
            </div>

            <img
              v-if="imageUrl && !imageFailed"
              :src="imageUrl"
              :alt="device.friendly_name"
              class="h-full w-full object-contain"
              @error="imageFailed = true"
            />
            <span v-else class="text-xl font-semibold text-slate-500 dark:text-slate-400">
              {{ device.friendly_name.slice(0, 1).toUpperCase() }}
            </span>
          </div>
        </div>

        <div class="min-w-0 flex-1 space-y-3">
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold text-slate-950 dark:text-white">
              {{ description || device.friendly_name }}
            </p>
            <p v-if="description" class="truncate text-sm text-slate-500 dark:text-slate-400">
              {{ device.friendly_name }}
            </p>
            <p v-else class="truncate text-sm text-slate-500 dark:text-slate-400">
              {{ device.definition?.model || device.model_id || device.ieee_address }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UTooltip v-if="signalBadge" :delay-duration="0" :text="signalBadge.tooltip">
              <UBadge
                :icon="signalBadge.icon"
                color="neutral"
                variant="subtle"
                :ui="{ leadingIcon: signalBadge.iconClass }"
              >
                {{ signalBadge.label }}
              </UBadge>
            </UTooltip>

            <UTooltip v-if="powerBadge" :delay-duration="0" :text="powerBadge.tooltip">
              <UBadge
                :icon="powerBadge.icon"
                color="neutral"
                variant="subtle"
                :ui="{ leadingIcon: powerBadge.iconClass }"
              >
                {{ powerBadge.label }}
              </UBadge>
            </UTooltip>

            <UTooltip :delay-duration="0" :text="deviceTypeBadge.tooltip">
              <UBadge
                :icon="deviceTypeBadge.icon"
                color="neutral"
                variant="subtle"
                :ui="{ leadingIcon: deviceTypeBadge.iconClass }"
              />
            </UTooltip>
          </div>
        </div>
      </div>
    </UCard>
  </RouterLink>
</template>
