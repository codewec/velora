<script setup lang="ts">
import DevicePageShell from '@/components/device/DevicePageShell.vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  connectionId: string
  id: string
}>()
</script>

<template>
  <DevicePageShell :connection-id="connectionId" :id="id" active-tab="state">
    <template #default="{ state }">
      <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-5 sm:p-6' }">
        <div class="space-y-4">
          <p class="text-sm uppercase tracking-[0.25em] text-slate-500">{{ t('app.state') }}</p>
          <pre class="overflow-x-auto rounded-2xl bg-slate-100 p-4 text-xs text-slate-700 dark:bg-slate-950/80 dark:text-slate-300">{{ JSON.stringify(state, null, 2) }}</pre>
        </div>
      </UCard>
    </template>
  </DevicePageShell>
</template>
