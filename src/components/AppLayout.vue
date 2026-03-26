<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'

import { getDefaultConnectionId } from '@/config/z2mConnections'
import InstanceMenu from '@/components/InstanceMenu.vue'
import SettingsMenu from '@/components/SettingsMenu.vue'

const route = useRoute()
const { t } = useI18n()
const open = ref(false)

const connectionId = computed(() => String(route.params.connectionId || getDefaultConnectionId()))
const isDeviceRoute = computed(
  () =>
    route.name === 'device-exposes' ||
    route.name === 'device-info' ||
    route.name === 'device-state',
)

const links = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: t('app.devices'),
      icon: 'i-lucide-layout-grid',
      to: `/connections/${connectionId.value}`,
      exact:
        !isDeviceRoute.value &&
        route.name !== 'logs' &&
        route.name !== 'information' &&
        route.name !== 'network-map',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: t('app.networkMap'),
      icon: 'i-lucide-git-branch-plus',
      to: `/connections/${connectionId.value}/network-map`,
      exact: route.name === 'network-map',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: t('app.information'),
      icon: 'i-lucide-info',
      to: `/connections/${connectionId.value}/information`,
      exact: route.name === 'information',
      onSelect: () => {
        open.value = false
      },
    },
    {
      label: t('app.events'),
      icon: 'i-lucide-logs',
      to: `/connections/${connectionId.value}/logs`,
      exact: route.name === 'logs',
      onSelect: () => {
        open.value = false
      },
    },
  ],
])
</script>

<template>
  <UDashboardGroup unit="rem" storage="local">
    <UDashboardSidebar
      id="default"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }"
    >
      <template #header="{ collapsed }">
        <InstanceMenu :collapsed="collapsed" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />
      </template>

      <template #footer="{ collapsed }">
        <SettingsMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <slot />
  </UDashboardGroup>
</template>
