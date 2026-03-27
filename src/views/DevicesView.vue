<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { NavigationMenuItem, TableColumn } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'

import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import DeviceCard from '@/components/DeviceCard.vue'
import { useDeviceNamingPatternPreference } from '@/composables/useDeviceNamingPatternPreference'
import { useDevicesGroupingPreference } from '@/composables/useDevicesGroupingPreference'
import {
  useDevicesSortingPreference,
  type DevicesSortBy,
} from '@/composables/useDevicesSortingPreference'
import { useDevicesViewPreference } from '@/composables/useDevicesViewPreference'
import { useDevicesStore } from '@/stores/devices'
import { deviceTypeBadge, formatLastSeenLabel, powerBadge, signalBadge } from '@/utils/deviceCard'
import { deviceImageUrl } from '@/utils/devicePresentation'
import {
  deviceStatusKey,
  groupDeviceCards,
  sortDeviceCards,
  type DeviceCardEntry,
  type DevicesGroupBy,
} from '@/utils/devicesGrouping'

const props = defineProps<{
  connectionId: string
}>()

const devicesStore = useDevicesStore()
const { t } = useI18n()
const router = useRouter()
const { groupBy } = useDevicesGroupingPreference()
const { sortBy } = useDevicesSortingPreference()
const { viewMode } = useDevicesViewPreference()
const { pattern: namingPattern } = useDeviceNamingPatternPreference()
const connectionStates = computed(() => devicesStore.deviceStatesFor(props.connectionId))

const cards = computed(() =>
  devicesStore.peripheralDevices(props.connectionId).map((device) => ({
    device,
    state: connectionStates.value[device.friendly_name],
    lastSeenAt: devicesStore.deviceLastSeen(props.connectionId, device.friendly_name),
  })),
)

const groupOptions = computed(() => [
  { label: t('devicesPage.groupNone'), value: 'none' },
  { label: t('devicesPage.groupRoom'), value: 'room' },
  { label: t('devicesPage.groupFunction'), value: 'function' },
  { label: t('devicesPage.groupType'), value: 'type' },
  { label: t('devicesPage.groupPower'), value: 'power' },
  { label: t('devicesPage.groupVendor'), value: 'vendor' },
])

const sortOptions = computed(() => [
  { label: t('devicesPage.sortName'), value: 'name' },
  { label: t('devicesPage.sortSignal'), value: 'signal' },
  { label: t('devicesPage.sortBattery'), value: 'battery' },
  { label: t('devicesPage.sortLastSeen'), value: 'last_seen' },
])

const viewTabs = computed<NavigationMenuItem[]>(() => [
  {
    label: t('devicesPage.viewCards'),
    icon: 'i-lucide-layout-grid',
    active: viewMode.value === 'cards',
    onSelect: () => {
      viewMode.value = 'cards'
    },
  },
  {
    label: t('devicesPage.viewTable'),
    icon: 'i-lucide-table-properties',
    active: viewMode.value === 'table',
    onSelect: () => {
      viewMode.value = 'table'
    },
  },
])

const sortedCards = computed(() => sortDeviceCards(cards.value, sortBy.value as DevicesSortBy))

const groupedCards = computed(() =>
  groupDeviceCards(
    cards.value,
    groupBy.value as DevicesGroupBy,
    sortBy.value as DevicesSortBy,
    t,
    namingPattern.value,
  ),
)

type DeviceTableRow = {
  id: string
  name: string
  subtitle: string
  vendor: string
  model: string
  imageUrl: string | null
  status: string
  statusTooltip: string
  deviceTypeView: ReturnType<typeof deviceTypeBadge>
  signal: number | null
  battery: number | null
  batteryLabel: string
  lastSeenLabel: string
  signalView: ReturnType<typeof signalBadge> extends infer T ? T | null : null
  powerView: ReturnType<typeof powerBadge> extends infer T ? T | null : null
  entry: DeviceCardEntry
}

const tableWrapperClass =
  'overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-white/5 dark:ring-white/10'

