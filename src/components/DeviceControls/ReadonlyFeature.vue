<script setup lang="ts">
import { computed } from 'vue'

import FeatureHeader from '@/components/DeviceControls/FeatureHeader.vue'
import { useIndicatorHistoryStore } from '@/stores/indicatorHistory'
import type { DeviceStateValue, Expose } from '@/types/z2m'
import { featureKey } from '@/utils/featureMeta'
import { buildValueTrail, formatFeatureValue } from '@/utils/featureValue'

const props = defineProps<{
  connectionId: string
  deviceName: string
  expose: Expose
  stateValue: DeviceStateValue | undefined
}>()

const indicatorHistoryStore = useIndicatorHistoryStore()

const formattedValue = computed(() => formatFeatureValue(props.expose, props.stateValue))

const historyEntries = computed(() => indicatorHistoryStore.featureHistory(
  props.connectionId,
  props.deviceName,
  featureKey(props.expose),
))

const valueTrail = computed(() =>
  buildValueTrail(
    formattedValue.value,
    historyEntries.value.filter(entry => entry.value !== props.stateValue),
    props.expose,
  ),
)
</script>

<template>
  <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-4' }">
    <div class="relative overflow-hidden">
      <div class="pointer-events-none absolute inset-0 flex items-center justify-end overflow-hidden">
        <!--
          The trail uses a single mask over the whole row instead of per-item
          opacity math. That makes the fade depend on the rendered width of the
          final string, so short numeric values and long action names fade
          consistently.
        -->
        <div
          class="flex min-w-0 items-center justify-end gap-3 pl-14 pr-1"
          style="mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,.18) 14%, rgba(0,0,0,.72) 34%, rgba(0,0,0,1) 58%); -webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,.18) 14%, rgba(0,0,0,.72) 34%, rgba(0,0,0,1) 58%);"
        >
          <span
            v-for="entry in valueTrail"
            :key="entry.id"
            class="shrink-0 whitespace-nowrap text-right text-2xl font-semibold transition-opacity"
            :class="entry.className"
          >
            {{ entry.text }}
          </span>
        </div>
      </div>

      <div class="relative z-10 flex items-center justify-between gap-4">
        <FeatureHeader :expose="expose" />

        <div class="h-10 min-w-40 shrink-0" />
      </div>
    </div>
  </UCard>
</template>
