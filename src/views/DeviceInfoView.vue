<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import DevicePageShell from '@/components/device/DevicePageShell.vue'
import { useZ2M } from '@/composables/useZ2M'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import { OUI } from '@/utils/oui'
import { deviceImageUrl } from '@/utils/devicePresentation'
import { createTransactionId } from '@/utils/transaction'
import type { Device } from '@/types/z2m'

const props = defineProps<{
  connectionId: string
  id: string
}>()

const router = useRouter()
const toast = useToast()
const imageFailed = ref(false)
const isDescriptionModalOpen = ref(false)
const isSavingDescription = ref(false)
const descriptionDraft = ref('')
const isFriendlyNameModalOpen = ref(false)
const isSavingFriendlyName = ref(false)
const friendlyNameDraft = ref('')
const homeassistantRename = ref(false)
const isReconfigureModalOpen = ref(false)
const isInterviewModalOpen = ref(false)
const isRemoveModalOpen = ref(false)
const isSubmittingDangerAction = ref(false)
const removeForce = ref(false)
const removeBlock = ref(false)
const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()
const { t } = useI18n()

const baseTopic = computed(
  () => bridgeStore.infoFor(props.connectionId)?.config?.mqtt?.base_topic || 'zigbee2mqtt',
)
const homeassistantEnabled = computed(() =>
  Boolean(bridgeStore.infoFor(props.connectionId)?.config?.homeassistant?.enabled),
)

function formatHex(value: number | undefined) {
  if (value == null) {
    return t('app.unknown')
  }

  return `0x${value.toString(16).toUpperCase().padStart(4, '0')}`
}

function ouiVendor(ieeeAddress: string) {
  return OUI.get(ieeeAddress.slice(2, 8).toLowerCase()) || '?'
}

function formatLastSeen(timestamp: number | null) {
  if (!timestamp) {
    return t('app.disabled')
  }

  return new Date(timestamp).toLocaleString()
}

