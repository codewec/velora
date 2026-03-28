<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import DevicePageShell from '@/components/device/DevicePageShell.vue'
import { useI18n } from 'vue-i18n'
import { useBridgeStore } from '@/stores/bridge'
import { useDevicesStore } from '@/stores/devices'
import { formatBrowserDateTime } from '@/utils/dateTime'
import type { Device, NetworkMapLink, NetworkMapRoute } from '@/types/z2m'
import {
  deviceDisplaySubtitle,
  deviceDisplayTitle,
  deviceImageUrl,
} from '@/utils/devicePresentation'
import {
  formatLinkLabel,
  formatNetworkAddress,
  loadNetworkMapCache,
  networkMapLinksForDevice,
  networkMapNodeByAddress,
  networkMapNodeByIeee,
  networkMapParentCandidate,
  networkMapPeerIeee,
} from '@/utils/networkMap'

const props = defineProps<{
  connectionId: string
  id: string
}>()

const { t } = useI18n()
const bridgeStore = useBridgeStore()
const devicesStore = useDevicesStore()
const router = useRouter()
const cachedNetworkMap = computed(() => loadNetworkMapCache(props.connectionId))
const activeNetworkMap = computed(
  () => bridgeStore.networkMap(props.connectionId) ?? cachedNetworkMap.value?.value ?? null,
)
const cacheUpdatedAtLabel = computed(() =>
  cachedNetworkMap.value?.updatedAt
    ? formatBrowserDateTime(cachedNetworkMap.value.updatedAt)
    : null,
)

function inventoryDevice(ieeeAddr: string) {
  return (
    devicesStore.devicesFor(props.connectionId).find((entry) => entry.ieee_address === ieeeAddr) ??
    null
  )
}

function deviceImage(device: Device | null) {
  return device ? deviceImageUrl(device) : null
}

function deviceTitle(device: Device | null, fallback: string) {
  return device ? deviceDisplayTitle(device) : fallback
}

function deviceSubtitle(device: Device | null, fallback: string) {
  return device ? deviceDisplaySubtitle(device) : fallback
}

function routeHop(ieeeAddr: string | null, title: string, subtitle: string) {
  const device = ieeeAddr ? inventoryDevice(ieeeAddr) : null

  return {
    key: `${ieeeAddr || title}-${subtitle}`,
    title: deviceTitle(device, title),
    subtitle: deviceSubtitle(device, subtitle),
    imageUrl: deviceImage(device),
  }
}

function routeChain(route: NetworkMapRoute, link: NetworkMapLink) {
  const nextHopNode = networkMapNodeByAddress(activeNetworkMap.value, route.nextHop)
  const destinationNode = networkMapNodeByAddress(activeNetworkMap.value, route.destinationAddress)
  const hops: ReturnType<typeof routeHop>[] = []

  const nextHopLabel =
    nextHopNode?.friendlyName || formatNetworkAddress(route.nextHop, t('app.unknown'))

  if (nextHopLabel && nextHopLabel !== t('app.unknown')) {
    hops.push(
      routeHop(
        nextHopNode?.ieeeAddr ?? null,
        nextHopNode?.friendlyName || nextHopLabel,
        nextHopNode?.ieeeAddr || nextHopLabel,
      ),
    )
  }

  const destinationLabel =
    destinationNode?.friendlyName ||
    formatNetworkAddress(route.destinationAddress, t('app.unknown'))

  if (destinationLabel && destinationLabel !== hops[hops.length - 1]?.title) {
    hops.push(
      routeHop(
        destinationNode?.ieeeAddr ?? null,
        destinationNode?.friendlyName || destinationLabel,
        destinationNode?.ieeeAddr || destinationLabel,
      ),
    )
  }

  return {
    hops,
    linkLabel: formatLinkLabel(link),
    status: route.status || t('app.unknown'),
    viaLabel: formatNetworkAddress(route.nextHop, t('app.unknown')),
    destinationLabel: formatNetworkAddress(route.destinationAddress, t('app.unknown')),
  }
}

function isUsefulRoute(routeItem: ReturnType<typeof routeChain>, device: Device) {
  if (routeItem.hops.length === 0) {
    return false
  }

  const currentNetworkAddress = formatNetworkAddress(device.network_address, t('app.unknown'))
  const hasKnownVia = routeItem.viaLabel !== t('app.unknown')
  const hasUsefulDestination =
    routeItem.destinationLabel !== t('app.unknown') &&
    routeItem.destinationLabel !== currentNetworkAddress &&
    routeItem.destinationLabel !== device.ieee_address

  return hasKnownVia || hasUsefulDestination || routeItem.hops.length > 1
}

