<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useDevicesStore } from '@/stores/devices'
import { useLogDetailsStore } from '@/stores/logDetails'
import { useLogsStore, type LogLevel } from '@/stores/logs'
import { compactDetails, logTargetsDevice, rawLine } from '@/utils/logPresentation'

const props = defineProps<{
  connectionId: string
}>()

const z2m = computed(() => useZ2M(props.connectionId))
const logsStore = useLogsStore()
const devicesStore = useDevicesStore()
const logs = computed(() => logsStore.logsFor(props.connectionId))
const rawMode = ref(false)
const selectedLevel = ref<'all' | LogLevel>('all')
const selectedDeviceId = ref<'all' | string>('all')
const followLogs = ref(true)
const logContainer = ref<HTMLElement | null>(null)
const { t } = useI18n()
const router = useRouter()
const logDetailsStore = useLogDetailsStore()

const levelOptions = computed(() => [
  { label: t('logsPage.levelAll'), value: 'all' as const },
  { label: t('logsPage.levelError'), value: 'error' as const },
  { label: t('logsPage.levelWarning'), value: 'warning' as const },
  { label: t('logsPage.levelInfo'), value: 'info' as const },
  { label: t('logsPage.levelDebug'), value: 'debug' as const },
])

const deviceOptions = computed(() => [
  { label: t('logsPage.deviceAll'), description: '', value: 'all' as const },
  ...devicesStore.devicesFor(props.connectionId).map((device) => ({
    label: device.description?.trim() || device.friendly_name,
    description: device.friendly_name,
    value: device.ieee_address,
  })),
])

const selectedDevice = computed(() =>
  selectedDeviceId.value === 'all'
    ? null
    : (devicesStore
        .devicesFor(props.connectionId)
        .find((device) => device.ieee_address === selectedDeviceId.value) ?? null),
)

function badgeColor(level: string) {
  if (level === 'error') return 'error'
  if (level === 'warning') return 'warning'
  if (level === 'info') return 'info'
  return 'neutral'
}

function rawClass(level: string) {
  if (level === 'error') return 'text-rose-600 dark:text-rose-300'
  if (level === 'warning') return 'text-amber-700 dark:text-amber-300'
  if (level === 'info') return 'text-sky-700 dark:text-sky-300'
  return 'text-slate-700 dark:text-slate-300'
}

const filteredLogs = computed(() =>
  logs.value.filter((entry) => {
    if (selectedLevel.value !== 'all' && entry.level !== selectedLevel.value) {
      return false
    }

    if (selectedDevice.value && !logTargetsDevice(entry, selectedDevice.value)) {
      return false
    }

    return true
  }),
)

const rawEntries = computed(() =>
  [...filteredLogs.value].reverse().map((entry, index) => ({
    ...entry,
    lineNumber: index + 1,
    line: rawLine(entry, index + 1).replace(/^\d+\s/, ''),
  })),
)

function openLogDetails(id: string) {
  const entry = rawEntries.value.find((candidate) => candidate.id === id)

  if (!entry) {
    return
  }

  logDetailsStore.open(entry)
}

async function scrollToBottom() {
  const element = logContainer.value

  if (!element) {
    return
  }

  element.scrollTo({
    top: element.scrollHeight,
    behavior: 'smooth',
  })
}

