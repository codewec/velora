<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import LogDetailsModal from '@/components/LogDetailsModal.vue'
import { useErrorLogToasts } from '@/composables/useErrorLogToasts'
import { useInterviewToasts } from '@/composables/useInterviewToasts'
import { usePermitJoinToasts } from '@/composables/usePermitJoinToasts'
import { useUiColorPreferences } from '@/composables/useUiColorPreferences'
import { useZ2MInit } from '@/composables/useZ2MInit'

useZ2MInit()
useErrorLogToasts()
useInterviewToasts()
usePermitJoinToasts()
useUiColorPreferences()
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', expand: true, max: 6 }">
    <AppLayout>
      <RouterView />
    </AppLayout>
    <LogDetailsModal />
  </UApp>
</template>
