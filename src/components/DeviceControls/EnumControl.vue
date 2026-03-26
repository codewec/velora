<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import FeatureHeader from '@/components/DeviceControls/FeatureHeader.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useDevicesStore } from '@/stores/devices'
import type { DeviceStateValue, EnumExpose } from '@/types/z2m'
import { featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  deviceName: string
  expose: EnumExpose
  stateValue: DeviceStateValue | undefined
}>()

const items = computed(() => props.expose.values.map((value) => ({ label: value, value })))
const CONTROL_PENDING_TIMEOUT_MS = 5000
const model = ref<string | undefined>(undefined)
const pending = ref(false)
const devicesStore = useDevicesStore()
let pendingTimer: ReturnType<typeof setTimeout> | null = null

function clearPendingTimer() {
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
}

function actualValue() {
  return typeof props.stateValue === 'string' ? props.stateValue : undefined
}

watch(
  () => props.stateValue,
  () => {
    model.value = actualValue()
    pending.value = false
    clearPendingTimer()
  },
  { immediate: true },
)

function handleUpdate(value: string | number | boolean | Record<string, unknown> | undefined) {
  if (typeof value !== 'string') {
    return
  }

  model.value = value
  pending.value = true
  const topic = `${devicesStore.deviceCommandTopic(props.connectionId, props.deviceName)}/set`

  const sent = useZ2M(props.connectionId).send(topic, {
    [featureKey(props.expose) || 'value']: value,
  })

  if (!sent) {
    model.value = actualValue()
    pending.value = false
    clearPendingTimer()
    return
  }

  devicesStore.markDeviceTx(props.connectionId, props.deviceName)
  clearPendingTimer()
  pendingTimer = setTimeout(() => {
    model.value = actualValue()
    pending.value = false
    pendingTimer = null
  }, CONTROL_PENDING_TIMEOUT_MS)
}

onUnmounted(() => {
  clearPendingTimer()
})
</script>

<template>
  <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-4' }">
    <div class="flex items-center justify-between gap-4">
      <FeatureHeader :expose="expose" />

      <div class="flex justify-end">
        <USelect
          :items="items"
          :model-value="model"
          :loading="pending"
          placeholder="Select value"
          @update:model-value="handleUpdate"
        />
      </div>
    </div>
  </UCard>
</template>