function scrollToTopAndFollow() {
  const element = logContainer.value

  if (!element) {
    return
  }

  followLogs.value = false
  element.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

async function enableFollow() {
  followLogs.value = !followLogs.value

  if (!followLogs.value) {
    return
  }

  await nextTick()
  await scrollToBottom()
}

watch(
  () => [rawMode.value, rawEntries.value.length] as const,
  async ([isRaw]) => {
    await nextTick()

    if (isRaw && followLogs.value) {
      await scrollToBottom()
    }
  },
  { immediate: true },
)

function clearLogs() {
  logsStore.clear(props.connectionId)
  z2m.value.clearLogs()
}

function resetFilters() {
  selectedDeviceId.value = 'all'
  selectedLevel.value = 'all'
  rawMode.value = false
}

function openLogPreferences() {
  void router.push(`/connections/${props.connectionId}/preferences?tab=logs`)
}
</script>

<template>
  <UDashboardPanel id="logs">
    <template #header>
      <UDashboardNavbar :title="t('logsPage.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ConnectionNavbarActions :connection-id="connectionId" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <div class="flex items-center gap-3">
            <UBadge color="neutral" variant="subtle">{{ t('logsPage.appEvents') }}</UBadge>
            <span class="text-sm text-muted">{{
              t('logsPage.entries', { count: filteredLogs.length })
            }}</span>
          </div>
        </template>

        <template #right>
          <div class="flex items-center gap-3">
            <USelect
              v-model="selectedDeviceId"
              :items="deviceOptions"
              value-key="value"
              size="sm"
              class="w-56"
            >
              <template #item-description="{ item }">
                {{ item.description }}
              </template>
            </USelect>
            <USelect
              v-model="selectedLevel"
              :items="levelOptions"
              value-key="value"
              size="sm"
              class="w-36"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-sliders-horizontal"
              :label="t('app.settings')"
              @click="openLogPreferences"
            />
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-rotate-ccw"
              :label="t('logsPage.resetFilters')"
              @click="resetFilters"
            />
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted">{{ t('logsPage.raw') }}</span>
              <USwitch v-model="rawMode" />
            </div>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              :label="t('app.clear')"
              @click="clearLogs"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="filteredLogs.length && rawMode" class="relative">
        <div
          ref="logContainer"
          class="max-h-[calc(100vh-15rem)] overflow-auto rounded-2xl border border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
        >
          <div class="min-w-max font-mono text-xs">
            <div
              v-for="entry in rawEntries"
              :key="entry.id"
              class="grid cursor-pointer grid-cols-[auto_1fr] gap-4 px-4 py-2 leading-5 transition-colors hover:bg-slate-100/80 dark:hover:bg-white/5"
              :class="rawClass(entry.level)"
              @click="openLogDetails(entry.id)"
            >
              <span class="select-none text-right text-slate-400 dark:text-slate-500">
                {{ entry.lineNumber }}
              </span>
              <span class="whitespace-pre">
                {{ entry.line }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="rawMode" class="absolute right-4 bottom-4 z-10 flex items-center gap-2">
          <UButton
            icon="i-lucide-arrow-up"
            color="neutral"
            variant="solid"
            class="shadow-lg"
            @click="scrollToTopAndFollow"
          />

          <UButton
            :label="t('logsPage.follow')"
            icon="i-lucide-radio"
            :color="followLogs ? 'primary' : 'neutral'"
            :variant="followLogs ? 'solid' : 'outline'"
            class="shadow-lg"
            @click="enableFollow"
          />
        </div>
      </div>

      <div v-else-if="filteredLogs.length" class="space-y-2">
        <UCard
          v-for="entry in filteredLogs"
          :key="entry.id"
          class="cursor-pointer border-slate-200/80 bg-white/80 transition-colors hover:bg-slate-50/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          :ui="{ body: 'p-3' }"
          @click="openLogDetails(entry.id)"
        >
          <div class="flex items-center justify-between gap-3 text-xs">
            <div class="flex items-center gap-2">
              <UBadge :color="badgeColor(entry.level)" variant="subtle">{{ entry.level }}</UBadge>
              <UBadge color="neutral" variant="soft">{{ entry.kind }}</UBadge>
            </div>
            <span class="text-muted">{{ entry.timestamp }}</span>
          </div>
          <p class="mt-2 text-sm text-highlighted">{{ entry.summary }}</p>
          <p class="mt-2 truncate font-mono text-xs text-slate-500 dark:text-slate-400">
            {{ compactDetails(entry) }}
          </p>
        </UCard>
      </div>

      <UCard
        v-else
        class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
        :ui="{ body: 'p-8' }"
      >
        <div class="space-y-2 text-center">
          <p class="text-lg font-semibold text-highlighted">{{ t('logsPage.noEvents') }}</p>
          <p class="text-sm text-muted">{{ t('logsPage.noEventsDescription') }}</p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
