<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useBridgeStore } from '@/stores/bridge'

const props = defineProps<{
  connectionId: string
  ieeeAddress: string
}>()

const { t } = useI18n()
const bridgeStore = useBridgeStore()

const session = computed(() =>
  bridgeStore.interviewSessionState(props.connectionId, props.ieeeAddress),
)

const text = computed(() => {
  const current = session.value

  if (!current) {
    return ''
  }

  switch (current.status) {
    case 'requested':
      return t('interview.requested')
    case 'interview_started':
      return t('interview.started')
    case 'successful':
      return t('interview.completed')
    case 'failed':
      return current.error || t('interview.failed')
    default:
      return t('interview.joined')
  }
})
</script>

<template>
  <span>{{ text }}</span>
</template>
