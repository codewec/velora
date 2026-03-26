<script setup lang="ts">
import { computed } from 'vue'

import BinaryControl from '@/components/DeviceControls/BinaryControl.vue'
import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import EnumControl from '@/components/DeviceControls/EnumControl.vue'
import NumericControl from '@/components/DeviceControls/NumericControl.vue'
import ReadonlyFeature from '@/components/DeviceControls/ReadonlyFeature.vue'
import { useIndicatorHistoryPreference } from '@/composables/useIndicatorHistoryPreference'
import { useDevicesStore } from '@/stores/devices'
import type { Expose } from '@/types/z2m'
import { isBinaryExpose, isEnumExpose, isNumericExpose } from '@/types/z2m'
import { featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  id: string
}>()

const devicesStore = useDevicesStore()
const { enabled: historyEnabled } = useIndicatorHistoryPreference()

const device = computed(() => devicesStore.deviceById(props.connectionId, props.id))
const state = computed(() =>
  device.value
    ? (devicesStore.deviceStatesFor(props.connectionId)[device.value.friendly_name] ?? {})
    : {},
)

function flattenExposes(exposes: Expose[] | undefined): Expose[] {
  if (!exposes) {
    return []
  }

  return exposes.flatMap((expose) => {
    if (expose.features?.length) {
      return flattenExposes(expose.features)
    }

    return [expose]
  })
}

const writableExposes = computed(() => {
  const exposes = flattenExposes(device.value?.definition?.exposes)
  return exposes.filter((expose) => (expose.access ?? 0) & 2)
})

const readableExposes = computed(() => {
  const exposes = flattenExposes(device.value?.definition?.exposes)

  return exposes.filter((expose) => {
    const canRead = Boolean((expose.access ?? 0) & 1)
    const isWritable = Boolean((expose.access ?? 0) & 2)

    return canRead && !isWritable
  })
})

function controlComponent(expose: Expose) {
  if (isBinaryExpose(expose)) {
    return BinaryControl
  }

  if (isNumericExpose(expose)) {
    return NumericControl
  }

  if (isEnumExpose(expose)) {
    return EnumControl
  }

  return null
}
</script>

<template>
  <UDashboardPanel id="device" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardNavbar :title="device?.friendly_name || 'Device not found'">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ConnectionNavbarActions :connection-id="connectionId" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar v-if="device">
        <template #left>
          <UBadge color="neutral" variant="subtle">
            {{ device.ieee_address }}
          </UBadge>
        </template>

        <template #right>
          <div class="flex items-center gap-3">
            <span class="text-sm text-slate-500 dark:text-slate-400">Record history</span>
            <USwitch v-model="historyEnabled" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="device" class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div class="space-y-4">
          <div>
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Metadata</p>
            <dl class="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <dt class="text-slate-400 dark:text-slate-500">Vendor</dt>
                <dd>{{ device.definition?.vendor || device.manufacturer || 'Unknown' }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 dark:text-slate-500">Model</dt>
                <dd>{{ device.definition?.model || device.model_id || 'Unknown' }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 dark:text-slate-500">Type</dt>
                <dd>{{ device.type }}</dd>
              </div>
              <div>
                <dt class="text-slate-400 dark:text-slate-500">Power</dt>
                <dd>{{ device.power_source || 'Unknown' }}</dd>
              </div>
            </dl>
          </div>

          <div>
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Current state</p>
            <pre
              class="mt-3 overflow-x-auto rounded-2xl bg-slate-100 p-4 text-xs text-slate-700 dark:bg-slate-950/80 dark:text-slate-300"
              >{{ JSON.stringify(state, null, 2) }}</pre
            >
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Indicators</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ readableExposes.length }} readable exposes
            </p>
          </div>

          <div v-if="readableExposes.length" class="grid gap-4">
            <ReadonlyFeature
              v-for="expose in readableExposes"
              :key="`readonly-${expose.property || expose.name}-${expose.type}`"
              :connection-id="connectionId"
              :device-name="device.friendly_name"
              :expose="expose"
              :state-value="state[featureKey(expose)]"
            />
          </div>

          <UAlert
            v-else
            color="neutral"
            variant="subtle"
            title="No readable indicators"
            description="This device does not currently expose any read-only indicators."
          />

          <div class="flex items-center justify-between">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Controls</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ writableExposes.length }} writable exposes
            </p>
          </div>

          <div v-if="writableExposes.length" class="grid gap-4">
            <template
              v-for="expose in writableExposes"
              :key="`${expose.property || expose.name}-${expose.type}`"
            >
              <component
                :is="controlComponent(expose) || 'div'"
                v-if="controlComponent(expose)"
                :connection-id="connectionId"
                :device-name="device.friendly_name"
                :expose="expose"
                :state-value="state[featureKey(expose)]"
              />

              <UAlert
                v-else
                color="neutral"
                variant="subtle"
                :title="expose.label || expose.name || expose.property || expose.type"
                description="Expose type is not supported in this MVP."
              />
            </template>
          </div>

          <UAlert
            v-else
            color="neutral"
            variant="subtle"
            title="No writable exposes"
            description="This device does not currently expose binary, numeric or enum controls."
          />
        </div>
      </div>

      <UAlert
        v-else
        color="error"
        variant="subtle"
        title="Device not found"
        description="The requested device is missing from the latest bridge inventory."
      />
    </template>
  </UDashboardPanel>
</template>
