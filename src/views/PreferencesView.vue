<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { NavigationMenuItem, TableColumn } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'

import { getZ2MConnectionConfigs } from '@/config/z2mConnections'
import { usePreferences } from '@/composables/usePreferences'
import { useDevicesStore } from '@/stores/devices'
import { defaultDeviceNamePattern, parseDeviceNameByPattern } from '@/utils/deviceNamePattern'
import type { AppLogLevel } from '@/utils/logging'

defineProps<{
  connectionId: string
}>()

type PreviewRow = {
  name: string
  room: string
  type: string
  placement: string
  matched: boolean
}

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const devicesStore = useDevicesStore()
const { minLogLevel, maxLogEntries, deviceNamingPattern } = usePreferences()
const previewSample = ref('')
const activeTab = ref<'naming' | 'logs'>(
  route.query.tab === 'logs' || route.query.tab === 'naming' ? route.query.tab : 'naming',
)

const logLevelOptions = computed(() => [
  { label: t('logsPage.levelError'), value: 'error' as AppLogLevel },
  { label: t('logsPage.levelWarning'), value: 'warning' as AppLogLevel },
  { label: t('logsPage.levelInfo'), value: 'info' as AppLogLevel },
  { label: t('logsPage.levelDebug'), value: 'debug' as AppLogLevel },
])

const logLevelDescriptions = computed(() => [
  {
    key: 'error' as AppLogLevel,
    label: t('logsPage.levelError'),
    description: t('preferencesPage.logLevelErrorDescription'),
  },
  {
    key: 'warning' as AppLogLevel,
    label: t('logsPage.levelWarning'),
    description: t('preferencesPage.logLevelWarningDescription'),
  },
  {
    key: 'info' as AppLogLevel,
    label: t('logsPage.levelInfo'),
    description: t('preferencesPage.logLevelInfoDescription'),
  },
  {
    key: 'debug' as AppLogLevel,
    label: t('logsPage.levelDebug'),
    description: t('preferencesPage.logLevelDebugDescription'),
  },
])

const placeholderItems = computed(() => [
  {
    key: '{room}',
    description: t('preferencesPage.placeholderRoom'),
  },
  {
    key: '{type}',
    description: t('preferencesPage.placeholderType'),
  },
  {
    key: '{placement}',
    description: t('preferencesPage.placeholderPlacement'),
  },
])

const knownNames = computed(() => {
  const unique = new Set<string>()

  for (const connection of getZ2MConnectionConfigs()) {
    for (const device of devicesStore.peripheralDevices(connection.id)) {
      unique.add(device.friendly_name)
    }
  }

  if (!unique.size) {
    unique.add(
      defaultDeviceNamePattern()
        .replace('{room}', 'living-room')
        .replace('{type}', 'switch')
        .replace('{placement}', 'main'),
    )
  }

  return [...unique].slice(0, 6)
})

const previewRows = computed<PreviewRow[]>(() => {
  const names = [
    ...(previewSample.value.trim() ? [previewSample.value.trim()] : []),
    ...knownNames.value,
  ]

  return [...new Set(names)].slice(0, 6).map((name) => {
    const parsed = parseDeviceNameByPattern(name, deviceNamingPattern.value)

    return {
      name,
      room: parsed?.room || '—',
      type: parsed?.type || '—',
      placement: parsed?.placement || '—',
      matched: Boolean(parsed),
    }
  })
})

const previewColumns: TableColumn<PreviewRow>[] = [
  { accessorKey: 'name', header: () => t('preferencesPage.previewDevice') },
  { accessorKey: 'room', header: () => t('preferencesPage.previewRoom') },
  { accessorKey: 'type', header: () => t('preferencesPage.previewType') },
  { accessorKey: 'placement', header: () => t('preferencesPage.previewPlacement') },
]

const tabs = computed<NavigationMenuItem[]>(() => [
  {
    label: t('preferencesPage.namingTab'),
    active: activeTab.value === 'naming',
    onSelect: () => {
      activeTab.value = 'naming'
    },
  },
  {
    label: t('preferencesPage.logsTab'),
    active: activeTab.value === 'logs',
    onSelect: () => {
      activeTab.value = 'logs'
    },
  },
])

watch(
  () => route.query.tab,
  (tab) => {
    if (tab === 'logs' || tab === 'naming') {
      activeTab.value = tab
    }
  },
)

