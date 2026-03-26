<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useZ2M } from '@/composables/useZ2M'
import PermitJoinToggle from '@/components/PermitJoinToggle.vue'

const props = defineProps<{
  connectionId: string
}>()

const isStatusDrawerOpen = ref(false)
const z2m = computed(() => useZ2M(props.connectionId))
const connectionLogs = computed(() => z2m.value.logs.value)
const { t } = useI18n()

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
</script>

<template>
  <div class="flex items-center gap-3">
    <PermitJoinToggle :connection-id="connectionId" />
    <UButton
      :color="statusColor"
      variant="ghost"
      :icon="statusIcon"
      :label="statusLabel"
      class="data-[state=open]:bg-elevated"
      @click="isStatusDrawerOpen = true"
    />
  </div>

  <USlideover
    v-model:open="isStatusDrawerOpen"
    :title="t('app.connectionLog')"
    :description="t('app.connectionLogDescription', { connectionId })"
    side="right"
  >
    <template #body>
      <div
        class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-white/10"
      >
        <div class="flex items-center gap-2">
          <span
            class="h-2.5 w-2.5 rounded-full"
            :class="{
              'bg-emerald-500': z2m.isConnected.value,
              'bg-amber-500': !z2m.isConnected.value && z2m.isReconnecting.value,
              'bg-rose-500': !z2m.isConnected.value && !z2m.isReconnecting.value,
            }"
          />
          <span class="text-sm font-medium text-slate-700 dark:text-slate-200">{{
            statusLabel
          }}</span>
        </div>

        <UButton color="neutral" variant="ghost" :label="t('app.clear')" @click="z2m.clearLogs()" />
      </div>

      <div v-if="connectionLogs.length" class="mt-4 space-y-3">
        <div
          v-for="entry in connectionLogs"
          :key="`${entry.timestamp}-${entry.message}`"
          class="rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-slate-950/60"
        >
          <div class="mb-1 flex items-center justify-between gap-3 text-xs">
            <UBadge
              :color="
                entry.level === 'error'
                  ? 'error'
                  : entry.level === 'warning'
                    ? 'warning'
                    : 'neutral'
              "
              variant="subtle"
            >
              {{ entry.level }}
            </UBadge>
            <span class="text-slate-400 dark:text-slate-500">{{ entry.timestamp }}</span>
          </div>
          <p class="text-sm text-slate-700 dark:text-slate-300">{{ entry.message }}</p>
        </div>
      </div>

      <div
        v-else
        class="mt-4 rounded-2xl border border-dashed border-slate-300/80 p-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400"
      >
        {{ t('app.noTransportEvents') }}
      </div>
    </template>
  </USlideover>
</template>
