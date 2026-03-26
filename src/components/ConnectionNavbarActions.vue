<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

import { useZ2M } from '@/composables/useZ2M'
import PermitJoinToggle from '@/components/PermitJoinToggle.vue'
import { useLogDetailsStore } from '@/stores/logDetails'
import { useLogsStore } from '@/stores/logs'
import { compactDetails, rawLine } from '@/utils/logPresentation'

const props = defineProps<{
  connectionId: string
}>()

const router = useRouter()
const isErrorsDrawerOpen = ref(false)
const z2m = computed(() => useZ2M(props.connectionId))
const logsStore = useLogsStore()
const logDetailsStore = useLogDetailsStore()
const { t } = useI18n()
const errorLogs = computed(() =>
  logsStore
    .logsFor(props.connectionId)
    .filter((entry) => entry.level === 'error')
    .slice(0, 20),
)
const hasErrors = computed(() => errorLogs.value.length > 0)

const statusIcon = computed(() => {
  if (z2m.value.isConnected.value) {
    return 'i-lucide-wifi'
  }

  if (z2m.value.isReconnecting.value) {
    return 'i-lucide-loader-circle'
  }

  return 'i-lucide-wifi-off'
})

const statusColor = computed(() => {
  if (z2m.value.isConnected.value) {
    return 'success'
  }

  if (z2m.value.isReconnecting.value) {
    return 'warning'
  }

  return 'error'
})

const statusLabel = computed(() => {
  if (z2m.value.isConnected.value) {
    return t('app.connected')
  }

  if (z2m.value.isReconnecting.value) {
    return t('app.reconnecting')
  }

  return t('app.disconnected')
})

async function openLogDetails(id: string) {
  const entry = errorLogs.value.find((candidate) => candidate.id === id)

  if (!entry) {
    return
  }

  isErrorsDrawerOpen.value = false
  await nextTick()

  logDetailsStore.open({
    ...entry,
    line: rawLine(entry),
  })
}

function openLogsPage() {
  isErrorsDrawerOpen.value = false
  router.push(`/connections/${props.connectionId}/logs`)
}
</script>

<template>
  <div class="flex items-center gap-3">
    <PermitJoinToggle :connection-id="connectionId" />
    <UButton :color="statusColor" variant="ghost" :icon="statusIcon" :label="statusLabel" />

    <UChip :show="hasErrors" inset color="error" size="md">
      <UButton
        :color="hasErrors ? 'error' : 'neutral'"
        variant="ghost"
        icon="i-lucide-triangle-alert"
        :label="String(errorLogs.length)"
        @click="isErrorsDrawerOpen = true"
      />
    </UChip>
  </div>

  <USlideover
    v-model:open="isErrorsDrawerOpen"
    :title="t('app.errorLog')"
    :description="t('app.errorLogDescription', { connectionId })"
    side="right"
  >
    <template #body>
      <div
        class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-triangle-alert" class="text-rose-500" />
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">
            {{ t('app.errorLogCount', { count: errorLogs.length }) }}
          </span>
        </div>

        <UButton
          color="neutral"
          variant="ghost"
          :label="t('app.openLogsPage')"
          @click="openLogsPage"
        />
      </div>

      <div v-if="errorLogs.length" class="mt-4 space-y-3">
        <div
          v-for="entry in errorLogs"
          :key="entry.id"
          class="cursor-pointer rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 transition-colors hover:bg-slate-100/90 dark:border-white/10 dark:bg-slate-950/60 dark:hover:bg-slate-900/90"
          @click="openLogDetails(entry.id)"
        >
          <div class="mb-1 flex items-center justify-between gap-3 text-xs">
            <UBadge color="error" variant="subtle">{{ entry.level }}</UBadge>
            <span class="text-slate-400 dark:text-slate-500">{{ entry.timestamp }}</span>
          </div>
          <p class="text-sm font-medium text-slate-800 dark:text-slate-200">{{ entry.summary }}</p>
          <p class="mt-1 truncate font-mono text-xs text-slate-500 dark:text-slate-400">
            {{ compactDetails(entry) }}
          </p>
        </div>
      </div>

      <div
        v-else
        class="mt-4 rounded-2xl border border-dashed border-slate-300/80 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400"
      >
        {{ t('app.noErrors') }}
      </div>
    </template>
  </USlideover>
</template>
