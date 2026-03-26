<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

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
const CONTROL_PENDING_TIMEOUT_MS = 5000
const sortedExposes = computed(() =>
  [...props.exposes].sort((left, right) => featureKey(left).localeCompare(featureKey(right))),
)
const primaryExpose = computed(() => sortedExposes.value[0] ?? props.exposes[0])
const optimisticByKey = ref<Record<string, string | undefined>>({})
const pendingByKey = ref<Record<string, boolean>>({})
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearPendingTimer(key: string) {
  const timer = pendingTimers.get(key)

  if (timer) {
    clearTimeout(timer)
    pendingTimers.delete(key)
  }
}

function items(expose: EnumExpose) {
  return expose.values.map((value) => ({ label: value, value }))
}

function modelValue(expose: EnumExpose) {
  const key = featureKey(expose)

  if (pendingByKey.value[key]) {
    return optimisticByKey.value[key]
  }

  const value = props.state[key]
  return typeof value === 'string' ? value : undefined
}

function handleUpdate(expose: EnumExpose, value: string | number | boolean | Record<string, unknown> | undefined) {
  if (typeof value !== 'string') {
    return
  }
  const key = featureKey(expose)
  optimisticByKey.value = { ...optimisticByKey.value, [key]: value }
  pendingByKey.value = { ...pendingByKey.value, [key]: true }
  const topic = `${devicesStore.deviceCommandTopic(props.connectionId, props.deviceName)}/set`

  const sent = useZ2M(props.connectionId).send(topic, {
    [key]: value,
  })

  if (!sent) {
    clearPendingTimer(key)
    const actual = props.state[key]
    pendingByKey.value = { ...pendingByKey.value, [key]: false }
    optimisticByKey.value = {
      ...optimisticByKey.value,
      [key]: typeof actual === 'string' ? actual : undefined,
    }
    return
  }

  devicesStore.markDeviceTx(props.connectionId, props.deviceName)
  clearPendingTimer(key)
  pendingTimers.set(key, setTimeout(() => {
    const actual = props.state[key]
    pendingByKey.value = { ...pendingByKey.value, [key]: false }
    optimisticByKey.value = {
      ...optimisticByKey.value,
      [key]: typeof actual === 'string' ? actual : undefined,
    }
    pendingTimers.delete(key)
  }, CONTROL_PENDING_TIMEOUT_MS))
}

watch(
  () => sortedExposes.value.map(expose => props.state[featureKey(expose)]),
  () => {
    for (const expose of sortedExposes.value) {
      const key = featureKey(expose)

      if (!pendingByKey.value[key]) {
        continue
      }

      clearPendingTimer(key)
      const actual = props.state[key]
      pendingByKey.value = { ...pendingByKey.value, [key]: false }
      optimisticByKey.value = {
        ...optimisticByKey.value,
        [key]: typeof actual === 'string' ? actual : undefined,
      }
    }
  },
)

onUnmounted(() => {
  for (const key of pendingTimers.keys()) {
    clearPendingTimer(key)
  }
})
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
              :loading="pendingByKey[featureKey(expose)]"
              placeholder="Select value"
              @update:model-value="(value: string | number | boolean | Record<string, unknown> | undefined) => handleUpdate(expose, value)"
            />
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
