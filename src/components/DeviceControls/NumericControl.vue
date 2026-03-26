<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'

import FeatureHeader from '@/components/DeviceControls/FeatureHeader.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useDevicesStore } from '@/stores/devices'
import type { DeviceStateValue, NumericExpose } from '@/types/z2m'
import { featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  deviceName: string
  expose: NumericExpose
  stateValue: DeviceStateValue | undefined
}>()

const CONTROL_PENDING_TIMEOUT_MS = 5000
const model = ref<number>(
  typeof props.stateValue === 'number' ? props.stateValue : (props.expose.value_min ?? 0),
)
const pending = ref(false)
const devicesStore = useDevicesStore()

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let pendingTimer: ReturnType<typeof setTimeout> | null = null
let syncingFromState = false

function clearPendingTimer() {
  if (pendingTimer) {
    clearTimeout(pendingTimer)
    pendingTimer = null
  }
}

function actualValue() {
  return typeof props.stateValue === 'number' ? props.stateValue : (props.expose.value_min ?? 0)
}

function normalizeSliderValue(value: number | number[]) {
  return Array.isArray(value) ? value[0] ?? actualValue() : value
}

function scheduleSend(nextValue: number) {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // Slider interactions emit on every pointer move and on track clicks.
  // We debounce the final write, but we do it from the slider event itself
  // instead of a generic model watcher so both interaction modes are handled
  // consistently by the control.
  debounceTimer = setTimeout(() => {
    const topic = `${devicesStore.deviceCommandTopic(props.connectionId, props.deviceName)}/set`
    pending.value = true

    const sent = useZ2M(props.connectionId).send(topic, {
      [featureKey(props.expose) || 'value']: nextValue,
    })

    if (!sent) {
      syncingFromState = true
      model.value = actualValue()
      pending.value = false
      return
    }

    devicesStore.markDeviceTx(props.connectionId, props.deviceName)
    clearPendingTimer()
    pendingTimer = setTimeout(() => {
      syncingFromState = true
      model.value = actualValue()
      pending.value = false
      pendingTimer = null
    }, CONTROL_PENDING_TIMEOUT_MS)
  }, 150)
}

watch(
  () => props.stateValue,
  (value) => {
    if (typeof value === 'number') {
      syncingFromState = true
      model.value = value
      pending.value = false
      clearPendingTimer()
    }
  },
  { immediate: true },
)

function handleSliderUpdate(value: number | number[]) {
  const nextValue = normalizeSliderValue(value)
  model.value = nextValue

  if (syncingFromState) {
    syncingFromState = false
    return
  }

  if (!Number.isFinite(nextValue)) {
    return
  }

  scheduleSend(nextValue)
}

onUnmounted(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  clearPendingTimer()
})
</script>

<template>
  <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-4' }">
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <FeatureHeader :expose="expose" />

        <div class="flex min-w-24 items-center justify-end gap-2">
          <UIcon
            v-if="pending"
            name="i-lucide-loader-circle"
            class="animate-spin text-slate-400"
          />
          <span class="text-right text-2xl font-semibold text-slate-800 dark:text-slate-100">
            {{ model }}{{ expose.unit || '' }}
          </span>
        </div>
      </div>

      <USlider
        :model-value="model"
        :disabled="pending"
        :min="expose.value_min ?? 0"
        :max="expose.value_max ?? 100"
        :step="expose.value_step ?? 1"
        @update:model-value="handleSliderUpdate"
      />
    </div>
  </UCard>
</template>
