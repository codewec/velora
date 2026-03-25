<script setup lang="ts">
import BinaryControl from '@/components/DeviceControls/BinaryControl.vue'
import EnumControl from '@/components/DeviceControls/EnumControl.vue'
import NumericControl from '@/components/DeviceControls/NumericControl.vue'
import ReadonlyFeature from '@/components/DeviceControls/ReadonlyFeature.vue'
import DevicePageShell from '@/components/device/DevicePageShell.vue'
import type { Expose } from '@/types/z2m'
import { isBinaryExpose, isEnumExpose, isNumericExpose } from '@/types/z2m'
import { featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  id: string
}>()

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

function readableExposes(deviceExposes: Expose[] | undefined) {
  return flattenExposes(deviceExposes).filter((expose) => {
    const canRead = Boolean((expose.access ?? 0) & 1)
    const isWritable = Boolean((expose.access ?? 0) & 2)

    return canRead && !isWritable
  })
}

function writableExposes(deviceExposes: Expose[] | undefined) {
  return flattenExposes(deviceExposes).filter((expose) => (expose.access ?? 0) & 2)
}

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
  <DevicePageShell
    :connection-id="connectionId"
    :id="id"
    active-tab="exposes"
    show-history-toggle
  >
    <template #default="{ device, state }">
      <div class="grid gap-6 xl:grid-cols-2">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Indicators</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ readableExposes(device.definition?.exposes).length }} readable exposes
            </p>
          </div>

          <div v-if="readableExposes(device.definition?.exposes).length" class="grid gap-4">
            <ReadonlyFeature
              v-for="expose in readableExposes(device.definition?.exposes)"
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
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Controls</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ writableExposes(device.definition?.exposes).length }} writable exposes
            </p>
          </div>

          <div v-if="writableExposes(device.definition?.exposes).length" class="grid gap-4">
            <template
              v-for="expose in writableExposes(device.definition?.exposes)"
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
    </template>
  </DevicePageShell>
</template>