watch(activeTab, (tab) => {
  if (route.query.tab === tab) {
    return
  }

  void router.replace({
    query: {
      ...route.query,
      tab,
    },
  })
})
</script>

<template>
  <UDashboardPanel id="preferences">
    <template #header>
      <UDashboardNavbar :title="t('preferencesPage.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UBadge color="neutral" variant="soft">{{ t('preferencesPage.global') }}</UBadge>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UNavigationMenu :items="tabs" highlight class="-mx-1 flex-1" />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="mx-auto w-full xl:max-w-3xl">
          <UAlert
            color="warning"
            variant="subtle"
            icon="i-lucide-hard-drive"
            :title="t('preferencesPage.storageTitle')"
            :description="t('preferencesPage.storageDescription')"
          />
        </div>

        <div class="mx-auto w-full xl:max-w-3xl">
          <UCard
            v-if="activeTab === 'naming'"
            class="border-default bg-default/70"
            :ui="{ body: 'p-5 space-y-5' }"
          >
            <div class="space-y-1">
              <h2 class="text-base font-semibold text-highlighted">
                {{ t('preferencesPage.namingTitle') }}
              </h2>
              <p class="text-sm text-muted">
                {{ t('preferencesPage.namingDescription') }}
              </p>
              <p class="text-sm text-muted">
                {{ t('preferencesPage.placeholdersDescription') }}
              </p>
            </div>

            <div class="space-y-2 rounded-2xl border border-default bg-default/60 p-4">
              <div
                v-for="placeholder in placeholderItems"
                :key="placeholder.key"
                class="flex flex-wrap items-center gap-2 text-sm"
              >
                <UBadge color="neutral" variant="soft">
                  {{ placeholder.key }}
                </UBadge>
                <span class="text-muted">
                  {{ placeholder.description }}
                </span>
              </div>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <UFormField :label="t('preferencesPage.namingPattern')">
                <UInput v-model="deviceNamingPattern" />
              </UFormField>

              <UFormField :label="t('preferencesPage.previewSample')">
                <UInput v-model="previewSample" :placeholder="defaultDeviceNamePattern()" />
              </UFormField>
            </div>

            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-semibold text-highlighted">
                  {{ t('preferencesPage.previewTitle') }}
                </h3>
                <UBadge color="neutral" variant="subtle">
                  {{ previewRows.length }}
                </UBadge>
              </div>

              <div class="overflow-hidden rounded-2xl border border-default bg-default">
                <UTable :data="previewRows" :columns="previewColumns">
                  <template #name-cell="{ row }">
                    <div class="flex items-center gap-2">
                      <span class="font-medium text-highlighted">{{ row.original.name }}</span>
                      <UBadge
                        :color="row.original.matched ? 'success' : 'warning'"
                        variant="subtle"
                        size="sm"
                      >
                        {{
                          row.original.matched
                            ? t('preferencesPage.previewMatched')
                            : t('preferencesPage.previewNotMatched')
                        }}
                      </UBadge>
                    </div>
                  </template>
                </UTable>
              </div>
            </div>
          </UCard>

          <UCard v-else class="border-default bg-default/70" :ui="{ body: 'p-5 space-y-5' }">
            <div class="space-y-1">
              <h2 class="text-base font-semibold text-highlighted">
                {{ t('preferencesPage.logsTitle') }}
              </h2>
              <p class="text-sm text-muted">
                {{ t('preferencesPage.logsDescription') }}
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <UFormField :label="t('preferencesPage.minLogLevel')" class="w-full">
                <USelect
                  v-model="minLogLevel"
                  :items="logLevelOptions"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField :label="t('preferencesPage.maxLogEntries')" class="w-full">
                <UInputNumber
                  v-model="maxLogEntries"
                  :min="100"
                  :max="10000"
                  :step="100"
                  class="w-full"
                />
              </UFormField>
            </div>

            <div class="space-y-2 rounded-2xl border border-default bg-default/60 p-4">
              <div
                v-for="level in logLevelDescriptions"
                :key="level.key"
                class="flex flex-wrap items-center gap-2 text-sm"
              >
                <UBadge color="neutral" variant="soft">
                  {{ level.label }}
                </UBadge>
                <span class="text-muted">
                  {{ level.description }}
                </span>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
