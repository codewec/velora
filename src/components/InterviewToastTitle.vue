<script setup lang="ts">
import { computed } from 'vue'

import { useBridgeStore } from '@/stores/bridge'

const props = defineProps<{
  connectionId: string
  ieeeAddress: string
}>()

const bridgeStore = useBridgeStore()

const label = computed(() => {
  return (
    bridgeStore.interviewSessionState(props.connectionId, props.ieeeAddress)?.friendlyName ||
    props.ieeeAddress
  )
})
</script>

<template>
  <span>{{ label }}</span>
</template>
