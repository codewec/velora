<script setup lang="ts">
import frontendPackageJson from '../../package.json' with { type: 'json' }
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import { getZ2MConnectionConfig, getZ2MConnectionConfigs } from '@/config/z2mConnections'
import { useZ2M } from '@/composables/useZ2M'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import type { BridgeHealthDevice, Device } from '@/types/z2m'

const props = defineProps<{
  connectionId: string
}>()

const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()
const { t } = useI18n()
const z2m = computed(() => useZ2M(props.connectionId))
const bridgeInfo = computed(() => bridgeStore.infoFor(props.connectionId))
const bridgeHealth = computed(() => bridgeStore.healthFor(props.connectionId))
const devices = computed(() => devicesStore.devicesFor(props.connectionId))
const connection = computed(() => getZ2MConnectionConfig(props.connectionId))
const multiInstance = computed(() => getZ2MConnectionConfigs().length > 1)

function formatDateTime(value: number | undefined) {
  if (!value) {
    return t('app.unknown')
  }

  return new Date(value).toLocaleString()
}

function formatDuration(seconds: number | undefined) {
  if (typeof seconds !== 'number') {
    return t('app.unknown')
  }

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

function formatMb(bytes: number) {
  return `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`
}

const coordinatorRevision = computed(() => {
  const meta = bridgeInfo.value?.coordinator?.meta
  if (!meta || typeof meta !== 'object') {
    return t('app.unknown')
  }

  return String(meta.revision ?? t('app.unknown'))
})

const deviceHealthRows = computed(() => {
  const healthDevices = bridgeHealth.value?.devices ?? {}

  return Object.entries(healthDevices)
    .map(([ieee, health]) => {
      const device = devices.value.find(entry => entry.ieee_address === ieee)

      return device
        ? {
            device,
            health,
          }
        : null
    })
    .filter((value): value is { device: Device, health: BridgeHealthDevice } => value !== null)
    .sort((a, b) => a.device.friendly_name.localeCompare(b.device.friendly_name))
})

const statsByType = computed(() => {
  const counts: Record<string, number> = {}

  for (const device of devices.value) {
    if (device.type === 'Coordinator') {
      continue
    }

    counts[device.type] = (counts[device.type] ?? 0) + 1
  }

  return counts
})

const statsByPowerSource = computed(() => {
  const counts: Record<string, number> = {}

  for (const device of devices.value) {
    if (device.type === 'Coordinator') {
      continue
    }

    const key = device.power_source || t('app.unknown')
    counts[key] = (counts[key] ?? 0) + 1
  }

  return counts
})

const statsByModel = computed(() => {
  const counts: Record<string, number> = {}

  for (const device of devices.value) {
    if (device.type === 'Coordinator') {
      continue
    }

    const key = device.model_id || t('app.unknown')
    counts[key] = (counts[key] ?? 0) + 1
  }

  return counts
})

const statsByVendor = computed(() => {
  const counts: Record<string, number> = {}

  for (const device of devices.value) {
    if (device.type === 'Coordinator') {
      continue
    }

    const key = device.manufacturer || t('app.unknown')
    counts[key] = (counts[key] ?? 0) + 1
  }

  return counts
})
</script>

<template>
  <UDashboardPanel id="information">
    <template #header>
      <UDashboardNavbar :title="t('app.information')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ConnectionNavbarActions :connection-id="connectionId" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="grid gap-4 xl:grid-cols-5">
          <UCard v-if="multiInstance" class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('app.source') }}</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ connection?.label || connectionId }}</p>
            <p class="mt-1 break-all text-xs text-muted">{{ connection?.url }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.z2mVersion') }}</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ bridgeInfo?.version || t('app.unknown') }}</p>
            <p class="mt-1 text-xs text-muted">{{ t('infoPage.commit') }}: {{ bridgeInfo?.commit || t('app.unknown') }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('app.frontendVersion') }}</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ frontendPackageJson.version }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.convertersVersion') }}</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ bridgeInfo?.zigbee_herdsman_converters?.version || t('app.unknown') }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.herdsmanVersion') }}</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ bridgeInfo?.zigbee_herdsman?.version || t('app.unknown') }}</p>
          </UCard>
        </div>

        <div class="grid gap-4 xl:grid-cols-4">
          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.machine') }}</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.os?.version || t('app.unknown') }}</p>
            <p class="mt-1 text-sm text-muted">{{ t('infoPage.cpu') }}: {{ bridgeInfo?.os?.cpus ?? t('app.unknown') }}</p>
            <p class="text-sm text-muted">{{ t('infoPage.ram') }}: {{ bridgeInfo?.os?.memory_mb ?? t('app.unknown') }} MB</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.mqtt') }}</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.mqtt?.server || bridgeInfo?.config?.mqtt?.server || t('app.unknown') }}</p>
            <p class="mt-1 text-sm text-muted">{{ t('infoPage.version') }}: {{ bridgeInfo?.mqtt?.version || t('app.unknown') }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.nodeVersion') }}</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.os?.node_version || t('app.unknown') }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.coordinator') }}</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.coordinator?.type || t('app.unknown') }}</p>
            <p class="mt-1 break-all text-xs text-muted">{{ bridgeInfo?.coordinator?.ieee_address || t('app.unknown') }}</p>
            <p class="text-sm text-muted">{{ t('infoPage.revision') }}: {{ coordinatorRevision }}</p>
          </UCard>
        </div>

        <div class="grid gap-4 xl:grid-cols-4">
          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.statsTotal') }}</p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">{{ Math.max(devices.length - 1, 0) }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.statsByType') }}</p>
            <div class="mt-2 space-y-1 text-sm text-highlighted">
              <p v-for="(count, key) in statsByType" :key="key">{{ key }}: {{ count }}</p>
            </div>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.statsByPowerSource') }}</p>
            <div class="mt-2 space-y-1 text-sm text-highlighted">
              <p v-for="(count, key) in statsByPowerSource" :key="key">{{ key }}: {{ count }}</p>
            </div>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('infoPage.statsByVendor') }}</p>
            <div class="mt-2 space-y-1 text-sm text-highlighted">
              <p v-for="(count, key) in statsByVendor" :key="key">{{ key }}: {{ count }}</p>
            </div>
          </UCard>
        </div>

        <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
          <p class="text-sm text-muted">{{ t('infoPage.statsByModel') }}</p>
          <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <p v-for="(count, key) in statsByModel" :key="key" class="text-sm text-highlighted">{{ key }}: {{ count }}</p>
          </div>
        </UCard>

        <UAlert
          v-if="!bridgeHealth || bridgeHealth.response_time === 0"
          color="info"
          variant="subtle"
          :title="t('infoPage.awaitingHealth')"
          :description="t('infoPage.awaitingHealthDescription')"
        />

        <template v-else>
          <div class="grid gap-4 xl:grid-cols-3">
            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">{{ t('infoPage.os') }}</p>
              <p v-if="bridgeHealth.os.load_average.some(value => value !== 0)" class="mt-2 text-base font-semibold text-highlighted">
                {{ t('infoPage.loadAverage') }}: {{ bridgeHealth.os.load_average.join(', ') }}
              </p>
              <p class="mt-2 text-base font-semibold text-highlighted">{{ t('infoPage.ram') }}: {{ bridgeHealth.os.memory_percent }}%</p>
              <p class="text-sm text-muted">{{ t('infoPage.usedMb', { value: bridgeHealth.os.memory_used_mb }) }}</p>
              <p class="mt-2 text-xs text-muted">{{ t('infoPage.lastCheck') }}: {{ formatDateTime(bridgeHealth.response_time) }}</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">{{ t('infoPage.process') }}</p>
              <p class="mt-2 text-base font-semibold text-highlighted">{{ t('infoPage.uptime') }}: {{ formatDuration(bridgeHealth.process.uptime_sec) }}</p>
              <p class="mt-2 text-base font-semibold text-highlighted">{{ t('infoPage.ram') }}: {{ bridgeHealth.process.memory_percent }}%</p>
              <p class="text-sm text-muted">{{ t('infoPage.usedMb', { value: bridgeHealth.process.memory_used_mb }) }}</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">{{ t('infoPage.mqttHealth') }}</p>
              <p class="mt-2 text-base font-semibold" :class="bridgeHealth.mqtt.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                {{ bridgeHealth.mqtt.connected ? t('app.connected') : t('app.disconnected') }}
              </p>
              <p class="mt-1 text-sm text-muted">{{ t('infoPage.queued') }}: {{ bridgeHealth.mqtt.queued }}</p>
              <p class="text-sm text-muted">{{ t('infoPage.published') }}: {{ bridgeHealth.mqtt.published }}</p>
              <p class="text-sm text-muted">{{ t('infoPage.received') }}: {{ bridgeHealth.mqtt.received }}</p>
            </UCard>
          </div>

          <div class="grid gap-4 xl:grid-cols-3">
            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">{{ t('infoPage.websocket') }}</p>
              <p class="mt-2 text-base font-semibold" :class="z2m.isConnected.value ? 'text-emerald-600 dark:text-emerald-400' : (z2m.isReconnecting.value ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')">
                {{ z2m.isConnected.value ? t('app.connected') : (z2m.isReconnecting.value ? t('app.reconnecting') : t('app.disconnected')) }}
              </p>
              <p class="mt-1 text-sm text-muted">{{ t('infoPage.reconnects') }}: {{ z2m.metrics.value.reconnects }}</p>
              <p class="text-sm text-muted">{{ t('infoPage.pendingRequests') }}: {{ z2m.metrics.value.pendingRequests }}</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">{{ t('infoPage.websocketTraffic') }}</p>
              <p class="mt-2 text-sm text-highlighted">{{ t('infoPage.lastMessage') }}: {{ z2m.metrics.value.lastMessageTs ? formatDateTime(z2m.metrics.value.lastMessageTs) : t('app.unknown') }}</p>
              <p class="mt-1 text-sm text-muted">{{ t('infoPage.sent') }}: {{ z2m.metrics.value.messagesSent }} · {{ formatMb(z2m.metrics.value.bytesSent) }}</p>
              <p class="text-sm text-muted">{{ t('infoPage.received') }}: {{ z2m.metrics.value.messagesReceived }} · {{ formatMb(z2m.metrics.value.bytesReceived) }}</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">{{ t('infoPage.websocketReceivedSplit') }}</p>
              <p class="mt-2 text-sm text-highlighted">{{ t('infoPage.bridge') }}: {{ z2m.metrics.value.messagesBridge }}</p>
              <p class="mt-1 text-sm text-muted">{{ t('app.devices') }}: {{ z2m.metrics.value.messagesDevice }}</p>
            </UCard>
          </div>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-0' }">
            <div class="border-b border-default px-4 py-3">
              <p class="text-sm font-semibold text-highlighted">{{ t('infoPage.deviceHealth') }}</p>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-default/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th class="px-4 py-3">{{ t('devicePage.friendlyName') }}</th>
                    <th class="px-4 py-3">{{ t('deviceInfo.ieeeAddress') }}</th>
                    <th class="px-4 py-3">{{ t('infoPage.messages') }}</th>
                    <th class="px-4 py-3">{{ t('infoPage.messagesPerSec') }}</th>
                    <th class="px-4 py-3">{{ t('infoPage.leaveCount') }}</th>
                    <th class="px-4 py-3">{{ t('infoPage.networkAddressChanges') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in deviceHealthRows" :key="row.device.ieee_address" class="border-t border-default">
                    <td class="px-4 py-3 text-highlighted">{{ row.device.friendly_name }}</td>
                    <td class="px-4 py-3 font-mono text-muted">{{ row.device.ieee_address }}</td>
                    <td class="px-4 py-3 text-highlighted">{{ row.health.messages ?? 0 }}</td>
                    <td class="px-4 py-3" :class="(row.health.messages_per_sec ?? 0) > 3 ? 'text-rose-600 dark:text-rose-400' : ((row.health.messages_per_sec ?? 0) > 1 ? 'text-amber-600 dark:text-amber-400' : ((row.health.messages_per_sec ?? 0) < 0.2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-highlighted'))">
                      {{ (row.health.messages_per_sec ?? 0) <= 0.001 ? t('infoPage.veryLow') : (row.health.messages_per_sec ?? 0) }}
                    </td>
                    <td class="px-4 py-3 text-highlighted">{{ row.health.leave_count ?? 0 }}</td>
                    <td class="px-4 py-3 text-highlighted">{{ row.health.network_address_changes ?? 0 }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>
