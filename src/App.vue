<script setup lang="ts">
import AppLayout from '@/components/AppLayout.vue'
import { useInterviewToasts } from '@/composables/useInterviewToasts'
import { usePermitJoinToasts } from '@/composables/usePermitJoinToasts'
import { useZ2MInit } from '@/composables/useZ2MInit'

useZ2MInit()
useInterviewToasts()
usePermitJoinToasts()
</script>

<template>
  <UApp :toaster="{ position: 'bottom-right', expand: false }">
    <AppLayout>
      <RouterView />
    </AppLayout>
  </UApp>
</template>
