<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useZ2M } from '@/composables/useZ2M'
import { useDevicesStore } from '@/stores/devices'
import type { DeviceState, DeviceStateValue } from '@/types/z2m'
import {
  buildScheduleSegments,
  scheduleEditorDaysFromState,
  serializeScheduleValue,
  type DaySchedule,
} from '@/utils/schedule'

const props = defineProps<{
  connectionId: string
  deviceName: string
  state: Record<string, DeviceStateValue | undefined>
}>()

const { t } = useI18n()
const toast = useToast()
const devicesStore = useDevicesStore()

const isEditorOpen = ref(false)
const isSaving = ref(false)
const draftDays = ref<DaySchedule[]>([])
const TIMELINE_MARKERS = ['00', '06', '12', '18', '24'] as const

const days = computed(() => scheduleEditorDaysFromState(props.state))

function dayLabel(day: DaySchedule['day']) {
  return t(`schedule.${day}`)
}

function formatTemperature(value: number | null) {
  return value == null || Number.isNaN(value) ? '--' : `${value.toFixed(1)}°C`
}

function timelineSegments(day: DaySchedule) {
  return buildScheduleSegments(day.entries)
}

function segmentTone(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return 'bg-slate-300/80 dark:bg-slate-700/80'
  }

  if (value < 17) {
    return 'bg-sky-400/75 dark:bg-sky-500/70'
  }

  if (value < 20) {
    return 'bg-emerald-400/80 dark:bg-emerald-500/75'
  }

  if (value < 23) {
    return 'bg-amber-400/80 dark:bg-amber-500/75'
  }

  return 'bg-rose-400/80 dark:bg-rose-500/75'
}

function openEditor() {
  draftDays.value = scheduleEditorDaysFromState(props.state).map((day) => ({
    ...day,
    entries: day.entries.map((entry) => ({ ...entry })),
  }))
  isEditorOpen.value = true
}

function addEntry(dayIndex: number) {
  draftDays.value[dayIndex]?.entries.push({
    time: '06:00',
    temperature: 21,
  })
}

function removeEntry(dayIndex: number, entryIndex: number) {
  draftDays.value[dayIndex]?.entries.splice(entryIndex, 1)
}

function updateEntryTime(dayIndex: number, entryIndex: number, value: string) {
  const entry = draftDays.value[dayIndex]?.entries[entryIndex]

  if (entry) {
    entry.time = value
  }
}

function updateEntryTemperature(dayIndex: number, entryIndex: number, value: string | number) {
  const entry = draftDays.value[dayIndex]?.entries[entryIndex]

  if (!entry) {
    return
  }

  if (value === '') {
    entry.temperature = null
    return
  }

  const numeric = typeof value === 'number' ? value : Number.parseFloat(value)
  entry.temperature = Number.isNaN(numeric) ? null : numeric
}

async function saveSchedule() {
  const payload = Object.fromEntries(
    draftDays.value.map((day) => [day.key, serializeScheduleValue(day.entries)]),
  ) as DeviceState

  isSaving.value = true
  const topic = `${devicesStore.deviceCommandTopic(props.connectionId, props.deviceName)}/set`

  const sent = useZ2M(props.connectionId).send(topic, payload)

  if (!sent) {
    toast.add({
      title: t('schedule.updateFailed'),
      description: t('devicePage.websocketDisconnected'),
      color: 'error',
    })
    isSaving.value = false
    return
  }

  devicesStore.updateDeviceState(props.connectionId, props.deviceName, payload)
  devicesStore.markDeviceTx(props.connectionId, props.deviceName)
  isSaving.value = false
  isEditorOpen.value = false

  toast.add({
    title: t('schedule.updated'),
    color: 'success',
  })
}
</script>