function usefulRouteItems(device: Device) {
  return networkMapLinksForDevice(activeNetworkMap.value, device.ieee_address)
    .flatMap((link) => (link.routes ?? []).map((route) => routeChain(route, link)))
    .filter((routeItem) => isUsefulRoute(routeItem, device))
}

function openNetworkMap() {
  void router.push(`/connections/${props.connectionId}/network-map`)
}
</script>

<template>
  <DevicePageShell :connection-id="connectionId" :id="id" active-tab="routes">
    <template #default="{ device }">
      <div class="space-y-6">
        <div class="space-y-4">
          <p class="text-sm uppercase tracking-[0.25em] text-slate-500">
            {{ t('devicePage.networkLinks') }}
          </p>

          <UAlert
            color="neutral"
            variant="subtle"
            icon="i-lucide-info"
            :title="t('devicePage.networkLinksHelpTitle')"
            :description="t('devicePage.networkLinksHelpDescription')"
          />

          <UAlert
            v-if="cacheUpdatedAtLabel"
            color="neutral"
            variant="subtle"
            icon="i-lucide-database"
            :title="t('devicePage.networkLinksCacheTitle')"
            :description="
              t('devicePage.networkLinksCacheDescription', { date: cacheUpdatedAtLabel })
            "
          >
            <template #actions>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-lucide-network"
                :label="t('app.networkMap')"
                @click="openNetworkMap"
              />
            </template>
          </UAlert>
        </div>

        <div
          v-if="
            activeNetworkMap &&
            networkMapLinksForDevice(activeNetworkMap, device.ieee_address).length
          "
          class="space-y-4"
        >
          <div
            v-if="networkMapParentCandidate(activeNetworkMap, device)"
            class="rounded-2xl border border-default bg-white/80 p-4 dark:bg-white/5"
          >
            <p class="text-xs uppercase tracking-[0.2em] text-slate-500">
              {{ t('devicePage.parentRouter') }}
            </p>
            <div class="mt-3 flex items-center gap-3">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/80 dark:border-white/10 dark:bg-slate-900/70"
              >
                <img
                  v-if="
                    deviceImage(
                      inventoryDevice(
                        networkMapParentCandidate(activeNetworkMap, device)?.peerNode?.ieeeAddr ??
                          '',
                      ),
                    )
                  "
                  :src="
                    deviceImage(
                      inventoryDevice(
                        networkMapParentCandidate(activeNetworkMap, device)?.peerNode?.ieeeAddr ??
                          '',
                      ),
                    ) || undefined
                  "
                  :alt="networkMapParentCandidate(activeNetworkMap, device)?.peerNode?.friendlyName"
                  class="h-full w-full object-cover"
                />
                <UIcon v-else name="i-lucide-router" class="text-xl text-muted" />
              </div>

              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-highlighted">
                  {{
                    deviceTitle(
                      inventoryDevice(
                        networkMapParentCandidate(activeNetworkMap, device)?.peerNode?.ieeeAddr ??
                          '',
                      ),
                      networkMapParentCandidate(activeNetworkMap, device)?.peerNode?.friendlyName ??
                        t('app.unknown'),
                    )
                  }}
                </p>
                <p class="truncate text-xs text-muted">
                  {{
                    deviceSubtitle(
                      inventoryDevice(
                        networkMapParentCandidate(activeNetworkMap, device)?.peerNode?.ieeeAddr ??
                          '',
                      ),
                      networkMapParentCandidate(activeNetworkMap, device)?.peerNode?.ieeeAddr ??
                        t('app.unknown'),
                    )
                  }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid gap-6 xl:grid-cols-2">
            <div class="space-y-3">
              <p class="text-sm uppercase tracking-[0.25em] text-slate-500">
                {{ t('devicePage.directLinks') }}
              </p>
              <UCard
                v-for="link in networkMapLinksForDevice(activeNetworkMap, device.ieee_address)"
                :key="`${link.source.ieeeAddr}-${link.target.ieeeAddr}`"
                class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
                :ui="{ body: 'p-4' }"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex min-w-0 items-center gap-3">
                    <div
                      class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100/80 dark:border-white/10 dark:bg-slate-900/70"
                    >
                      <img
                        v-if="
                          deviceImage(
                            inventoryDevice(networkMapPeerIeee(link, device.ieee_address)),
                          )
                        "
                        :src="
                          deviceImage(
                            inventoryDevice(networkMapPeerIeee(link, device.ieee_address)),
                          ) || undefined
                        "
                        :alt="
                          networkMapNodeByIeee(
                            activeNetworkMap,
                            networkMapPeerIeee(link, device.ieee_address),
                          )?.friendlyName
                        "
                        class="h-full w-full object-cover"
                      />
                      <UIcon v-else name="i-lucide-cpu" class="text-xl text-muted" />
                    </div>

                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-highlighted">
                        {{
                          deviceTitle(
                            inventoryDevice(networkMapPeerIeee(link, device.ieee_address)),
                            networkMapNodeByIeee(
                              activeNetworkMap,
                              networkMapPeerIeee(link, device.ieee_address),
                            )?.friendlyName || networkMapPeerIeee(link, device.ieee_address),
                          )
                        }}
                      </p>
                      <p class="truncate text-xs text-muted">
                        {{
                          deviceSubtitle(
                            inventoryDevice(networkMapPeerIeee(link, device.ieee_address)),
                            formatNetworkAddress(
                              networkMapNodeByIeee(
                                activeNetworkMap,
                                networkMapPeerIeee(link, device.ieee_address),
                              )?.networkAddress,
                              t('app.unknown'),
                            ),
                          )
                        }}
                      </p>
                    </div>
                  </div>

                  <UBadge color="neutral" variant="soft">
                    {{ formatLinkLabel(link) }}
                  </UBadge>
                </div>
              </UCard>
            </div>

            <div v-if="usefulRouteItems(device).length" class="space-y-3">
              <p class="text-sm uppercase tracking-[0.25em] text-slate-500">
                {{ t('devicePage.knownRoutes') }}
              </p>
              <UCard
                v-for="routeItem in usefulRouteItems(device)"
                :key="`${routeItem.hops.map((hop) => hop.key).join('|')}-${routeItem.status}`"
                class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
                :ui="{ body: 'p-4' }"
              >
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <UIcon
                      v-if="routeItem.hops.length"
                      name="i-lucide-arrow-right"
                      class="text-slate-400"
                    />
                    <template v-for="(hop, hopIndex) in routeItem.hops" :key="hop.key">
                      <div
                        class="flex min-w-[12rem] items-center gap-3 rounded-2xl border border-default bg-slate-50/80 px-3 py-2 dark:bg-white/5"
                      >
                        <div
                          class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100/80 dark:border-white/10 dark:bg-slate-900/70"
                        >
                          <img
                            v-if="hop.imageUrl"
                            :src="hop.imageUrl"
                            :alt="hop.title"
                            class="h-full w-full object-cover"
                          />
                          <UIcon v-else name="i-lucide-cpu" class="text-lg text-muted" />
                        </div>

                        <div class="min-w-0">
                          <p class="truncate text-sm font-semibold text-highlighted">
                            {{ hop.title }}
                          </p>
                          <p class="truncate text-xs text-muted">
                            {{ hop.subtitle }}
                          </p>
                        </div>
                      </div>
                      <UIcon
                        v-if="hopIndex < routeItem.hops.length - 1"
                        name="i-lucide-arrow-right"
                        class="text-slate-400"
                      />
                    </template>
                  </div>
                  <p class="text-xs text-muted">
                    {{ t('devicePage.routeDetails') }}: {{ t('devicePage.routeDestination') }}
                    {{ routeItem.destinationLabel }} · {{ t('devicePage.routeVia') }}
                    {{ routeItem.viaLabel }}
                  </p>
                  <div class="flex items-center gap-2 text-xs text-muted">
                    <UBadge color="neutral" variant="soft">{{ routeItem.linkLabel }}</UBadge>
                    <UBadge color="neutral" variant="outline">{{ routeItem.status }}</UBadge>
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </div>

        <UCard
          v-else-if="activeNetworkMap"
          class="border-slate-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5"
          :ui="{ body: 'p-6' }"
        >
          <div class="space-y-1 text-center">
            <p class="text-sm font-semibold text-highlighted">
              {{ t('devicePage.noNetworkLinks') }}
            </p>
            <p class="text-sm text-muted">{{ t('devicePage.noNetworkLinksDescription') }}</p>
          </div>
        </UCard>

        <UAlert
          v-else
          color="neutral"
          variant="subtle"
          icon="i-lucide-map"
          :title="t('devicePage.networkMapMissingTitle')"
          :description="t('devicePage.networkMapMissingDescription')"
        >
          <template #actions>
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-network"
              :label="t('app.networkMap')"
              @click="openNetworkMap"
            />
          </template>
        </UAlert>
      </div>
    </template>
  </DevicePageShell>
</template>
