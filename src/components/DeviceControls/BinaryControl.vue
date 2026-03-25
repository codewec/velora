<script setup lang="ts">
import { ref, watch } from 'vue'

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

const checked = ref(false)
const devicesStore = useDevicesStore()

watch(
  () => props.stateValue,
  (value) => {
    checked.value = value === (props.expose.value_on ?? 'ON')
  },
  { immediate: true },
)

function handleToggle(value: boolean | undefined) {
  checked.value = Boolean(value)

  const payload = value
    ? (props.expose.value_on ?? 'ON')
    : (props.expose.value_off ?? 'OFF')

  const sent = useZ2M(props.connectionId).send(`${props.deviceName}/set`, {
    [featureKey(props.expose) || 'state']: payload,
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

      <div class="flex min-w-24 items-center justify-end">
        <USwitch :model-value="checked" @update:model-value="handleToggle" />
      </div>
    </div>
  </UCard>
</template>