<template>
  <UCard
    class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
    :ui="{ body: 'p-4' }"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-calendar-range"
              class="text-base text-slate-500 dark:text-slate-400"
            />
            <p class="text-sm font-semibold text-slate-950 dark:text-white">
              {{ t('schedule.title') }}
            </p>
          </div>
          <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {{ t('schedule.description') }}
          </p>
        </div>

        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          :label="t('schedule.edit')"
          @click="openEditor"
        />
      </div>

      <div class="space-y-3 rounded-2xl bg-slate-100/70 p-3 dark:bg-slate-900/50">
        <div
          v-for="day in days"
          :key="day.key"
          class="space-y-3 rounded-2xl bg-white/80 p-3 dark:bg-slate-950/60"
        >
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {{ dayLabel(day.day) }}
              </p>
            </div>
            <UBadge color="neutral" variant="soft">
              {{ day.entries.length }} {{ t('schedule.slots') }}
            </UBadge>
          </div>

          <div class="space-y-3">
            <div
              v-if="day.entries.length"
              class="grid grid-cols-5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
            >
              <span
                v-for="marker in TIMELINE_MARKERS"
                :key="`${day.key}-${marker}`"
                class="text-left last:text-right"
              >
                {{ marker }}:00
              </span>
            </div>

            <div
              v-if="day.entries.length"
              class="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/80 p-2 dark:border-white/10 dark:bg-slate-900/70"
            >
              <div class="pointer-events-none absolute inset-y-2 left-0 right-0 grid grid-cols-4">
                <div
                  v-for="index in 4"
                  :key="index"
                  class="border-r border-dashed border-slate-300/70 last:border-r-0 dark:border-white/10"
                />
              </div>

              <!--
                The timeline is rendered on a fixed 24h scale with cyclic day semantics.
                If the first slot starts later than 00:00, the last slot from the same day
                still applies from midnight until that first change point. We prepend that
                carry-over segment so the timeline shows the real full-day schedule instead
                of leaving an artificial empty gap at the beginning of the day.
              -->
              <div class="relative h-5">
                <UTooltip
                  v-for="segment in timelineSegments(day)"
                  :key="`${day.key}-${segment.time}-${segment.temperature}`"
                  :delay-duration="0"
                  :text="`${segment.time} • ${formatTemperature(segment.temperature)}`"
                >
                  <div
                    class="absolute inset-y-0 flex items-center justify-center overflow-hidden rounded-xl border border-white/50 px-1 shadow-sm dark:border-white/10"
                    :class="segmentTone(segment.temperature)"
                    :style="{
                      left: `${segment.offsetPercent}%`,
                      width: `${segment.widthPercent}%`,
                    }"
                  >
                    <span class="truncate text-[10px] font-semibold text-white/95">
                      {{ formatTemperature(segment.temperature) }}
                    </span>
                  </div>
                </UTooltip>
              </div>
            </div>

            <div
              v-else
              class="rounded-xl border border-dashed border-slate-300/80 px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400"
            >
              {{ t('schedule.noSlots') }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <UModal
      v-model:open="isEditorOpen"
      :title="t('schedule.title')"
      :description="t('schedule.editorDescription')"
      :ui="{ content: 'sm:max-w-5xl' }"
    >
      <template #body>
        <div class="space-y-5">
          <div
            v-for="(day, dayIndex) in draftDays"
            :key="day.key"
            class="rounded-2xl bg-slate-100/80 p-4 dark:bg-slate-900/60"
          >
            <div class="mb-4 flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {{ dayLabel(day.day) }}
              </p>
              <UButton
                icon="i-lucide-plus"
                color="neutral"
                variant="ghost"
                size="sm"
                :label="t('schedule.addSlot')"
                @click="addEntry(dayIndex)"
              />
            </div>

            <div v-if="day.entries.length" class="space-y-3">
              <div
                v-for="(entry, entryIndex) in day.entries"
                :key="`${day.key}-${entryIndex}`"
                class="grid gap-3 rounded-xl bg-white/90 p-3 dark:bg-slate-950/80 md:grid-cols-[1fr_1fr_auto]"
              >
                <UFormField :label="t('schedule.time')">
                  <UInput
                    :model-value="entry.time"
                    type="time"
                    @update:model-value="
                      (value: string | number) =>
                        updateEntryTime(dayIndex, entryIndex, String(value ?? ''))
                    "
                  />
                </UFormField>

                <UFormField :label="t('schedule.temperature')">
                  <UInput
                    :model-value="entry.temperature == null ? '' : String(entry.temperature)"
                    type="number"
                    step="0.5"
                    @update:model-value="
                      (value: string | number) =>
                        updateEntryTemperature(dayIndex, entryIndex, value)
                    "
                  />
                </UFormField>

                <div class="flex items-end">
                  <UButton
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    @click="removeEntry(dayIndex, entryIndex)"
                  />
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-xl border border-dashed border-slate-300/80 px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400"
            >
              {{ t('schedule.noSlots') }}
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full items-center justify-end gap-3">
          <UButton color="neutral" variant="ghost" @click="isEditorOpen = false">
            {{ t('app.cancel') }}
          </UButton>
          <UButton :loading="isSaving" @click="saveSchedule">
            {{ t('app.save') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UCard>
</template>
