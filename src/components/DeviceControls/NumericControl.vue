<script setup lang="ts">
import { ref, watch } from 'vue'

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

const model = ref<number[]>([
  typeof props.stateValue === 'number' ? props.stateValue : (props.expose.value_min ?? 0),
])
const devicesStore = useDevicesStore()

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.stateValue,
  (value) => {
    if (typeof value === 'number') {
      model.value = [value]
    }
  },
)

watch(model, (value) => {
  const nextValue = value[0]

  if (typeof nextValue !== 'number') {
    return
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // Slider interactions emit on every pointer move. We debounce the outgoing
  // write so we keep the UI responsive without flooding Zigbee2MQTT with
  // intermediate set commands for values the user never intended to keep.
  debounceTimer = setTimeout(() => {
    const sent = useZ2M(props.connectionId).send(`${props.deviceName}/set`, {
      [featureKey(props.expose) || 'value']: nextValue,
    })

    if (sent) {
      devicesStore.markDeviceTx(props.connectionId, props.deviceName)
    }
  }, 150)
})
</script>

<template>
  <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-4' }">
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <FeatureHeader :expose="expose" />

        <span class="min-w-24 text-right text-2xl font-semibold text-slate-800 dark:text-slate-100">
          {{ model[0] }}{{ expose.unit || '' }}
        </span>
      </div>

      <USlider
        v-model="model"
        :min="expose.value_min ?? 0"
        :max="expose.value_max ?? 100"
        :step="expose.value_step ?? 1"
      />
    </div>
  </UCard>
</template>
