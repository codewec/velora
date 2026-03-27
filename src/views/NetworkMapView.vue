<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import * as vNG from 'v-network-graph'
import {
  ForceLayout,
  type ForceEdgeDatum,
  type ForceNodeDatum,
} from 'v-network-graph/lib/force-layout'

import ConnectionNavbarActions from '@/components/ConnectionNavbarActions.vue'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import type { NetworkMapValue } from '@/types/z2m'
import {
  buildNetworkMapNodes,
  clearNetworkMapCache,
  createSeedLayouts,
  edgeStroke,
  formatLinkLabel,
  formatNetworkAddress,
  formatNetworkMapLastSeen,
  formatNodeName,
  loadNetworkMapCache,
  nodeFill,
  persistNetworkMapCache,
  roleColor,
  sortNetworkMapLinks,
  type NetworkMapCacheEntry,
} from '@/utils/networkMap'

const props = defineProps<{
  connectionId: string
}>()

const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()
const { t } = useI18n()
const router = useRouter()
const cachedNetworkMap = ref<NetworkMapCacheEntry | null>(null)
const isNodeModalOpen = ref(false)
const isScanConfirmOpen = ref(false)
const selectedNodeIeee = ref<string | null>(null)
const networkMap = computed(() => bridgeStore.networkMap(props.connectionId))
const loading = computed(() => bridgeStore.networkMapLoading(props.connectionId))
const error = computed(() => bridgeStore.networkMapError(props.connectionId))
const activeNetworkMap = computed(() => networkMap.value ?? cachedNetworkMap.value?.value ?? null)
const showingCachedData = computed(() => !networkMap.value && !!cachedNetworkMap.value)
const cachedUpdatedAtLabel = computed(() =>
  cachedNetworkMap.value?.updatedAt
    ? new Date(cachedNetworkMap.value.updatedAt).toLocaleString()
    : null,
)

const inventoryDevices = computed(() => devicesStore.devicesFor(props.connectionId))
const nodes = computed(() =>
  buildNetworkMapNodes(activeNetworkMap.value?.nodes, inventoryDevices.value),
)
const links = computed(() => sortNetworkMapLinks(activeNetworkMap.value?.links))

const nodeByIeee = computed(() =>
  Object.fromEntries(nodes.value.map((node) => [node.ieeeAddr, node])),
)
const selectedNode = computed(() =>
  selectedNodeIeee.value ? (nodeByIeee.value[selectedNodeIeee.value] ?? null) : null,
)
const selectedDevice = computed(() =>
  selectedNodeIeee.value
    ? (inventoryDevices.value.find((device) => device.ieee_address === selectedNodeIeee.value) ??
      null)
    : null,
)

const coordinators = computed(() => nodes.value.filter((node) => node.type === 'Coordinator'))
const routers = computed(() => nodes.value.filter((node) => node.type === 'Router'))
const endDevices = computed(() => nodes.value.filter((node) => node.type === 'EndDevice'))
const graphLayouts = ref({ nodes: {} as Record<string, { x: number; y: number; fixed?: boolean }> })

const enrichedLinks = computed(() =>
  links.value.map((link) => ({
    ...link,
    sourceNode: nodeByIeee.value[link.source.ieeeAddr] ?? null,
    targetNode: nodeByIeee.value[link.target.ieeeAddr] ?? null,
  })),
)
const selectedNodeLinks = computed(() => {
  if (!selectedNodeIeee.value) {
    return []
  }

  return enrichedLinks.value.filter(
    (link) =>
      link.source.ieeeAddr === selectedNodeIeee.value ||
      link.target.ieeeAddr === selectedNodeIeee.value,
  )
})

function handleNodeClick({ node }: { node: string }) {
  selectedNodeIeee.value = node
  isNodeModalOpen.value = true
}

function openSelectedDevicePage() {
  if (!selectedNodeIeee.value) {
    return
  }

  isNodeModalOpen.value = false
  void router.push(`/connections/${props.connectionId}/devices/${selectedNodeIeee.value}/exposes`)
}

function loadCachedNetworkMap() {
  cachedNetworkMap.value = loadNetworkMapCache(props.connectionId)
}

function persistNetworkMap(value: NetworkMapValue) {
  cachedNetworkMap.value = persistNetworkMapCache(props.connectionId, value)
}

function clearCachedNetworkMap() {
  cachedNetworkMap.value = null
  clearNetworkMapCache(props.connectionId)
}

