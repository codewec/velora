<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useDevicesStore } from '@/stores/devices'
import type { Device } from '@/types/z2m'
import {
  formatLastSeenLabel,
  formatLastUpdateTooltip,
  powerBadge as resolvePowerBadge,
  signalBadge as resolveSignalBadge,
  staleThresholdMsForDevice,
} from '@/utils/deviceCard'

const props = defineProps<{
  connectionId: string
  device: Device
  state?: Record<string, unknown>
}>()

const imageFailed = ref(false)
const isStatusPopoverOpen = ref(false)
const devicesStore = useDevicesStore()
const { locale, t } = useI18n()
const now = ref(Date.now())
let nowTimer: ReturnType<typeof setInterval> | null = null

const imageUrl = computed(() => {
  const model = props.device.definition?.model
  return model
    ? `https://www.zigbee2mqtt.io/images/devices/${model.replaceAll('/', '-')}.png`
    : null
})

const isOnline = computed(() => props.state?.availability !== 'offline')
const onlineStatusTooltip = computed(() => {
  return isOnline.value ? t('deviceCard.onlineTooltip') : t('deviceCard.offlineTooltip')
})
const lastSeenAt = computed(() =>
  devicesStore.deviceLastSeen(props.connectionId, props.device.friendly_name),
)
const reportedLastSeenAt = computed(() =>
  devicesStore.deviceReportedLastSeen(props.connectionId, props.device.friendly_name),
)

const staleThresholdMs = computed(() => staleThresholdMsForDevice(props.device))

const isStale = computed(() => {
  if (!lastSeenAt.value || !isOnline.value) {
    return false
  }

  return now.value - lastSeenAt.value > staleThresholdMs.value
})

const staleTooltip = computed(() => {
  if (!lastSeenAt.value) {
    return t('deviceCard.noRecentUpdates')
  }

  return formatLastUpdateTooltip(lastSeenAt.value, now.value, locale.value, t)
})

const lastSeenLabel = computed(() => {
  if (!reportedLastSeenAt.value || isStale.value) {
    return null
  }

  return formatLastSeenLabel(reportedLastSeenAt.value, now.value, t)
})

const description = computed(
  () => props.device.description || props.device.definition?.description || null,
)

const signalBadge = computed(() => resolveSignalBadge(props.state?.linkquality, t))

const powerBadge = computed(() =>
  resolvePowerBadge(props.device, props.state?.battery, props.state?.battery_low, t),
)

const deviceTypeLabel = computed(() => {
  const type = props.device.type.toLowerCase()

  if (type === 'enddevice') {
    return t('deviceCard.endDevice')
  }

  if (type === 'router') {
    return t('deviceCard.router')
  }

  if (type === 'coordinator') {
    return t('deviceCard.coordinator')
  }

  return props.device.type
})

const deviceTypeBadge = computed(() => {
  const type = props.device.type.toLowerCase()

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
    label: deviceTypeLabel.value,
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
      :ui="{ body: 'px-4 py-5 sm:px-5 sm:py-6' }"
    >
      <div class="absolute left-0 top-0 z-10 flex items-center gap-1.5">
        <UPopover v-model:open="isStatusPopoverOpen">
          <UBadge
            size="sm"
            :color="isOnline ? 'success' : 'error'"
            variant="soft"
            @mouseenter="isStatusPopoverOpen = true"
            @mouseleave="isStatusPopoverOpen = false"
          >
            {{ isOnline ? t('deviceCard.online') : t('deviceCard.offline') }}
          </UBadge>

          <template #content>
            <div
              class="max-w-64 p-3 text-sm text-slate-700 dark:text-slate-200"
              @mouseenter="isStatusPopoverOpen = true"
              @mouseleave="isStatusPopoverOpen = false"
            >
              {{ onlineStatusTooltip }}
            </div>
          </template>
        </UPopover>
      </div>

      <div
        v-if="activity.rx || activity.tx"
        class="absolute bottom-0 right-0 z-10 flex items-center gap-1.5"
      >
        <UBadge v-if="activity.rx" size="sm" color="info" variant="soft" class="animate-pulse">
          RX
        </UBadge>
        <UBadge v-if="activity.tx" size="sm" color="warning" variant="soft" class="animate-pulse">
          TX
        </UBadge>
      </div>

      <div
        v-if="isStale || lastSeenLabel"
        class="absolute right-0 top-0 z-10 flex items-center gap-1.5"
      >
        <UTooltip v-if="lastSeenLabel" :delay-duration="0" :text="staleTooltip">
          <UBadge color="neutral" variant="soft" size="sm">
            {{ lastSeenLabel }}
          </UBadge>
        </UTooltip>

        <UTooltip v-if="isStale" :delay-duration="0" :text="staleTooltip">
          <UBadge color="warning" variant="soft" size="sm"> {{ t('deviceCard.stale') }} </UBadge>
        </UTooltip>
      </div>

      <div class="flex items-center gap-4">
        <div class="relative shrink-0">
          <div
            class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 ring ring-slate-200 dark:bg-slate-900/80 dark:ring-white/10"
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
              >
                {{ deviceTypeBadge.label }}
              </UBadge>
            </UTooltip>
          </div>
        </div>
      </div>
    </UCard>
  </RouterLink>
</template>