function metadataRows(device: Device) {
  const reportedLastSeen = devicesStore.deviceReportedLastSeen(
    props.connectionId,
    device.friendly_name,
  )
  const softwareBuild = device.software_build_id || t('app.unknown')
  const dateCode = device.date_code ? ` (${device.date_code})` : ''

  return [
    { label: t('deviceInfo.ieeeAddress'), value: device.ieee_address },
    { label: t('deviceInfo.oui'), value: ouiVendor(device.ieee_address) },
    {
      label: t('deviceInfo.vendor'),
      value: device.definition?.vendor || device.manufacturer || t('app.unknown'),
    },
    {
      label: t('deviceInfo.model'),
      value: device.definition?.model || device.model_id || t('app.unknown'),
    },
    {
      label: t('deviceInfo.zigbeeModel'),
      value: `${device.model_id || t('app.unknown')} (${device.manufacturer || t('app.unknown')})`,
    },
    { label: t('deviceInfo.type'), value: device.type },
    { label: t('deviceInfo.powerSource'), value: device.power_source || t('app.unknown') },
    {
      label: t('deviceInfo.networkAddress'),
      value:
        device.network_address != null
          ? `${device.network_address} (${formatHex(device.network_address)})`
          : t('app.unknown'),
    },
    { label: t('deviceInfo.mqttTopic'), value: `${baseTopic.value}/${device.friendly_name}` },
    { label: t('deviceInfo.softwareBuild'), value: `${softwareBuild}${dateCode}` },
    { label: t('devicePage.lastSeen'), value: formatLastSeen(reportedLastSeen) },
    {
      label: t('deviceInfo.interviewCompleted'),
      value:
        device.interview_completed == null
          ? t('app.unknown')
          : device.interview_completed
            ? t('app.yes')
            : t('app.no'),
    },
    {
      label: t('deviceInfo.supported'),
      value:
        device.supported == null ? t('app.unknown') : device.supported ? t('app.yes') : t('app.no'),
    },
    {
      label: t('app.disabled'),
      value: device.disabled == null ? t('app.no') : device.disabled ? t('app.yes') : t('app.no'),
    },
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
      title: t('devicePage.friendlyNameRequired'),
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
    transaction: createTransactionId(),
  })

  if (!sent) {
    toast.add({
      title: t('devicePage.failedRename'),
      description: t('devicePage.websocketDisconnected'),
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
    title: t('devicePage.renamed'),
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
    transaction: createTransactionId(),
  })

  if (!sent) {
    toast.add({
      title: t('devicePage.failedUpdateDescription'),
      description: t('devicePage.websocketDisconnected'),
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
    title: t('devicePage.descriptionUpdated'),
    description: nextDescription || t('devicePage.descriptionCleared'),
    color: 'success',
  })
}

function openRemoveModal() {
  removeForce.value = false
  removeBlock.value = false
  isRemoveModalOpen.value = true
}

async function runDangerAction(
  topic:
    | 'bridge/request/device/configure'
    | 'bridge/request/device/interview'
    | 'bridge/request/device/remove',
  payload: Record<string, unknown>,
  successTitle: string,
  successDescription?: string,
) {
  isSubmittingDangerAction.value = true

  const sent = useZ2M(props.connectionId).send(topic, {
    ...payload,
    transaction: createTransactionId(),
  })

  if (!sent) {
    toast.add({
      title: t('devicePage.dangerActionFailed'),
      description: t('devicePage.websocketDisconnected'),
      color: 'error',
    })
    isSubmittingDangerAction.value = false
    return false
  }

  toast.add({
    title: successTitle,
    description: successDescription,
    color: 'success',
  })

  isSubmittingDangerAction.value = false
  return true
}

async function reconfigureDevice(device: Device) {
  const done = await runDangerAction(
    'bridge/request/device/configure',
    { id: device.ieee_address },
    t('devicePage.reconfigureStarted'),
    device.friendly_name,
  )

  if (done) {
    isReconfigureModalOpen.value = false
  }
}

async function interviewDevice(device: Device) {
  const done = await runDangerAction(
    'bridge/request/device/interview',
    { id: device.ieee_address },
    t('devicePage.interviewStarted'),
    device.friendly_name,
  )

  if (done) {
    isInterviewModalOpen.value = false
  }
}

async function removeDevice(device: Device) {
  const done = await runDangerAction(
    'bridge/request/device/remove',
    {
      id: device.ieee_address,
      force: removeForce.value,
      block: removeBlock.value,
    },
    t('devicePage.removeRequested'),
    device.friendly_name,
  )

  if (done) {
    isRemoveModalOpen.value = false

    if (removeForce.value) {
      router.push(`/connections/${props.connectionId}`)
    }
  }
}
</script>

<template>
  <DevicePageShell :connection-id="connectionId" :id="id" active-tab="info">
    <template #default="{ device }">
      <div class="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <UCard
          class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-slate-950/50"
          :ui="{ body: 'p-5 sm:p-6' }"
        >
          <div class="space-y-4">
            <p class="text-sm uppercase tracking-[0.25em] text-slate-500">
              {{ t('app.metadata') }}
            </p>

            <dl class="grid gap-x-6 gap-y-4 md:grid-cols-2">
              <div>
                <dt class="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-500">
                  <span>{{ t('devicePage.friendlyName') }}</span>
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
                  <span>{{ t('devicePage.description') }}</span>
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="openDescriptionModal(device)"
                  />
                </dt>
                <dd class="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {{
                    device.description ||
                    device.definition?.description ||
                    t('deviceInfo.descriptionFallback')
                  }}
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

        <div class="space-y-6">
          <div
            class="flex min-h-72 items-center justify-center overflow-hidden rounded-3xl bg-slate-100/80 p-6 ring ring-slate-200 backdrop-blur dark:bg-slate-900/60 dark:ring-white/10"
          >
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

          <UCard
            class="border-rose-200/80 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-950/20"
            :ui="{ body: 'p-5 sm:p-6' }"
          >
            <div class="space-y-4">
              <div>
                <p class="text-sm uppercase tracking-[0.25em] text-rose-500 dark:text-rose-300">
                  {{ t('devicePage.dangerZone') }}
                </p>
                <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {{ t('devicePage.dangerZoneDescription') }}
                </p>
              </div>

              <div class="flex flex-wrap gap-3">
                <UButton
                  color="warning"
                  variant="soft"
                  icon="i-lucide-wrench"
                  :label="t('devicePage.reconfigure')"
                  @click="isReconfigureModalOpen = true"
                />
                <UButton
                  color="warning"
                  variant="soft"
                  icon="i-lucide-scan-search"
                  :label="t('devicePage.interviewDevice')"
                  @click="isInterviewModalOpen = true"
                />
                <UButton
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash-2"
                  :label="t('devicePage.removeDevice')"
                  @click="openRemoveModal"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <UModal v-model:open="isDescriptionModalOpen" :title="t('devicePage.updateDescription')">
        <template #body>
          <div class="space-y-4">
            <UFormField :label="t('devicePage.description')" name="description">
              <UTextarea v-model="descriptionDraft" :rows="4" autoresize class="w-full" />
            </UFormField>
          </div>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isDescriptionModalOpen = false">
              {{ t('app.cancel') }}
            </UButton>
            <UButton :loading="isSavingDescription" @click="device && saveDescription(device)">
              {{ t('app.save') }}
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isFriendlyNameModalOpen" :title="t('devicePage.renameDevice')">
        <template #body>
          <div class="space-y-4">
            <UFormField :label="t('devicePage.friendlyName')" name="friendly_name">
              <UInput v-model="friendlyNameDraft" class="w-full" />
            </UFormField>

            <UCheckbox
              v-if="homeassistantEnabled"
              v-model="homeassistantRename"
              :label="t('devicePage.updateHomeAssistantEntityId')"
            />
          </div>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isFriendlyNameModalOpen = false">
              {{ t('app.cancel') }}
            </UButton>
            <UButton :loading="isSavingFriendlyName" @click="device && saveFriendlyName(device)">
              {{ t('devicePage.renameDevice') }}
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isReconfigureModalOpen" :title="t('devicePage.reconfigure')">
        <template #body>
          <p class="text-sm text-slate-600 dark:text-slate-300">
            {{ t('devicePage.reconfigureDescription') }}
          </p>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isReconfigureModalOpen = false">
              {{ t('app.cancel') }}
            </UButton>
            <UButton
              color="warning"
              :loading="isSubmittingDangerAction"
              @click="device && reconfigureDevice(device)"
            >
              {{ t('devicePage.reconfigure') }}
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isInterviewModalOpen" :title="t('devicePage.interviewDevice')">
        <template #body>
          <p class="text-sm text-slate-600 dark:text-slate-300">
            {{ t('devicePage.interviewDescription') }}
          </p>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isInterviewModalOpen = false">
              {{ t('app.cancel') }}
            </UButton>
            <UButton
              color="warning"
              :loading="isSubmittingDangerAction"
              @click="device && interviewDevice(device)"
            >
              {{ t('devicePage.interviewDevice') }}
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isRemoveModalOpen" :title="t('devicePage.removeDevice')">
        <template #body>
          <div class="space-y-4">
            <p class="text-sm text-slate-600 dark:text-slate-300">
              {{ t('devicePage.removeDescription') }}
            </p>

            <UCheckbox
              v-model="removeForce"
              :label="t('devicePage.removeForce')"
              :description="t('devicePage.removeForceDescription')"
            />

            <UCheckbox
              v-model="removeBlock"
              :label="t('devicePage.removeBlock')"
              :description="t('devicePage.removeBlockDescription')"
            />
          </div>
        </template>

        <template #footer>
          <div class="flex w-full items-center justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isRemoveModalOpen = false">
              {{ t('app.cancel') }}
            </UButton>
            <UButton
              color="error"
              :loading="isSubmittingDangerAction"
              @click="device && removeDevice(device)"
            >
              {{ t('devicePage.removeDevice') }}
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </DevicePageShell>
</template>
