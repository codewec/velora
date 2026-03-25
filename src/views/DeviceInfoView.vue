<script setup lang="ts">
import { computed, ref } from 'vue'

import DevicePageShell from '@/components/device/DevicePageShell.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import { OUI } from '@/utils/oui'
import { deviceImageUrl } from '@/utils/devicePresentation'
import type { Device } from '@/types/z2m'

const props = defineProps<{
  connectionId: string
  id: string
}>()

const toast = useToast()
const imageFailed = ref(false)
const isDescriptionModalOpen = ref(false)
const isSavingDescription = ref(false)
const descriptionDraft = ref('')
const isFriendlyNameModalOpen = ref(false)
const isSavingFriendlyName = ref(false)
const friendlyNameDraft = ref('')
const homeassistantRename = ref(false)
const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()

const baseTopic = computed(() =>
  bridgeStore.infoFor(props.connectionId)?.config?.mqtt?.base_topic || 'zigbee2mqtt',
)
const homeassistantEnabled = computed(() =>
  Boolean(bridgeStore.infoFor(props.connectionId)?.config?.homeassistant?.enabled),
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
    { label: 'IEEE address', value: device.ieee_address },
    { label: 'OUI', value: ouiVendor(device.ieee_address) },
    { label: 'Vendor', value: device.definition?.vendor || device.manufacturer || 'Unknown' },
    { label: 'Model', value: device.definition?.model || device.model_id || 'Unknown' },
    { label: 'Zigbee model', value: `${device.model_id || 'Unknown'} (${device.manufacturer || 'Unknown'})` },
    { label: 'Type', value: device.type },
    { label: 'Power source', value: device.power_source || 'Unknown' },
    { label: 'Network address', value: device.network_address != null ? `${device.network_address} (${formatHex(device.network_address)})` : 'Unknown' },
    { label: 'MQTT topic', value: `${baseTopic.value}/${device.friendly_name}` },
    { label: 'Software build', value: `${softwareBuild}${dateCode}` },
    { label: 'Last seen', value: formatLastSeen(reportedLastSeen) },
    { label: 'Interview completed', value: device.interview_completed == null ? 'Unknown' : (device.interview_completed ? 'Yes' : 'No') },
    { label: 'Supported', value: device.supported == null ? 'Unknown' : (device.supported ? 'Yes' : 'No') },
    { label: 'Disabled', value: device.disabled == null ? 'No' : (device.disabled ? 'Yes' : 'No') },
  ]
}

function openFriendlyNameModal(device: Device) {
  friendlyNameDraft.value = device.friendly_name
  homeassistantRename.value = false
  isFriendlyNameModalOpen.value = true
}

function openDescriptionModal(device: Device) {
  descriptionDraft.value = device.description || ''
  isDescriptionModalOpen.value = true
}

async function saveFriendlyName(device: Device) {
  isSavingFriendlyName.value = true

  const nextFriendlyName = friendlyNameDraft.value.trim()

  if (!nextFriendlyName) {
    toast.add({
      title: 'Friendly name is required',
      color: 'error',
    })
    isSavingFriendlyName.value = false
    return
  }

  const previousFriendlyName = device.friendly_name
  const sent = useZ2M(props.connectionId).send('bridge/request/device/rename', {
    from: previousFriendlyName,
    to: nextFriendlyName,
    homeassistant_rename: homeassistantRename.value,
  })

  if (!sent) {
    toast.add({
      title: 'Failed to rename device',
      description: 'WebSocket is not connected.',
      color: 'error',
    })
    isSavingFriendlyName.value = false
    return
  }

  // Apply the rename optimistically after the command has been sent. The
  // backend will eventually publish refreshed device inventory, but updating the
  // local stores immediately keeps the current page, toolbar tabs and cached
  // per-device state consistent during that roundtrip.
  devicesStore.renameDevice(props.connectionId, device.ieee_address, nextFriendlyName)
  isSavingFriendlyName.value = false
  isFriendlyNameModalOpen.value = false

  toast.add({
    title: 'Device renamed',
    description: `${previousFriendlyName} -> ${nextFriendlyName}`,
    color: 'success',
  })
}

async function saveDescription(device: Device) {
  isSavingDescription.value = true

  const nextDescription = descriptionDraft.value.trim()
  const sent = useZ2M(props.connectionId).send('bridge/request/device/options', {
    id: device.ieee_address,
    options: {
      description: nextDescription,
    },
  })

  if (!sent) {
    toast.add({
      title: 'Failed to update description',
      description: 'WebSocket is not connected.',
      color: 'error',
    })
    isSavingDescription.value = false
    return
  }

  // Mirror the edited description locally right away so the info page and the
  // device list reflect the change without waiting for a full bridge/devices
  // refresh from Zigbee2MQTT.
  devicesStore.updateDeviceDescription(props.connectionId, device.ieee_address, nextDescription)
  isSavingDescription.value = false
  isDescriptionModalOpen.value = false

  toast.add({
    title: 'Description updated',
    description: nextDescription || 'Description cleared',
    color: 'success',
  })
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
              <div>
                <dt class="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                  <span>Friendly name</span>
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="openFriendlyNameModal(device)"
                  />
                </dt>
                <dd class="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {{ device.friendly_name }}
                </dd>
              </div>

              <div>
                <dt class="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                  <span>Description</span>
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="openDescriptionModal(device)"
                  />
                </dt>
                <dd class="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {{ device.description || device.definition?.description || 'Unknown' }}
                </dd>
              </div>

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

      <UModal v-model:open="isDescriptionModalOpen" title="Update description">
        <template #body>
          <div class="space-y-4">
            <UFormField label="Description" name="description">
              <UTextarea
                v-model="descriptionDraft"
                :rows="4"
                autoresize
                class="w-full"
              />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isDescriptionModalOpen = false">
              Cancel
            </UButton>
            <UButton :loading="isSavingDescription" @click="device && saveDescription(device)">
              Save
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isFriendlyNameModalOpen" title="Rename device">
        <template #body>
          <div class="space-y-4">
            <UFormField label="Friendly name" name="friendly_name">
              <UInput v-model="friendlyNameDraft" class="w-full" />
            </UFormField>

            <UCheckbox
              v-if="homeassistantEnabled"
              v-model="homeassistantRename"
              label="Update Home Assistant entity ID"
            />
          </div>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isFriendlyNameModalOpen = false">
              Cancel
            </UButton>
            <UButton :loading="isSavingFriendlyName" @click="device && saveFriendlyName(device)">
              Rename
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </DevicePageShell>
</template>
