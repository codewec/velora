<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { Expose } from '@/types/z2m'
import { featureDescription, featureEndpoint, featureIcon, featureTitle } from '@/utils/featureMeta'

const { t } = useI18n()

defineProps<{
  expose: Expose
  hideEndpoint?: boolean
}>()
</script>

<template>
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <UIcon :name="featureIcon(expose)" class="text-base text-slate-500 dark:text-slate-400" />
      <p class="text-sm font-semibold text-slate-950 dark:text-white">{{ featureTitle(expose) }}</p>
      <span v-if="!hideEndpoint && featureEndpoint(expose)" class="text-xs text-slate-400 dark:text-slate-500">
        ({{ t('devicePage.endpoint', { endpoint: featureEndpoint(expose) }) }})
      </span>
    </div>
    <p v-if="featureDescription(expose)" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
      {{ featureDescription(expose) }}
    </p>
  </div>
</template>
