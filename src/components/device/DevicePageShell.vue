<script setup lang="ts">
import { computed } from 'vue'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'

import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import { useIndicatorHistoryPreference } from '@/composables/useIndicatorHistoryPreference'
import { useSmartGroupingPreference } from '@/composables/useSmartGroupingPreference'
import { useDevicesStore } from '@/stores/devices'
import { deviceDisplaySubtitle, deviceDisplayTitle } from '@/utils/devicePresentation'

const props = defineProps<{
  connectionId: string
  id: string
  activeTab: 'exposes' | 'info' | 'state'
  showHistoryToggle?: boolean
  showSmartGroupingToggle?: boolean
}>()

const devicesStore = useDevicesStore()
const { t } = useI18n()
const { enabled: historyEnabled } = useIndicatorHistoryPreference()
const { enabled: smartGroupingEnabled } = useSmartGroupingPreference()

const device = computed(() => devicesStore.deviceById(props.connectionId, props.id))
const state = computed(() =>
  device.value
    ? (devicesStore.deviceStatesFor(props.connectionId)[device.value.friendly_name] ?? {})
    : {},
)

const title = computed(() =>
  device.value ? deviceDisplayTitle(device.value) : t('devicePage.notFound'),
)
const subtitle = computed(() => (device.value ? deviceDisplaySubtitle(device.value) : props.id))

const tabs = computed<NavigationMenuItem[]>(() => [
  {
    label: t('devicePage.exposes'),
    to: `/connections/${props.connectionId}/devices/${props.id}/exposes`,
    active: props.activeTab === 'exposes',
  },
  {
    label: t('devicePage.info'),
    to: `/connections/${props.connectionId}/devices/${props.id}/info`,
    active: props.activeTab === 'info',
  },
  {
    label: t('devicePage.state'),
    to: `/connections/${props.connectionId}/devices/${props.id}/state`,
    active: props.activeTab === 'state',
  },
])
</script>

<template>
  <UDashboardPanel id="device" :ui="{ body: 'lg:py-8' }">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #title>
          <div class="min-w-0 flex items-center gap-3">
            <p class="truncate text-base font-semibold text-slate-950 dark:text-white">
              {{ title }}
            </p>
            <p class="truncate text-sm text-slate-500 dark:text-slate-400">
              {{ subtitle }}
            </p>
          </div>
        </template>

        <template #right>
          <ConnectionNavbarActions :connection-id="connectionId" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar v-if="device">
        <template #left>
          <UNavigationMenu :items="tabs" highlight class="-mx-1 flex-1" />
        </template>

        <template #right>
          <div class="flex items-center gap-6">
            <div v-if="showSmartGroupingToggle" class="flex items-center gap-3">
              <span class="text-sm text-slate-500 dark:text-slate-400">{{
                t('devicePage.smartGrouping')
              }}</span>
              <USwitch v-model="smartGroupingEnabled" />
            </div>

            <div v-if="showHistoryToggle" class="flex items-center gap-3">
              <span class="text-sm text-slate-500 dark:text-slate-400">{{
                t('devicePage.recordHistory')
              }}</span>
              <USwitch v-model="historyEnabled" />
            </div>
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <slot v-if="device" :device="device" :state="state" />

      <UAlert
        v-else
        color="error"
        variant="subtle"
        :title="t('devicePage.notFound')"
        :description="t('devicePage.notFoundDescription')"
      />
    </template>
  </UDashboardPanel>
</template>
