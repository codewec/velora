<script setup lang="ts">
import { computed, ref, watch } from 'vue'

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
const model = ref<string | undefined>(undefined)
const devicesStore = useDevicesStore()

watch(
  () => props.stateValue,
  (value) => {
    model.value = typeof value === 'string' ? value : undefined
  },
  { immediate: true },
)

function handleUpdate(value: string | number | boolean | Record<string, unknown> | undefined) {
  if (typeof value !== 'string') {
    return
  }

  model.value = value

  const sent = useZ2M(props.connectionId).send(`${props.deviceName}/set`, {
    [featureKey(props.expose) || 'value']: value,
  })

  if (sent) {
    devicesStore.markDeviceTx(props.connectionId, props.deviceName)
  }
}
</script>

<template>
  <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-4' }">
    <div class="flex items-center justify-between gap-4">
      <FeatureHeader :expose="expose" />

      <div class="flex justify-end">
        <USelect
          :items="items"
          :model-value="model"
          placeholder="Select value"
          @update:model-value="handleUpdate"
        />
      </div>
    </div>
  </UCard>
</template>
