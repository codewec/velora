<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'

const props = defineProps<{
  connectionId: string
  initialTimeout: number
}>()

const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()
const { t } = useI18n()

const formattedTimeout = computed(() => {
  const seconds = bridgeStore.permitJoinTimeout(props.connectionId)
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
})

const targetLabel = computed(() => {
  const target = bridgeStore.permitJoinTarget(props.connectionId)

  if (target === 'all') {
    return t('permitJoin.allRouters')
  }

  const device = devicesStore
    .devicesFor(props.connectionId)
    .find((entry) => entry.friendly_name === target)
  return device?.friendly_name || target
})

const progress = computed(() => {
  if (props.initialTimeout <= 0) {
    return 0
  }

  return Math.max(
    0,
    Math.min(100, (bridgeStore.permitJoinTimeout(props.connectionId) / props.initialTimeout) * 100),
  )
})
</script>

<template>
  <div class="space-y-2">
    <div>{{ t('permitJoin.via', { target: targetLabel, timeout: formattedTimeout }) }}</div>

    <div class="h-1.5 overflow-hidden rounded-full bg-accented">
      <div
        class="h-full rounded-full bg-warning transition-[width] duration-700 ease-linear"
        :style="{ width: `${progress}%` }"
      />
    </div>
  </div>
</template>
