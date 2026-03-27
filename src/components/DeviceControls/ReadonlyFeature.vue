<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import FeatureHeader from '@/components/DeviceControls/FeatureHeader.vue'
import { useIndicatorHistoryStore } from '@/stores/indicatorHistory'
import type { DeviceStateValue, Expose } from '@/types/z2m'
import { formatBrowserDateTime } from '@/utils/dateTime'
import { featureKey, featureTitle } from '@/utils/featureMeta'
import { buildValueTrail, formatFeatureValue } from '@/utils/featureValue'

const props = defineProps<{
  connectionId: string
  deviceName: string
  expose: Expose
  stateValue: DeviceStateValue | undefined
}>()

const { t } = useI18n()
const indicatorHistoryStore = useIndicatorHistoryStore()
const isHistoryModalOpen = ref(false)
const historyListRef = ref<HTMLElement | null>(null)

const formattedValue = computed(() => formatFeatureValue(props.expose, props.stateValue))

const historyEntries = computed(() =>
  indicatorHistoryStore.featureHistory(
    props.connectionId,
    props.deviceName,
    featureKey(props.expose),
  ),
)

const valueTrail = computed(() =>
  buildValueTrail(
    formattedValue.value,
    historyEntries.value.filter((entry) => entry.value !== props.stateValue),
    props.expose,
  ),
)

const hasPreviousValues = computed(() =>
  historyEntries.value.some((entry) => entry.value !== props.stateValue),
)

const historyRows = computed(() => {
  const entries = [...historyEntries.value]

  // The history store keeps newest values first. We expose them directly so
  // the modal always reflects the current state at the top and live updates
  // simply prepend a new row without any extra synchronization logic.
  if (!entries.length || entries[0]?.value !== props.stateValue) {
    return [
      {
        id: 'current',
        value: props.stateValue,
        changedAt: Date.now(),
        current: true,
      },
    ]
  }

  return entries.map((entry, index) => ({
    id: `${entry.changedAt}:${index}`,
    value: entry.value,
    changedAt: entry.changedAt,
    current: index === 0,
  }))
})

watch(
  () => [isHistoryModalOpen.value, historyRows.value[0]?.id] as const,
  ([open, firstRowId], [previousOpen, previousFirstRowId]) => {
    if (!open || !firstRowId || firstRowId === previousFirstRowId) {
      return
    }

    const behavior: ScrollBehavior = previousOpen ? 'smooth' : 'auto'
    historyListRef.value?.scrollTo({ top: 0, behavior })
  },
)
</script>

<template>
  <UCard
    class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
    :class="
      hasPreviousValues
        ? 'cursor-pointer transition-colors hover:border-primary/40 hover:bg-white/90 dark:hover:bg-slate-950/60'
        : ''
    "
    :ui="{ body: 'p-4' }"
    @click="hasPreviousValues ? (isHistoryModalOpen = true) : undefined"
  >
    <div class="relative overflow-hidden">
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-end overflow-hidden"
      >
        <!--
          The trail uses a single mask over the whole row instead of per-item
          opacity math. That makes the fade depend on the rendered width of the
          final string, so short numeric values and long action names fade
          consistently.
        -->
        <div
          class="flex min-w-0 items-center justify-end gap-3 pl-14 pr-1"
          style="
            mask-image: linear-gradient(
              to right,
              transparent 0%,
              rgba(0, 0, 0, 0.18) 14%,
              rgba(0, 0, 0, 0.72) 34%,
              rgba(0, 0, 0, 1) 58%
            );
            -webkit-mask-image: linear-gradient(
              to right,
              transparent 0%,
              rgba(0, 0, 0, 0.18) 14%,
              rgba(0, 0, 0, 0.72) 34%,
              rgba(0, 0, 0, 1) 58%
            );
          "
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

  <UModal
    v-model:open="isHistoryModalOpen"
    :title="featureTitle(expose)"
    :description="t('devicePage.indicatorHistoryDescription', { device: deviceName })"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div ref="historyListRef" class="space-y-3 overflow-y-auto sm:h-[32rem]">
        <div
          v-for="row in historyRows"
          :key="row.id"
          class="flex items-center justify-between gap-4 rounded-2xl bg-slate-100/80 px-4 py-3 dark:bg-slate-900/60"
        >
          <div class="min-w-0">
            <p class="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {{ formatFeatureValue(expose, row.value) }}
            </p>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ formatBrowserDateTime(row.changedAt) }}
            </p>
          </div>

          <UBadge
            :color="row.current ? 'primary' : 'neutral'"
            :variant="row.current ? 'soft' : 'subtle'"
          >
            {{ row.current ? t('devicePage.currentValue') : t('devicePage.previousValue') }}
          </UBadge>
        </div>
      </div>
    </template>
  </UModal>
</template>
