<script setup lang="ts">
import { computed } from 'vue'
import DevicePageShell from '@/components/device/DevicePageShell.vue'
import { useI18n } from 'vue-i18n'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import { useLogDetailsStore } from '@/stores/logDetails'
import { useLogsStore } from '@/stores/logs'
import { formatBrowserDateTime } from '@/utils/dateTime'
import { compactDetails, logTargetsDevice } from '@/utils/logPresentation'

const props = defineProps<{
  connectionId: string
  id: string
}>()

const { t } = useI18n()
const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()
const logsStore = useLogsStore()
const logDetailsStore = useLogDetailsStore()

const logs = computed(() => logsStore.logsFor(props.connectionId))

function formatLastSeen(timestamp: number | null) {
  if (!timestamp) {
    return t('app.disabled')
  }

  return formatBrowserDateTime(timestamp)
}

function badgeColor(level: string) {
  if (level === 'error') return 'error'
  if (level === 'warning') return 'warning'
  if (level === 'info') return 'info'
  return 'neutral'
}
</script>

<template>
  <DevicePageShell :connection-id="connectionId" :id="id" active-tab="state">
    <template #default="{ device, state }">
      <div class="space-y-6">
        <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <div class="space-y-4">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">
              {{ t('devicePage.stateData') }}
            </p>
            <pre
              class="overflow-x-auto rounded-2xl border border-slate-200/80 bg-slate-100 p-4 text-xs text-slate-700 dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-300"
              >{{ JSON.stringify(state, null, 2) }}</pre
            >
          </div>

          <div class="space-y-4">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">
              {{ t('devicePage.stateMetrics') }}
            </p>
            <UCard
              class="h-fit border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
              :ui="{ body: 'p-5 sm:p-6' }"
            >
              <dl class="space-y-3">
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-sm text-muted">{{ t('devicePage.lastSeen') }}</dt>
                  <dd class="text-right text-sm font-medium text-highlighted">
                    {{
                      formatLastSeen(
                        devicesStore.deviceReportedLastSeen(
                          props.connectionId,
                          device.friendly_name,
                        ),
                      )
                    }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-sm text-muted">{{ t('infoPage.messages') }}</dt>
                  <dd class="text-right text-sm font-medium text-highlighted">
                    {{
                      bridgeStore.healthFor(props.connectionId)?.devices?.[device.ieee_address]
                        ?.messages ?? t('app.unknown')
                    }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-sm text-muted">{{ t('infoPage.messagesPerSec') }}</dt>
                  <dd class="text-right text-sm font-medium text-highlighted">
                    {{
                      bridgeStore.healthFor(props.connectionId)?.devices?.[device.ieee_address]
                        ?.messages_per_sec ?? t('app.unknown')
                    }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-sm text-muted">{{ t('infoPage.leaveCount') }}</dt>
                  <dd class="text-right text-sm font-medium text-highlighted">
                    {{
                      bridgeStore.healthFor(props.connectionId)?.devices?.[device.ieee_address]
                        ?.leave_count ?? t('app.unknown')
                    }}
                  </dd>
                </div>
                <div class="flex items-start justify-between gap-4">
                  <dt class="text-sm text-muted">{{ t('infoPage.networkAddressChanges') }}</dt>
                  <dd class="text-right text-sm font-medium text-highlighted">
                    {{
                      bridgeStore.healthFor(props.connectionId)?.devices?.[device.ieee_address]
                        ?.network_address_changes ?? t('app.unknown')
                    }}
                  </dd>
                </div>
              </dl>
            </UCard>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">
              {{ t('devicePage.deviceLogs') }}
            </p>
            <UBadge color="neutral" variant="subtle">
              {{
                t('devicePage.deviceLogsCount', {
                  count: logs.filter((entry) => logTargetsDevice(entry, device)).length,
                })
              }}
            </UBadge>
          </div>

          <div
            v-if="logs.filter((entry) => logTargetsDevice(entry, device)).length"
            class="space-y-2"
          >
            <UCard
              v-for="entry in logs.filter((candidate) => logTargetsDevice(candidate, device))"
              :key="entry.id"
              class="cursor-pointer border-slate-200/80 bg-white/80 transition-colors hover:bg-slate-50/90 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              :ui="{ body: 'p-3' }"
              @click="logDetailsStore.open(entry)"
            >
              <div class="flex items-center justify-between gap-3 text-xs">
                <div class="flex items-center gap-2">
                  <UBadge :color="badgeColor(entry.level)" variant="subtle">{{
                    entry.level
                  }}</UBadge>
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
            :ui="{ body: 'p-6' }"
          >
            <div class="space-y-1 text-center">
              <p class="text-sm font-semibold text-highlighted">
                {{ t('devicePage.noDeviceLogs') }}
              </p>
              <p class="text-sm text-muted">{{ t('devicePage.noDeviceLogsDescription') }}</p>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </DevicePageShell>
</template>