const graphNodes = computed(() =>
  Object.fromEntries(
    nodes.value.map((node) => [
      node.ieeeAddr,
      {
        name: node.friendlyName || node.ieeeAddr,
        type: node.type,
        isolated: Boolean(node.isolated),
      },
    ]),
  ),
)

const graphEdges = computed(() =>
  Object.fromEntries(
    links.value.map((link, index) => [
      `edge-${index}`,
      {
        source: link.source.ieeeAddr,
        target: link.target.ieeeAddr,
        label: formatLinkLabel(link),
        linkquality: link.linkquality,
      },
    ]),
  ),
)

const graphConfigs = reactive(
  vNG.defineConfigs({
    view: {
      autoPanAndZoomOnLoad: 'fit-content',
      fitContentMargin: 0.18,
      minZoomLevel: 0.2,
      maxZoomLevel: 5,
      layoutHandler: new ForceLayout({
        positionFixedByDrag: false,
        positionFixedByClickWithAltKey: false,
        noAutoRestartSimulation: true,
        createSimulation: (d3, simulationNodes, simulationEdges) => {
          const forceLink = d3
            .forceLink<ForceNodeDatum, ForceEdgeDatum>(simulationEdges)
            .id((node: ForceNodeDatum) => node.id)

          // This follows the documented static-force pattern from v-network-graph:
          // compute the layout up front with d3-force, stop the simulation, and
          // render the settled result without ongoing motion. Distances are kept
          // intentionally compact so the graph stays centered instead of
          // spreading from edge to edge.
          return d3
            .forceSimulation(simulationNodes)
            .force('edge', forceLink.distance(72).strength(0.7))
            .force('charge', d3.forceManyBody().strength(-280))
            .force('collide', d3.forceCollide(34).strength(0.9))
            .force('x', d3.forceX().strength(0.06))
            .force('y', d3.forceY().strength(0.06))
            .stop()
            .tick(140)
        },
      }),
    },
    node: {
      selectable: false,
      draggable: true,
      normal: {
        type: 'circle',
        radius: (node) => {
          if (node.type === 'Coordinator') {
            return 22
          }

          if (node.type === 'Router') {
            return 18
          }

          return 14
        },
        color: (node) => nodeFill(node.type),
        strokeColor: (node) => (node.isolated ? '#f8fafc' : '#ffffff'),
        strokeWidth: (node) => (node.isolated ? 3 : 2),
      },
      hover: {
        color: (node) => nodeFill(node.type),
        strokeColor: '#ffffff',
        strokeWidth: 3,
      },
      label: {
        visible: true,
        fontSize: 12,
        color: '#0f172a',
        direction: 'south',
        background: {
          visible: true,
          color: 'rgba(255,255,255,0.88)',
          padding: {
            vertical: 2,
            horizontal: 6,
          },
          borderRadius: 999,
        },
      },
    },
    edge: {
      selectable: false,
      normal: {
        width: (edge) => {
          const lqi = edge.linkquality

          if (typeof lqi !== 'number') {
            return 2
          }

          if (lqi >= 180) {
            return 4
          }

          if (lqi >= 100) {
            return 3
          }

          return 2
        },
        color: (edge) => edgeStroke(edge.linkquality),
      },
      hover: {
        width: (edge) => {
          const lqi = edge.linkquality
          return typeof lqi === 'number' && lqi >= 100 ? 5 : 4
        },
        color: (edge) => edgeStroke(edge.linkquality),
      },
      marker: {
        target: {
          type: 'arrow',
          width: 4,
          height: 4,
        },
      },
      gap: 16,
    },
  }),
)

function triggerScan() {
  isScanConfirmOpen.value = false
  bridgeStore.requestNetworkMap(props.connectionId)
}

onMounted(() => {
  loadCachedNetworkMap()
})

watch(
  networkMap,
  (value) => {
    if (!value) {
      return
    }

    persistNetworkMap(value)
  },
  { immediate: true },
)

watch(
  activeNetworkMap,
  (value) => {
    if (!value) {
      graphLayouts.value = { nodes: {} }
      return
    }

    graphLayouts.value = createSeedLayouts(nodes.value)
  },
  { immediate: true },
)

const graphEventHandlers: vNG.EventHandlers = {
  'node:click': handleNodeClick,
}
</script>

