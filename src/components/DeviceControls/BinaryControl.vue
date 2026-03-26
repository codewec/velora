<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

import FeatureHeader from '@/components/DeviceControls/FeatureHeader.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useDevicesStore } from '@/stores/devices'
import type { BinaryExpose, DeviceStateValue } from '@/types/z2m'
import { featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  deviceName: string
  expose: BinaryExpose
  stateValue: DeviceStateValue | undefined
}>()

const CONTROL_PENDING_TIMEOUT_MS = 5000
const checked = ref(false)
const pending = ref(false)
const devicesStore = useDevicesStore()
let pendingTimer: ReturnType<typeof setTimeout> | null = null

function clearPendingTimer() {
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
}

function actualChecked() {
  return props.stateValue === (props.expose.value_on ?? 'ON')
}

watch(
  () => props.stateValue,
  () => {
    checked.value = actualChecked()
    pending.value = false
    clearPendingTimer()
  },
  { immediate: true },
)

function handleToggle(value: boolean | undefined) {
  checked.value = Boolean(value)
  pending.value = true
  const topic = `${devicesStore.deviceCommandTopic(props.connectionId, props.deviceName)}/set`

  const payload = value ? (props.expose.value_on ?? 'ON') : (props.expose.value_off ?? 'OFF')

  const sent = useZ2M(props.connectionId).send(topic, {
    [featureKey(props.expose) || 'state']: payload,
  })

  if (!sent) {
    checked.value = actualChecked()
    pending.value = false
    clearPendingTimer()
    return
  }

  devicesStore.markDeviceTx(props.connectionId, props.deviceName)
  clearPendingTimer()

  // Optimistic controls need a bounded lifetime. If the device never confirms
  // the write, we roll back to the last known state so the UI does not stay
  // stuck in a fake position indefinitely.
  pendingTimer = setTimeout(() => {
    checked.value = actualChecked()
    pending.value = false
    pendingTimer = null
  }, CONTROL_PENDING_TIMEOUT_MS)
}

onUnmounted(() => {
  clearPendingTimer()
})
</script>

<template>
  <UCard
    class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
    :ui="{ body: 'p-4' }"
  >
    <div class="flex items-center justify-between gap-4">
      <FeatureHeader :expose="expose" />

      <div class="flex min-w-24 items-center justify-end">
        <USwitch :model-value="checked" :loading="pending" @update:model-value="handleToggle" />
      </div>
    </div>
  </UCard>
</template>
