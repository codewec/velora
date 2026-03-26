<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import FeatureHeader from '@/components/DeviceControls/FeatureHeader.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useDevicesStore } from '@/stores/devices'
import type { BinaryExpose, DeviceStateValue } from '@/types/z2m'
import { featureEndpoint, featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  deviceName: string
  exposes: BinaryExpose[]
  state: Record<string, DeviceStateValue | undefined>
}>()

const devicesStore = useDevicesStore()
const CONTROL_PENDING_TIMEOUT_MS = 5000
const sortedExposes = computed(() =>
  [...props.exposes].sort((left, right) => featureKey(left).localeCompare(featureKey(right))),
)
const primaryExpose = computed(() => sortedExposes.value[0] ?? props.exposes[0])
const optimisticByKey = ref<Record<string, boolean>>({})
const pendingByKey = ref<Record<string, boolean>>({})
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

function clearPendingTimer(key: string) {
  const timer = pendingTimers.get(key)

  if (timer) {
    clearTimeout(timer)
    pendingTimers.delete(key)
  }
}

function actualChecked(expose: BinaryExpose) {
  return props.state[featureKey(expose)] === (expose.value_on ?? 'ON')
}

function isChecked(expose: BinaryExpose) {
  const key = featureKey(expose)
  return pendingByKey.value[key] ? Boolean(optimisticByKey.value[key]) : actualChecked(expose)
}

function handleToggle(expose: BinaryExpose, value: boolean | undefined) {
  const key = featureKey(expose)
  optimisticByKey.value = { ...optimisticByKey.value, [key]: Boolean(value) }
  pendingByKey.value = { ...pendingByKey.value, [key]: true }
  const payload = value ? (expose.value_on ?? 'ON') : (expose.value_off ?? 'OFF')
  const topic = `${devicesStore.deviceCommandTopic(props.connectionId, props.deviceName)}/set`

  const sent = useZ2M(props.connectionId).send(topic, {
    [key]: payload,
  })

  if (!sent) {
    clearPendingTimer(key)
    pendingByKey.value = { ...pendingByKey.value, [key]: false }
    optimisticByKey.value = { ...optimisticByKey.value, [key]: actualChecked(expose) }
    return
  }

  devicesStore.markDeviceTx(props.connectionId, props.deviceName)
  clearPendingTimer(key)
  pendingTimers.set(
    key,
    setTimeout(() => {
      pendingByKey.value = { ...pendingByKey.value, [key]: false }
      optimisticByKey.value = { ...optimisticByKey.value, [key]: actualChecked(expose) }
      pendingTimers.delete(key)
    }, CONTROL_PENDING_TIMEOUT_MS),
  )
}

watch(
  () => sortedExposes.value.map((expose) => props.state[featureKey(expose)]),
  () => {
    for (const expose of sortedExposes.value) {
      const key = featureKey(expose)

      if (!pendingByKey.value[key]) {
        continue
      }

      clearPendingTimer(key)
      pendingByKey.value = { ...pendingByKey.value, [key]: false }
      optimisticByKey.value = { ...optimisticByKey.value, [key]: actualChecked(expose) }
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
  <UCard
    class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
    :ui="{ body: 'p-4' }"
  >
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

          <USwitch
            :model-value="isChecked(expose)"
            :loading="pendingByKey[featureKey(expose)]"
            @update:model-value="(value: boolean | undefined) => handleToggle(expose, value)"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