<template>
  <UDashboardPanel id="network-map">
    <template #header>
      <UDashboardNavbar :title="t('app.networkMap')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <ConnectionNavbarActions :connection-id="connectionId" />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #right>
          <UButton
            size="sm"
            icon="lucide:scan-search"
            color="neutral"
            :loading="loading"
            :label="t('networkMapPage.scan')"
            @click="isScanConfirmOpen = true"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <UAlert
          v-if="showingCachedData && cachedUpdatedAtLabel"
          color="warning"
          variant="subtle"
          :title="t('networkMapPage.cachedTitle')"
          :description="t('networkMapPage.cachedDescription', { date: cachedUpdatedAtLabel })"
        >
          <template #actions>
            <div class="flex flex-wrap gap-2">
              <UButton
                size="sm"
                color="warning"
                variant="outline"
                :loading="loading"
                :label="t('networkMapPage.scan')"
                @click="isScanConfirmOpen = true"
              />
              <UButton
                size="sm"
                color="neutral"
                variant="outline"
                :label="t('app.clear')"
                @click="clearCachedNetworkMap"
              />
            </div>
          </template>
        </UAlert>

        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :title="t('networkMapPage.scanFailed')"
          :description="error"
        />

        <UAlert
          v-if="!activeNetworkMap && !loading && !error"
          color="neutral"
          variant="subtle"
          :title="t('networkMapPage.emptyTitle')"
          :description="t('networkMapPage.emptyDescription')"
        />

        <div v-if="activeNetworkMap" class="space-y-6">
          <div class="grid gap-4 xl:grid-cols-3">
            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <div class="flex row-flex justify-between w-full">
                <p class="text-sm text-muted">{{ t('networkMapPage.coordinators') }}</p>
                <UBadge color="neutral" size="sm" variant="soft">{{ coordinators.length }}</UBadge>
              </div>
              <div class="mt-3 space-y-2">
                <div
                  v-for="node in coordinators"
                  :key="node.ieeeAddr"
                  class="rounded-2xl bg-rose-50/80 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-200"
                >
                  <p class="font-semibold">{{ node.friendlyName }}</p>
                  <p class="mt-1 font-mono text-xs">{{ node.ieeeAddr }}</p>
                </div>
              </div>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <div class="flex row-flex justify-between w-full">
                <p class="text-sm text-muted">{{ t('networkMapPage.routers') }}</p>
                <UBadge color="neutral" size="sm" variant="soft">{{ routers.length }}</UBadge>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <UBadge v-for="node in routers" :key="node.ieeeAddr" color="primary" variant="soft">
                  {{ node.friendlyName }}
                </UBadge>
              </div>
            </UCard>

            <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
              <div class="flex row-flex justify-between w-full">
                <p class="text-sm text-muted">{{ t('networkMapPage.endDevices') }}</p>
                <UBadge color="neutral" size="sm" variant="soft">{{ endDevices.length }}</UBadge>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <UBadge
                  v-for="node in endDevices"
                  :key="node.ieeeAddr"
                  color="neutral"
                  variant="soft"
                >
                  {{ node.friendlyName }}
                </UBadge>
              </div>
            </UCard>
          </div>
          <vNG.VNetworkGraph
            ref="graphRef"
            v-model:layouts="graphLayouts"
            :nodes="graphNodes"
            :edges="graphEdges"
            :configs="graphConfigs"
            :event-handlers="graphEventHandlers"
            class="h-[60vh] min-h-[420px] w-full rounded-3xl border border-default bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.82))] dark:bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.14),transparent_38%),linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.46))]"
          >
            <template #edge-label="{ edge, area, config, hovered, selected, scale }">
              <vNG.VEdgeLabel
                :edge="edge"
                :area="area"
                :config="config"
                :hovered="hovered"
                :selected="selected"
                :scale="scale"
                :text="typeof edge.linkquality === 'number' ? `LQI ${edge.linkquality}` : 'LQI ?'"
              />
            </template>

            <template
              #override-node-label="{
                nodeId,
                scale,
                text,
                x,
                y,
                config,
                textAnchor,
                dominantBaseline,
              }"
            >
              <vNG.VLabelText
                :text="text"
                :x="x"
                :y="y"
                :config="config"
                :scale="scale"
                :text-anchor="textAnchor"
                :dominant-baseline="dominantBaseline"
              />

              <text
                :x="x"
                :y="y + 12 * scale"
                :text-anchor="textAnchor"
                dominant-baseline="hanging"
                :font-size="10 * scale"
                fill="#64748b"
              >
                {{
                  nodeByIeee[nodeId]?.isolated
                    ? t('networkMapPage.isolated')
                    : (nodeByIeee[nodeId]?.type ?? '')
                }}
              </text>
            </template>
          </vNG.VNetworkGraph>

          <UCard class="border-default bg-default/70" :ui="{ body: 'p-4' }">
            <p class="text-sm text-muted">{{ t('networkMapPage.connections') }}</p>

            <div class="mt-4 space-y-3">
              <div
                v-for="(link, index) in enrichedLinks"
                :key="`${link.source.ieeeAddr}-${link.target.ieeeAddr}-${index}`"
                class="rounded-2xl border border-default bg-default px-4 py-3"
              >
                <div class="flex flex-wrap items-center gap-3">
                  <UBadge :color="roleColor(link.sourceNode?.type || '')" variant="soft">
                    {{ formatNodeName(link.sourceNode, link.source.ieeeAddr) }}
                  </UBadge>
                  <UIcon name="i-lucide-arrow-right" class="text-slate-400" />
                  <UBadge :color="roleColor(link.targetNode?.type || '')" variant="soft">
                    {{ formatNodeName(link.targetNode, link.target.ieeeAddr) }}
                  </UBadge>
                  <span class="text-sm text-muted">{{ formatLinkLabel(link) }}</span>
                </div>

                <div v-if="link.routes?.length" class="mt-3 flex flex-wrap gap-2">
                  <UBadge
                    v-for="(route, routeIndex) in link.routes"
                    :key="`${index}-${routeIndex}`"
                    color="neutral"
                    variant="subtle"
                  >
                    {{ route.status || 'route' }} · {{ route.destinationAddress ?? '?' }} via
                    {{ route.nextHop ?? '?' }}
                  </UBadge>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>

      <UModal
        v-model:open="isScanConfirmOpen"
        :title="t('networkMapPage.warningTitle')"
        :ui="{ content: 'sm:max-w-lg' }"
      >
        <template #body>
          <p class="text-sm text-muted">
            {{ t('networkMapPage.warningDescription') }}
          </p>
          <p class="text-sm text-muted">
            {{ t('networkMapPage.warningDuration') }}
          </p>
        </template>

        <template #footer>
          <div class="flex w-full justify-end gap-3">
            <UButton color="neutral" variant="ghost" @click="isScanConfirmOpen = false">
              {{ t('app.cancel') }}
            </UButton>
            <UButton
              icon="i-lucide-scan-search"
              color="warning"
              :loading="loading"
              @click="triggerScan"
            >
              {{ t('networkMapPage.scan') }}
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isNodeModalOpen"
        :title="selectedNode?.friendlyName || t('app.networkMap')"
        :description="selectedNode?.type"
      >
        <template #body>
          <div v-if="selectedNode" class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
                <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {{ t('deviceInfo.ieeeAddress') }}
                </p>
                <p class="mt-1 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
                  {{ selectedNode.ieeeAddr }}
                </p>
              </div>

              <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
                <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {{ t('deviceInfo.networkAddress') }}
                </p>
                <p class="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
                  {{ formatNetworkAddress(selectedNode.networkAddress, t('app.unknown')) }}
                </p>
              </div>

              <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
                <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {{ t('deviceInfo.type') }}
                </p>
                <p class="mt-1 text-sm text-slate-900 dark:text-slate-100">
                  {{ selectedNode.type }}
                </p>
              </div>

              <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
                <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {{ t('networkMapPage.connections') }}
                </p>
                <p class="mt-1 text-sm text-slate-900 dark:text-slate-100">
                  {{ selectedNodeLinks.length }}
                  <span
                    v-if="selectedNode.isolated"
                    class="ml-2 text-slate-500 dark:text-slate-400"
                  >
                    · {{ t('networkMapPage.isolated') }}
                  </span>
                </p>
              </div>

              <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60 sm:col-span-2">
                <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {{ t('networkMapPage.lastSeen') }}
                </p>
                <p class="mt-1 text-sm text-slate-900 dark:text-slate-100">
                  {{ formatNetworkMapLastSeen(selectedNode.lastSeen, t('app.unknown')) }}
                </p>
              </div>

              <div
                v-if="selectedDevice?.description"
                class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60 sm:col-span-2"
              >
                <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {{ t('devicePage.description') }}
                </p>
                <p class="mt-1 text-sm text-slate-900 dark:text-slate-100">
                  {{ selectedDevice.description }}
                </p>
              </div>
            </div>

            <div class="flex justify-end">
              <UButton
                v-if="selectedNode.type !== 'Coordinator'"
                icon="i-lucide-arrow-up-right"
                color="primary"
                :label="t('interview.openDevice')"
                @click="openSelectedDevicePage"
              />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UDashboardPanel>
</template>
