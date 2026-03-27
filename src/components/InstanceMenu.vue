<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { DropdownMenuItem } from '@nuxt/ui'

import { getDefaultConnectionId, getZ2MConnectionConfigs } from '@/config/z2mConnections'
import { saveConnectionId } from '@/composables/useConnectionPreference'

defineProps<{
  collapsed?: boolean
}>()

const route = useRoute()
const router = useRouter()

const connections = ref(
  getZ2MConnectionConfigs().map((connection) => ({
    label: connection.label,
    id: connection.id,
    icon: 'lucide:radio',
  })),
)

const selectedConnection = computed(() => {
  const currentId = String(route.params.connectionId || getDefaultConnectionId())
  return connections.value.find((connection) => connection.id === currentId) ?? connections.value[0]
})

function buildTargetPath(connectionId: string) {
  if (
    (route.name === 'device-exposes' ||
      route.name === 'device-info' ||
      route.name === 'device-state') &&
    typeof route.params.id === 'string'
  ) {
    const tab = String(route.name).replace('device-', '')
    return `/connections/${connectionId}/devices/${route.params.id}/${tab}`
  }

  if (route.name === 'logs') {
    return `/connections/${connectionId}/logs`
  }

  if (route.name === 'information') {
    return `/connections/${connectionId}/information`
  }

  if (route.name === 'network-map') {
    return `/connections/${connectionId}/network-map`
  }

  return `/connections/${connectionId}`
}

const items = computed<DropdownMenuItem[][]>(() => {
  return [
    connections.value.map((connection) => ({
      ...connection,
      onSelect() {
        saveConnectionId(connection.id)
        router.push(buildTargetPath(connection.id))
      },
    })),
  ]
})
</script>

<template>
  <UDropdownMenu
    v-if="items.length > 1"
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedConnection,
        label: collapsed ? undefined : selectedConnection?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    />
  </UDropdownMenu>
  <UButton
    v-else
    v-bind="{
      ...selectedConnection,
      label: collapsed ? undefined : selectedConnection?.label,
    }"
    color="neutral"
    variant="ghost"
    block
    :square="collapsed"
    class="data-[state=open]:bg-elevated"
    :class="[!collapsed && 'py-2']"
  />
</template>
