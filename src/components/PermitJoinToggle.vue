<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'

import { useDevicesStore } from '@/stores/devices'
import { useBridgeStore } from '@/stores/bridge'

const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()
const props = defineProps<{
  connectionId: string
}>()

const formattedTimeout = computed(() => {
  const minutes = Math.floor(bridgeStore.permitJoinTimeout(props.connectionId) / 60)
  const seconds = bridgeStore.permitJoinTimeout(props.connectionId) % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const permitJoinOptions = computed(() => {
  const items = [
    {
      label: 'All routers',
      value: 'all',
      type: 'checkbox' as const,
      checked: bridgeStore.permitJoinTarget(props.connectionId) === 'all',
      onUpdateChecked: () => {
        bridgeStore.setPermitJoinTarget(props.connectionId, 'all')
      },
    },
  ]

  return [
    items,
    devicesStore.permitJoinDevices(props.connectionId).map((device) => ({
      label: device.friendly_name,
      description: device.description || device.definition?.description || device.ieee_address,
      value: device.friendly_name,
      type: 'checkbox' as const,
      checked: bridgeStore.permitJoinTarget(props.connectionId) === device.friendly_name,
      onUpdateChecked: () => {
        bridgeStore.setPermitJoinTarget(props.connectionId, device.friendly_name)
      },
    })),
  ]
})

const selectedTargetLabel = computed(() => {
  const target = bridgeStore.permitJoinTarget(props.connectionId)

  if (target === 'all') {
    return 'All routers'
  }

  const device = devicesStore
    .permitJoinDevices(props.connectionId)
    .find((entry) => entry.friendly_name === target)

  return device?.friendly_name || 'All routers'
})

let intervalId: ReturnType<typeof setInterval> | null = null

function handleToggle(value: boolean | undefined) {
  const enabled = Boolean(value)

  bridgeStore.setPermitJoin(
    props.connectionId,
    enabled,
    enabled ? 254 : 0,
    bridgeStore.permitJoinTarget(props.connectionId),
  )
}

onMounted(() => {
  intervalId = setInterval(() => {
    bridgeStore.tickTimeout(props.connectionId)
  }, 1000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <div class="flex items-center gap-3">
    <UDropdownMenu :items="permitJoinOptions" :content="{ align: 'end', sideOffset: 10 }">
      <UButton
        color="neutral"
        variant="ghost"
        trailing-icon="i-lucide-chevron-down"
        :label="selectedTargetLabel"
      />
    </UDropdownMenu>

    <span v-if="bridgeStore.permitJoin(connectionId)" class="text-sm text-muted min-w-11 text-right">
      {{ formattedTimeout }}
    </span>

    <USwitch
      :model-value="bridgeStore.permitJoin(connectionId)"
      color="success"
      @update:model-value="handleToggle"
    />
  </div>
</template>
