<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useLogsStore } from '@/stores/logs'

const props = defineProps<{
  connectionId: string
}>()

const z2m = computed(() => useZ2M(props.connectionId))
const logsStore = useLogsStore()
const logs = computed(() => logsStore.logsFor(props.connectionId))
const rawMode = ref(false)
const { t } = useI18n()

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

function clearLogs() {
  logsStore.clear(props.connectionId)
  z2m.value.clearLogs()
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
            <span class="text-sm text-muted">{{ t('logsPage.entries', { count: logs.length }) }}</span>
          </div>
        </template>

        <template #right>
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm text-muted">{{ t('logsPage.raw') }}</span>
              <USwitch v-model="rawMode" />
            </div>
            <UButton color="neutral" variant="ghost" :label="t('app.clear')" @click="clearLogs" />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="logs.length" class="space-y-2">
        <UCard
          v-for="entry in logs"
          :key="entry.id"
          class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
          :ui="{ body: rawMode ? 'p-0' : 'p-3' }"
        >
          <template v-if="rawMode">
            <pre class="overflow-x-auto p-3 text-xs leading-5" :class="rawClass(entry.level)">{{ `[${entry.timestamp}] ${entry.kind} ${entry.level}
${entry.raw}` }}</pre>
          </template>

          <template v-else>
            <div class="flex items-center justify-between gap-3 text-xs">
              <div class="flex items-center gap-2">
                <UBadge :color="badgeColor(entry.level)" variant="subtle">{{ entry.level }}</UBadge>
                <UBadge color="neutral" variant="soft">{{ entry.kind }}</UBadge>
              </div>
              <span class="text-muted">{{ entry.timestamp }}</span>
            </div>
            <p class="mt-2 text-sm text-highlighted">{{ entry.summary }}</p>
          </template>
        </UCard>
      </div>

      <UCard v-else class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5" :ui="{ body: 'p-8' }">
        <div class="space-y-2 text-center">
          <p class="text-lg font-semibold text-highlighted">{{ t('logsPage.noEvents') }}</p>
          <p class="text-sm text-muted">{{ t('logsPage.noEventsDescription') }}</p>
        </div>
      </UCard>
    </template>
  </UDashboardPanel>
</template>
