<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { DaySchedule } from '@/utils/schedule'

defineProps<{
  days: DaySchedule[]
}>()

const { t } = useI18n()

function dayLabel(day: DaySchedule['day']) {
  return t(`schedule.${day}`)
}

function formatTemperature(value: number | null) {
  return value == null || Number.isNaN(value) ? '--' : value.toFixed(1)
}
</script>

<template>
  <UCard
    class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
    :ui="{ body: 'p-4' }"
  >
    <div class="space-y-4">
      <div class="flex items-center gap-2">
        <UIcon
          name="i-lucide-calendar-range"
          class="text-base text-slate-500 dark:text-slate-400"
        />
        <p class="text-sm font-semibold text-slate-950 dark:text-white">
          {{ t('schedule.title') }}
        </p>
      </div>

      <div class="space-y-3">
        <div
          v-for="day in days"
          :key="day.key"
          class="flex flex-col gap-2 rounded-2xl bg-slate-100/80 px-3 py-3 dark:bg-slate-900/60"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-medium text-slate-700 dark:text-slate-200">
              {{ dayLabel(day.day) }}
            </p>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              {{ day.entries.length }} {{ t('schedule.slots') }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UBadge
              v-for="entry in day.entries"
              :key="`${day.key}-${entry.time}-${entry.temperature}`"
              color="neutral"
              variant="soft"
              class="font-mono"
            >
              {{ entry.time }}/{{ formatTemperature(entry.temperature) }}
            </UBadge>
          </div>
        </div>
      </div>
    </div>
  </UCard>
</template>
