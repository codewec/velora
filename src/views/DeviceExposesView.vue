<script setup lang="ts">
import { computed } from 'vue'

import BinaryControl from '@/components/DeviceControls/BinaryControl.vue'
import EnumControl from '@/components/DeviceControls/EnumControl.vue'
import GroupedBinaryControl from '@/components/DeviceControls/GroupedBinaryControl.vue'
import GroupedEnumControl from '@/components/DeviceControls/GroupedEnumControl.vue'
import NumericControl from '@/components/DeviceControls/NumericControl.vue'
import ReadonlyFeature from '@/components/DeviceControls/ReadonlyFeature.vue'
import DevicePageShell from '@/components/device/DevicePageShell.vue'
import { useSmartGroupingPreference } from '@/composables/useSmartGroupingPreference'
import type { BinaryExpose, DeviceState, EnumExpose, Expose } from '@/types/z2m'
import { isBinaryExpose, isEnumExpose, isNumericExpose } from '@/types/z2m'
import { featureBaseKey, featureEndpoint, featureKey } from '@/utils/featureMeta'

const props = defineProps<{
  connectionId: string
  id: string
}>()

const { enabled: smartGroupingEnabled } = useSmartGroupingPreference()

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

function exposeSortWeight(expose: Expose) {
  if (isBinaryExpose(expose)) {
    return 0
  }

  if (isEnumExpose(expose)) {
    return 1
  }

  if (isNumericExpose(expose)) {
    return 2
  }

  return 3
}

function sortExposes(exposes: Expose[]) {
  return [...exposes].sort((left, right) => {
    const weightDiff = exposeSortWeight(left) - exposeSortWeight(right)

    if (weightDiff !== 0) {
      return weightDiff
    }

    return featureKey(left).localeCompare(featureKey(right))
  })
}

function inferredReadableExposes(deviceExposes: Expose[] | undefined, state: DeviceState) {
  const knownKeys = new Set(flattenExposes(deviceExposes).map(featureKey))
  const ignoredKeys = new Set(['last_seen', 'availability'])

  return Object.entries(state)
    .filter(([key, value]) => !knownKeys.has(key) && !ignoredKeys.has(key) && value !== null && typeof value !== 'object')
    .map(([key, value]) => ({
      type: typeof value === 'number' ? 'numeric' : typeof value === 'boolean' ? 'binary' : 'text',
      property: key,
      label: key.replaceAll('_', ' ').replace(/\b\w/g, char => char.toUpperCase()),
      access: 1,
    }) satisfies Expose)
}

function groupedWritableExposes(deviceExposes: Expose[] | undefined) {
  const groups = new Map<string, Expose[]>()

  for (const expose of writableExposes(deviceExposes)) {
    const endpoint = featureEndpoint(expose)

    if (!endpoint) {
      continue
    }

    const groupKey = `${expose.type}:${featureBaseKey(expose)}`
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), expose])
  }

  return [...groups.values()]
    .filter(group => group.length > 1)
    .sort((left, right) => {
      const leftFirst = left[0]
      const rightFirst = right[0]

      if (!leftFirst || !rightFirst) {
        return 0
      }

      const weightDiff = exposeSortWeight(leftFirst) - exposeSortWeight(rightFirst)
      if (weightDiff !== 0) {
        return weightDiff
      }

      return featureBaseKey(leftFirst).localeCompare(featureBaseKey(rightFirst))
    })
}

function singleWritableExposes(deviceExposes: Expose[] | undefined) {
  if (!smartGroupingEnabled.value) {
    return sortExposes(writableExposes(deviceExposes))
  }

  const groupedKeys = new Set(
    groupedWritableExposes(deviceExposes).flatMap(group => group.map(featureKey)),
  )

  return sortExposes(writableExposes(deviceExposes).filter(expose => !groupedKeys.has(featureKey(expose))))
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

function groupedControlComponent(group: Expose[]) {
  const first = group[0]

  if (!first) {
    return null
  }

  if (isBinaryExpose(first) && group.every(isBinaryExpose)) {
    return GroupedBinaryControl
  }

  if (isEnumExpose(first) && group.every(isEnumExpose)) {
    return GroupedEnumControl
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
    show-smart-grouping-toggle
  >
    <template #default="{ device, state }">
      <div class="grid gap-6 xl:grid-cols-2">
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Indicators</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ readableExposes(device.definition?.exposes).length + inferredReadableExposes(device.definition?.exposes, state).length }} readable exposes
            </p>
          </div>

          <div
            v-if="readableExposes(device.definition?.exposes).length || inferredReadableExposes(device.definition?.exposes, state).length"
            class="grid gap-4"
          >
            <ReadonlyFeature
              v-for="expose in readableExposes(device.definition?.exposes)"
              :key="`readonly-${expose.property || expose.name}-${expose.type}`"
              :connection-id="connectionId"
              :device-name="device.friendly_name"
              :expose="expose"
              :state-value="state[featureKey(expose)]"
            />

            <ReadonlyFeature
              v-for="expose in inferredReadableExposes(device.definition?.exposes, state)"
              :key="`inferred-${featureKey(expose)}`"
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
              v-for="group in groupedWritableExposes(device.definition?.exposes)"
              :key="`group-${group.map(featureKey).join('-')}`"
            >
              <component
                :is="groupedControlComponent(group) || 'div'"
                v-if="smartGroupingEnabled && groupedControlComponent(group)"
                :connection-id="connectionId"
                :device-name="device.friendly_name"
                :exposes="group as BinaryExpose[] | EnumExpose[]"
                :state="state"
              />
            </template>

            <template
              v-for="expose in singleWritableExposes(device.definition?.exposes)"
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
