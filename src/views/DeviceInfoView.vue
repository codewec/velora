<script setup lang="ts">
import { computed, ref } from 'vue'

import DevicePageShell from '@/components/device/DevicePageShell.vue'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import { OUI } from '@/utils/oui'
import { deviceImageUrl } from '@/utils/devicePresentation'
import type { Device } from '@/types/z2m'

const props = defineProps<{
  connectionId: string
  id: string
}>()

const imageFailed = ref(false)
const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()

const baseTopic = computed(() =>
  bridgeStore.infoFor(props.connectionId)?.config?.mqtt?.base_topic || 'zigbee2mqtt',
)

function formatHex(value: number | undefined) {
  if (value == null) {
    return 'Unknown'
  }

  return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
}

function ouiVendor(ieeeAddress: string) {
  return OUI.get(ieeeAddress.slice(2, 8).toLowerCase()) || '?'
}

function formatLastSeen(timestamp: number | null) {
  if (!timestamp) {
    return 'Disabled'
  }

  return new Date(timestamp).toLocaleString()
}

function metadataRows(device: Device) {
  const reportedLastSeen = devicesStore.deviceReportedLastSeen(props.connectionId, device.friendly_name)
  const softwareBuild = device.software_build_id || 'Unknown'
  const dateCode = device.date_code ? ` (${device.date_code})` : ''

  return [
    { label: 'Friendly name', value: device.friendly_name },
    { label: 'IEEE address', value: device.ieee_address },
    { label: 'OUI', value: ouiVendor(device.ieee_address) },
    { label: 'Vendor', value: device.definition?.vendor || device.manufacturer || 'Unknown' },
    { label: 'Model', value: device.definition?.model || device.model_id || 'Unknown' },
    { label: 'Zigbee model', value: `${device.model_id || 'Unknown'} (${device.manufacturer || 'Unknown'})` },
    { label: 'Type', value: device.type },
    { label: 'Power source', value: device.power_source || 'Unknown' },
    { label: 'Description', value: device.description || device.definition?.description || 'Unknown' },
    { label: 'Network address', value: device.network_address != null ? `${device.network_address} (${formatHex(device.network_address)})` : 'Unknown' },
    { label: 'MQTT topic', value: `${baseTopic.value}/${device.friendly_name}` },
    { label: 'Software build', value: `${softwareBuild}${dateCode}` },
    { label: 'Last seen', value: formatLastSeen(reportedLastSeen) },
    { label: 'Interview completed', value: device.interview_completed == null ? 'Unknown' : (device.interview_completed ? 'Yes' : 'No') },
    { label: 'Supported', value: device.supported == null ? 'Unknown' : (device.supported ? 'Yes' : 'No') },
    { label: 'Disabled', value: device.disabled == null ? 'No' : (device.disabled ? 'Yes' : 'No') },
  ]
}
</script>

<template>
  <DevicePageShell :connection-id="connectionId" :id="id" active-tab="info">
    <template #default="{ device }">
      <div class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <UCard class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50" :ui="{ body: 'p-5 sm:p-6' }">
          <div class="space-y-4">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">Metadata</p>

            <dl class="grid gap-x-6 gap-y-4 md:grid-cols-2">
              <div v-for="row in metadataRows(device)" :key="row.label">
                <dt class="text-sm text-slate-400 dark:text-slate-500">
                  {{ row.label }}
                </dt>
                <dd class="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {{ row.value }}
                </dd>
              </div>
            </dl>
          </div>
        </UCard>

        <div class="flex min-h-72 items-center justify-center overflow-hidden rounded-3xl bg-slate-100/80 p-6 ring ring-slate-200 backdrop-blur dark:bg-slate-900/60 dark:ring-white/10">
          <img
            v-if="deviceImageUrl(device) && !imageFailed"
            :src="deviceImageUrl(device) || undefined"
            :alt="device.friendly_name"
            class="max-h-96 w-full object-contain"
            @error="imageFailed = true"
          />
          <span v-else class="text-6xl font-semibold text-slate-500 dark:text-slate-400">
            {{ device.friendly_name.slice(0, 1).toUpperCase() }}
          </span>
        </div>
      </div>
    </template>
  </DevicePageShell>
</template>
