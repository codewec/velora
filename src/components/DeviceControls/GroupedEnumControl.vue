<script setup lang="ts">
import { computed } from 'vue'

import FeatureHeader from '@/components/DeviceControls/FeatureHeader.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useDevicesStore } from '@/stores/devices'
import type { DeviceStateValue, EnumExpose } from '@/types/z2m'
import { featureEndpoint, featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  deviceName: string
  exposes: EnumExpose[]
  state: Record<string, DeviceStateValue | undefined>
}>()

const devicesStore = useDevicesStore()
const sortedExposes = computed(() =>
  [...props.exposes].sort((left, right) => featureKey(left).localeCompare(featureKey(right))),
)
const primaryExpose = computed(() => sortedExposes.value[0] ?? props.exposes[0])

function items(expose: EnumExpose) {
  return expose.values.map((value) => ({ label: value, value }))
}

function modelValue(expose: EnumExpose) {
  const value = props.state[featureKey(expose)]
  return typeof value === 'string' ? value : undefined
}

function handleUpdate(expose: EnumExpose, value: string | number | boolean | Record<string, unknown> | undefined) {
  if (typeof value !== 'string') {
    return
  }

  const sent = useZ2M(props.connectionId).send(`${props.deviceName}/set`, {
    [featureKey(expose)]: value,
  })

  if (sent) {
    devicesStore.markDeviceTx(props.connectionId, props.deviceName)
  }
}
</script>

<template>
  <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-4' }">
    <div class="space-y-4">
      <FeatureHeader v-if="primaryExpose" :expose="primaryExpose" hide-endpoint />

      <div class="space-y-3">
        <div
          v-for="expose in sortedExposes"
          :key="featureKey(expose)"
          class="flex items-center justify-between gap-4 rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-900/70"
        >
          <span class="text-sm text-slate-500 dark:text-slate-400">
            Endpoint: {{ featureEndpoint(expose) || 'default' }}
          </span>

          <div class="flex justify-end">
            <USelect
              :items="items(expose)"
              :model-value="modelValue(expose)"
              placeholder="Select value"
              @update:model-value="(value: string | number | boolean | Record<string, unknown> | undefined) => handleUpdate(expose, value)"
            />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