const tableColumns: TableColumn<DeviceTableRow>[] = [
  {
    accessorKey: 'name',
    header: () => t('devicesPage.tableName'),
    meta: {
      class: {
        th: 'w-auto text-left',
        td: 'w-auto text-left',
      },
    },
  },
  {
    accessorKey: 'lastSeenLabel',
    header: () => t('devicesPage.tableLastSeen'),
    meta: {
      class: {
        th: 'w-28 whitespace-nowrap text-center',
        td: 'w-28 whitespace-nowrap text-center',
      },
    },
  },
  {
    accessorKey: 'vendor',
    header: () => t('devicesPage.tableVendor'),
    meta: {
      class: {
        th: 'w-44 whitespace-nowrap text-center',
        td: 'w-44 whitespace-nowrap text-center',
      },
    },
  },
  {
    accessorKey: 'model',
    header: () => t('devicesPage.tableModel'),
    meta: {
      class: {
        th: 'w-44 whitespace-nowrap text-center',
        td: 'w-44 whitespace-nowrap text-center',
      },
    },
  },
  {
    accessorKey: 'status',
    header: () => t('devicesPage.tableStatus'),
    meta: {
      class: {
        th: 'w-36 whitespace-nowrap text-center',
        td: 'w-36 whitespace-nowrap text-center',
      },
    },
  },
  {
    accessorKey: 'deviceTypeLabel',
    header: () => t('devicesPage.tableType'),
    meta: {
      class: {
        th: 'w-36 whitespace-nowrap text-center',
        td: 'w-36 whitespace-nowrap text-center',
      },
    },
  },
  {
    accessorKey: 'signal',
    header: () => t('devicesPage.tableSignal'),
    meta: {
      class: {
        th: 'w-32 whitespace-nowrap text-center',
        td: 'w-32 whitespace-nowrap text-center',
      },
    },
  },
  {
    accessorKey: 'batteryLabel',
    header: () => t('devicesPage.tableBattery'),
    meta: {
      class: {
        th: 'w-32 whitespace-nowrap text-center',
        td: 'w-32 whitespace-nowrap text-center',
      },
    },
  },
]

function tableRowFromEntry(entry: DeviceCardEntry): DeviceTableRow {
  const battery = typeof entry.state?.battery === 'number' ? entry.state.battery : null
  const powerSource = entry.device.power_source?.toLowerCase() ?? ''
  const batteryLabel = powerSource.includes('mains')
    ? t('deviceCard.mains')
    : battery != null
      ? `${battery}%`
      : t('app.unknown')
  const signal = typeof entry.state?.linkquality === 'number' ? entry.state.linkquality : null
  const signalView = signalBadge(signal, t)
  const powerView = powerBadge(entry.device, entry.state?.battery, entry.state?.battery_low, t)

  return {
    id: entry.device.ieee_address,
    name: entry.device.description || entry.device.friendly_name,
    subtitle: entry.device.description
      ? entry.device.friendly_name
      : entry.device.definition?.model || entry.device.model_id || entry.device.ieee_address,
    vendor: entry.device.definition?.vendor || entry.device.manufacturer || t('app.unknown'),
    model: entry.device.definition?.model || entry.device.model_id || t('app.unknown'),
    imageUrl: deviceImageUrl(entry.device),
    status: deviceStatusKey(entry),
    statusTooltip:
      deviceStatusKey(entry) === 'offline'
        ? t('deviceCard.offlineTooltip')
        : t('deviceCard.onlineTooltip'),
    deviceTypeView: deviceTypeBadge(entry.device, t),
    signal,
    battery,
    batteryLabel,
    lastSeenLabel: entry.lastSeenAt
      ? formatLastSeenLabel(entry.lastSeenAt, Date.now(), t)
      : t('app.unknown'),
    signalView: signalView
      ? {
          ...signalView,
          label: t('devicesPage.tableSignalValue', { value: signal }),
        }
      : null,
    powerView,
    entry,
  }
}

const tableRows = computed(() => sortedCards.value.map(tableRowFromEntry))
const groupedTableRows = computed(() =>
  groupedCards.value.map((group) => ({
    ...group,
    rows: group.entries.map(tableRowFromEntry),
  })),
)

function statusColor(status: string) {
  return status === 'offline' ? 'error' : 'success'
}

function openDevice(entry: DeviceCardEntry) {
  void router.push(
    `/connections/${props.connectionId}/devices/${entry.device.ieee_address}/exposes`,
  )
}
</script>

