<script setup lang="ts">
import { computed } from 'vue'

import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import DeviceCard from '@/components/DeviceCard.vue'
import { useDevicesStore } from '@/stores/devices'

const props = defineProps<{
  connectionId: string
}>()

const devicesStore = useDevicesStore()

const cards = computed(() =>
  devicesStore.peripheralDevices(props.connectionId).map((device) => ({
    device,
    state: devicesStore.deviceStatesFor(props.connectionId)[device.friendly_name],
  })),
)
</script>

<template>
  <UDashboardPanel id="devices">
    <template #header>
      <UDashboardNavbar title="Devices">
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
            <UBadge color="neutral" variant="subtle">zigbee2mqtt</UBadge>
            <span class="text-sm text-muted">{{ cards.length }} devices</span>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        <div
          v-if="cards.length"
          class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <DeviceCard
            v-for="entry in cards"
            :key="entry.device.ieee_address"
            :connection-id="connectionId"
            :device="entry.device"
            :state="entry.state"
          />
        </div>

        <UCard v-else class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5" :ui="{ body: 'p-8' }">
          <div class="space-y-2 text-center">
            <p class="text-lg font-semibold text-slate-950 dark:text-white">No devices received yet</p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Confirm the selected connection config and wait for `bridge/devices`.
            </p>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
