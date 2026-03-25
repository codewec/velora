<script setup lang="ts">
import frontendPackageJson from '../../package.json' with { type: 'json' }
import { computed } from 'vue'

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
const z2m = computed(() => useZ2M(props.connectionId))
const bridgeInfo = computed(() => bridgeStore.infoFor(props.connectionId))
const bridgeHealth = computed(() => bridgeStore.healthFor(props.connectionId))
const devices = computed(() => devicesStore.devicesFor(props.connectionId))
const connection = computed(() => getZ2MConnectionConfig(props.connectionId))
const multiInstance = computed(() => getZ2MConnectionConfigs().length > 1)

function formatDateTime(value: number | undefined) {
  if (!value) {
    return 'Unknown'
  }

  return new Date(value).toLocaleString()
}

function formatDuration(seconds: number | undefined) {
  if (typeof seconds !== 'number') {
    return 'Unknown'
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
    return 'Unknown'
  }

  return String(meta.revision ?? 'Unknown')
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

    const key = device.power_source || 'Unknown'
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

    const key = device.model_id || 'Unknown'
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

    const key = device.manufacturer || 'Unknown'
    counts[key] = (counts[key] ?? 0) + 1
  }

  return counts
})
</script>

<template>
  <UDashboardPanel id="information">
    <template #header>
      <UDashboardNavbar title="Information">
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
            <p class="text-sm text-muted">Source</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ connection?.label || connectionId }}</p>
            <p class="mt-1 break-all text-xs text-muted">{{ connection?.url }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Zigbee2MQTT version</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ bridgeInfo?.version || 'Unknown' }}</p>
            <p class="mt-1 text-xs text-muted">commit: {{ bridgeInfo?.commit || 'Unknown' }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Frontend version</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ frontendPackageJson.version }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">zigbee-herdsman-converters</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ bridgeInfo?.zigbee_herdsman_converters?.version || 'Unknown' }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">zigbee-herdsman</p>
            <p class="mt-2 text-lg font-semibold text-highlighted">{{ bridgeInfo?.zigbee_herdsman?.version || 'Unknown' }}</p>
          </UCard>
        </div>

        <div class="grid gap-4 xl:grid-cols-4">
          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Machine</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.os?.version || 'Unknown' }}</p>
            <p class="mt-1 text-sm text-muted">CPU: {{ bridgeInfo?.os?.cpus ?? 'Unknown' }}</p>
            <p class="text-sm text-muted">RAM: {{ bridgeInfo?.os?.memory_mb ?? 'Unknown' }} MB</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">MQTT</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.mqtt?.server || bridgeInfo?.config?.mqtt?.server || 'Unknown' }}</p>
            <p class="mt-1 text-sm text-muted">Version: {{ bridgeInfo?.mqtt?.version || 'Unknown' }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Node version</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.os?.node_version || 'Unknown' }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Coordinator</p>
            <p class="mt-2 text-base font-semibold text-highlighted">{{ bridgeInfo?.coordinator?.type || 'Unknown' }}</p>
            <p class="mt-1 break-all text-xs text-muted">{{ bridgeInfo?.coordinator?.ieee_address || 'Unknown' }}</p>
            <p class="text-sm text-muted">Revision: {{ coordinatorRevision }}</p>
          </UCard>
        </div>

        <div class="grid gap-4 xl:grid-cols-4">
          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Stats: total</p>
            <p class="mt-2 text-2xl font-semibold text-highlighted">{{ Math.max(devices.length - 1, 0) }}</p>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Stats: by type</p>
            <div class="mt-2 space-y-1 text-sm text-highlighted">
              <p v-for="(count, key) in statsByType" :key="key">{{ key }}: {{ count }}</p>
            </div>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Stats: by power source</p>
            <div class="mt-2 space-y-1 text-sm text-highlighted">
              <p v-for="(count, key) in statsByPowerSource" :key="key">{{ key }}: {{ count }}</p>
            </div>
          </UCard>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">Stats: by vendor</p>
            <div class="mt-2 space-y-1 text-sm text-highlighted">
              <p v-for="(count, key) in statsByVendor" :key="key">{{ key }}: {{ count }}</p>
            </div>
          </UCard>
        </div>

        <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
          <p class="text-sm text-muted">Stats: by model</p>
          <div class="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <p v-for="(count, key) in statsByModel" :key="key" class="text-sm text-highlighted">{{ key }}: {{ count }}</p>
          </div>
        </UCard>

        <UAlert
          v-if="!bridgeHealth || bridgeHealth.response_time === 0"
          color="info"
          variant="subtle"
          title="Awaiting next health check"
          description="bridge/health has not been received yet."
        />

        <template v-else>
          <div class="grid gap-4 xl:grid-cols-3">
            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">OS</p>
              <p v-if="bridgeHealth.os.load_average.some(value => value !== 0)" class="mt-2 text-base font-semibold text-highlighted">
                Load average: {{ bridgeHealth.os.load_average.join(', ') }}
              </p>
              <p class="mt-2 text-base font-semibold text-highlighted">RAM: {{ bridgeHealth.os.memory_percent }}%</p>
              <p class="text-sm text-muted">{{ bridgeHealth.os.memory_used_mb }} MB used</p>
              <p class="mt-2 text-xs text-muted">Last check: {{ formatDateTime(bridgeHealth.response_time) }}</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">Process</p>
              <p class="mt-2 text-base font-semibold text-highlighted">Uptime: {{ formatDuration(bridgeHealth.process.uptime_sec) }}</p>
              <p class="mt-2 text-base font-semibold text-highlighted">RAM: {{ bridgeHealth.process.memory_percent }}%</p>
              <p class="text-sm text-muted">{{ bridgeHealth.process.memory_used_mb }} MB used</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">MQTT health</p>
              <p class="mt-2 text-base font-semibold" :class="bridgeHealth.mqtt.connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                {{ bridgeHealth.mqtt.connected ? 'Connected' : 'Disconnected' }}
              </p>
              <p class="mt-1 text-sm text-muted">Queued: {{ bridgeHealth.mqtt.queued }}</p>
              <p class="text-sm text-muted">Published: {{ bridgeHealth.mqtt.published }}</p>
              <p class="text-sm text-muted">Received: {{ bridgeHealth.mqtt.received }}</p>
            </UCard>
          </div>

          <div class="grid gap-4 xl:grid-cols-3">
            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">WebSocket</p>
              <p class="mt-2 text-base font-semibold" :class="z2m.isConnected.value ? 'text-emerald-600 dark:text-emerald-400' : (z2m.isReconnecting.value ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')">
                {{ z2m.isConnected.value ? 'Connected' : (z2m.isReconnecting.value ? 'Reconnecting' : 'Disconnected') }}
              </p>
              <p class="mt-1 text-sm text-muted">Reconnects: {{ z2m.metrics.value.reconnects }}</p>
              <p class="text-sm text-muted">Pending requests: {{ z2m.metrics.value.pendingRequests }}</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">WebSocket traffic</p>
              <p class="mt-2 text-sm text-highlighted">Last message: {{ z2m.metrics.value.lastMessageTs ? formatDateTime(z2m.metrics.value.lastMessageTs) : 'Unknown' }}</p>
              <p class="mt-1 text-sm text-muted">Sent: {{ z2m.metrics.value.messagesSent }} · {{ formatMb(z2m.metrics.value.bytesSent) }}</p>
              <p class="text-sm text-muted">Received: {{ z2m.metrics.value.messagesReceived }} · {{ formatMb(z2m.metrics.value.bytesReceived) }}</p>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <p class="text-sm text-muted">WebSocket received split</p>
              <p class="mt-2 text-sm text-highlighted">Bridge: {{ z2m.metrics.value.messagesBridge }}</p>
              <p class="mt-1 text-sm text-muted">Devices: {{ z2m.metrics.value.messagesDevice }}</p>
            </UCard>
          </div>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-0' }">
            <div class="border-b border-default px-4 py-3">
              <p class="text-sm font-semibold text-highlighted">Device health</p>
            </div>
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-default/60 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th class="px-4 py-3">Friendly name</th>
                    <th class="px-4 py-3">IEEE address</th>
                    <th class="px-4 py-3">Messages</th>
                    <th class="px-4 py-3">Messages/sec</th>
                    <th class="px-4 py-3">Leave count</th>
                    <th class="px-4 py-3">Network address changes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in deviceHealthRows" :key="row.device.ieee_address" class="border-t border-default">
                    <td class="px-4 py-3 text-highlighted">{{ row.device.friendly_name }}</td>
                    <td class="px-4 py-3 font-mono text-muted">{{ row.device.ieee_address }}</td>
                    <td class="px-4 py-3 text-highlighted">{{ row.health.messages ?? 0 }}</td>
                    <td class="px-4 py-3" :class="(row.health.messages_per_sec ?? 0) > 3 ? 'text-rose-600 dark:text-rose-400' : ((row.health.messages_per_sec ?? 0) > 1 ? 'text-amber-600 dark:text-amber-400' : ((row.health.messages_per_sec ?? 0) < 0.2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-highlighted'))">
                      {{ (row.health.messages_per_sec ?? 0) <= 0.001 ? 'Very low' : (row.health.messages_per_sec ?? 0) }}
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