<template>
  <UDashboardPanel id="devices">
    <template #header>
      <UDashboardNavbar>
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #title>
          <div class="flex min-w-0 items-center gap-3">
            <span class="truncate">{{ t('devicesPage.title') }}</span>
            <UBadge color="neutral" variant="subtle">
              {{ cards.length }}
            </UBadge>
          </div>
        </template>

        <template #right>
          <ConnectionNavbarActions :connection-id="connectionId" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UNavigationMenu :items="viewTabs" highlight class="-mx-1 flex-1" />
        </template>

        <template #right>
          <div class="flex items-center gap-3">
            <span class="text-sm text-muted">{{ t('devicesPage.groupBy') }}</span>
            <USelect
              v-model="groupBy"
              :items="groupOptions"
              value-key="value"
              size="sm"
              class="w-44"
            />
            <span class="text-sm text-muted">{{ t('devicesPage.sortBy') }}</span>
            <USelect
              v-model="sortBy"
              :items="sortOptions"
              value-key="value"
              size="sm"
              class="w-40"
            />
          </div>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        <UAlert
          v-if="groupBy === 'room'"
          color="neutral"
          variant="subtle"
          icon="i-lucide-info"
          :title="t('devicesPage.nameGroupingTitle')"
          :description="t('devicesPage.nameGroupingDescription')"
        />

        <template v-if="viewMode === 'cards' && cards.length && groupBy !== 'none'">
          <section v-for="group in groupedTableRows" :key="group.key" class="space-y-4">
            <div class="flex items-center gap-3">
              <h2 class="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                {{ group.label }}
              </h2>
              <UBadge color="neutral" variant="subtle">
                {{ group.entries.length }}
              </UBadge>
            </div>

            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <DeviceCard
                v-for="entry in group.entries"
                :key="entry.device.ieee_address"
                :connection-id="connectionId"
                :device="entry.device"
                :state="entry.state"
              />
            </div>
          </section>
        </template>

        <div
          v-else-if="viewMode === 'cards' && cards.length"
          class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <DeviceCard
            v-for="entry in sortedCards"
            :key="entry.device.ieee_address"
            :connection-id="connectionId"
            :device="entry.device"
            :state="entry.state"
          />
        </div>

        <template v-else-if="cards.length && groupBy !== 'none'">
          <section v-for="group in groupedTableRows" :key="group.key" class="space-y-4">
            <div class="flex items-center gap-3">
              <h2 class="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                {{ group.label }}
              </h2>
              <UBadge color="neutral" variant="subtle">
                {{ group.entries.length }}
              </UBadge>
            </div>

            <div :class="tableWrapperClass">
              <UTable
                :data="group.rows"
                :columns="tableColumns"
                :empty="t('devicesPage.noDevices')"
                sticky="header"
                class="table-fixed"
                :meta="{
                  class: {
                    tr: 'cursor-pointer transition-colors hover:bg-slate-50/90 dark:hover:bg-white/5',
                  },
                }"
                @select="(_, row) => openDevice(row.original.entry)"
              >
                <template #name-cell="{ row }">
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="shrink-0">
                      <div
                        class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring ring-slate-200 dark:bg-slate-900/80 dark:ring-white/10"
                      >
                        <img
                          v-if="row.original.imageUrl"
                          :src="row.original.imageUrl"
                          :alt="row.original.name"
                          class="h-full w-full object-contain"
                        />
                        <span
                          v-else
                          class="text-sm font-semibold text-slate-500 dark:text-slate-400"
                        >
                          {{ row.original.name.slice(0, 1).toUpperCase() }}
                        </span>
                      </div>
                    </div>

                    <div class="relative min-w-0 flex-1 pr-16">
                      <p class="truncate font-medium text-highlighted">
                        {{ row.original.name }}
                      </p>
                      <p class="truncate text-sm text-muted">
                        {{ row.original.subtitle }}
                      </p>

                      <div
                        class="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5"
                      >
                        <UBadge
                          v-if="
                            devicesStore.deviceActivity(
                              connectionId,
                              row.original.entry.device.friendly_name,
                            ).rx
                          "
                          size="sm"
                          color="info"
                          variant="soft"
                          class="animate-pulse"
                        >
                          RX
                        </UBadge>
                        <UBadge
                          v-if="
                            devicesStore.deviceActivity(
                              connectionId,
                              row.original.entry.device.friendly_name,
                            ).tx
                          "
                          size="sm"
                          color="warning"
                          variant="soft"
                          class="animate-pulse"
                        >
                          TX
                        </UBadge>
                      </div>
                    </div>
                  </div>
                </template>

                <template #vendor-cell="{ row }">
                  <div class="flex justify-center">
                    <span class="truncate whitespace-nowrap text-sm text-highlighted">
                      {{ row.original.vendor }}
                    </span>
                  </div>
                </template>

                <template #model-cell="{ row }">
                  <div class="flex justify-center">
                    <span class="truncate whitespace-nowrap text-sm text-highlighted">
                      {{ row.original.model }}
                    </span>
                  </div>
                </template>

                <template #status-cell="{ row }">
                  <div class="flex justify-center">
                    <UPopover mode="hover" :open-delay="0" :close-delay="0">
                      <UBadge :color="statusColor(row.original.status)" variant="soft">
                        {{
                          row.original.status === 'offline'
                            ? t('deviceCard.offline')
                            : t('deviceCard.online')
                        }}
                      </UBadge>

                      <template #content>
                        <div class="max-w-64 p-3 text-sm text-slate-700 dark:text-slate-200">
                          {{ row.original.statusTooltip }}
                        </div>
                      </template>
                    </UPopover>
                  </div>
                </template>

                <template #deviceTypeLabel-cell="{ row }">
                  <div class="flex justify-center">
                    <UTooltip :delay-duration="0" :text="row.original.deviceTypeView.tooltip">
                      <UBadge
                        :icon="row.original.deviceTypeView.icon"
                        color="neutral"
                        variant="subtle"
                        :ui="{ leadingIcon: row.original.deviceTypeView.iconClass }"
                      >
                        {{ row.original.deviceTypeView.label }}
                      </UBadge>
                    </UTooltip>
                  </div>
                </template>

                <template #signal-cell="{ row }">
                  <div class="flex justify-center">
                    <UTooltip
                      v-if="row.original.signalView"
                      :delay-duration="0"
                      :text="row.original.signalView.tooltip"
                    >
                      <UBadge
                        color="neutral"
                        variant="subtle"
                        :icon="row.original.signalView.icon"
                        :ui="{ leadingIcon: row.original.signalView.iconClass }"
                      >
                        {{ row.original.signalView.label }}
                      </UBadge>
                    </UTooltip>
                    <span v-else class="text-sm text-muted">—</span>
                  </div>
                </template>

                <template #batteryLabel-cell="{ row }">
                  <div class="flex justify-center">
                    <UTooltip
                      v-if="row.original.powerView"
                      :delay-duration="0"
                      :text="row.original.powerView.tooltip"
                    >
                      <UBadge
                        color="neutral"
                        variant="subtle"
                        :icon="row.original.powerView.icon"
                        :ui="{ leadingIcon: row.original.powerView.iconClass }"
                      >
                        {{ row.original.powerView.label }}
                      </UBadge>
                    </UTooltip>
                    <span v-else class="text-sm text-muted">
                      {{ row.original.batteryLabel }}
                    </span>
                  </div>
                </template>

                <template #lastSeenLabel-cell="{ row }">
                  <div class="flex justify-center">
                    <span class="whitespace-nowrap text-sm text-highlighted">
                      {{ row.original.lastSeenLabel }}
                    </span>
                  </div>
                </template>
              </UTable>
            </div>
          </section>
        </template>

        <div v-else-if="cards.length" :class="tableWrapperClass">
          <UTable
            :data="tableRows"
            :columns="tableColumns"
            :empty="t('devicesPage.noDevices')"
            sticky="header"
            class="table-fixed"
            :meta="{
              class: {
                tr: 'cursor-pointer transition-colors hover:bg-slate-50/90 dark:hover:bg-white/5',
              },
            }"
            @select="(_, row) => openDevice(row.original.entry)"
          >
            <template #name-cell="{ row }">
              <div class="flex min-w-0 items-center gap-3">
                <div class="shrink-0">
                  <div
                    class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-slate-100 ring ring-slate-200 dark:bg-slate-900/80 dark:ring-white/10"
                  >
                    <img
                      v-if="row.original.imageUrl"
                      :src="row.original.imageUrl"
                      :alt="row.original.name"
                      class="h-full w-full object-contain"
                    />
                    <span v-else class="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {{ row.original.name.slice(0, 1).toUpperCase() }}
                    </span>
                  </div>
                </div>

                <div class="relative min-w-0 flex-1 pr-16">
                  <p class="truncate font-medium text-highlighted">
                    {{ row.original.name }}
                  </p>
                  <p class="truncate text-sm text-muted">
                    {{ row.original.subtitle }}
                  </p>

                  <div
                    class="pointer-events-none absolute right-0 top-1/2 flex -translate-y-1/2 items-center gap-1.5"
                  >
                    <UBadge
                      v-if="
                        devicesStore.deviceActivity(
                          connectionId,
                          row.original.entry.device.friendly_name,
                        ).rx
                      "
                      size="sm"
                      color="info"
                      variant="soft"
                      class="animate-pulse"
                    >
                      RX
                    </UBadge>
                    <UBadge
                      v-if="
                        devicesStore.deviceActivity(
                          connectionId,
                          row.original.entry.device.friendly_name,
                        ).tx
                      "
                      size="sm"
                      color="warning"
                      variant="soft"
                      class="animate-pulse"
                    >
                      TX
                    </UBadge>
                  </div>
                </div>
              </div>
            </template>

            <template #vendor-cell="{ row }">
              <div class="flex justify-center">
                <span class="truncate whitespace-nowrap text-sm text-highlighted">
                  {{ row.original.vendor }}
                </span>
              </div>
            </template>

            <template #model-cell="{ row }">
              <div class="flex justify-center">
                <span class="truncate whitespace-nowrap text-sm text-highlighted">
                  {{ row.original.model }}
                </span>
              </div>
            </template>

            <template #status-cell="{ row }">
              <div class="flex justify-center">
                <UPopover mode="hover" :open-delay="0" :close-delay="0">
                  <UBadge :color="statusColor(row.original.status)" variant="soft">
                    {{
                      row.original.status === 'offline'
                        ? t('deviceCard.offline')
                        : t('deviceCard.online')
                    }}
                  </UBadge>

                  <template #content>
                    <div class="max-w-64 p-3 text-sm text-slate-700 dark:text-slate-200">
                      {{ row.original.statusTooltip }}
                    </div>
                  </template>
                </UPopover>
              </div>
            </template>

            <template #deviceTypeLabel-cell="{ row }">
              <div class="flex justify-center">
                <UTooltip :delay-duration="0" :text="row.original.deviceTypeView.tooltip">
                  <UBadge
                    :icon="row.original.deviceTypeView.icon"
                    color="neutral"
                    variant="subtle"
                    :ui="{ leadingIcon: row.original.deviceTypeView.iconClass }"
                  >
                    {{ row.original.deviceTypeView.label }}
                  </UBadge>
                </UTooltip>
              </div>
            </template>

            <template #signal-cell="{ row }">
              <div class="flex justify-center">
                <UTooltip
                  v-if="row.original.signalView"
                  :delay-duration="0"
                  :text="row.original.signalView.tooltip"
                >
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    :icon="row.original.signalView.icon"
                    :ui="{ leadingIcon: row.original.signalView.iconClass }"
                  >
                    {{ row.original.signalView.label }}
                  </UBadge>
                </UTooltip>
                <span v-else class="text-sm text-muted">—</span>
              </div>
            </template>

            <template #batteryLabel-cell="{ row }">
              <div class="flex justify-center">
                <UTooltip
                  v-if="row.original.powerView"
                  :delay-duration="0"
                  :text="row.original.powerView.tooltip"
                >
                  <UBadge
                    color="neutral"
                    variant="subtle"
                    :icon="row.original.powerView.icon"
                    :ui="{ leadingIcon: row.original.powerView.iconClass }"
                  >
                    {{ row.original.powerView.label }}
                  </UBadge>
                </UTooltip>
                <span v-else class="text-sm text-muted">
                  {{ row.original.batteryLabel }}
                </span>
              </div>
            </template>

            <template #lastSeenLabel-cell="{ row }">
              <div class="flex justify-center">
                <span class="whitespace-nowrap text-sm text-highlighted">
                  {{ row.original.lastSeenLabel }}
                </span>
              </div>
            </template>
          </UTable>
        </div>

        <UCard
          v-else
          class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
          :ui="{ body: 'p-8' }"
        >
          <div class="space-y-2 text-center">
            <p class="text-lg font-semibold text-slate-950 dark:text-white">
              {{ t('devicesPage.noDevices') }}
            </p>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t('devicesPage.noDevicesDescription') }}
            </p>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
