import { createRouter, createWebHistory } from 'vue-router'
import { getDefaultConnectionId, getZ2MConnectionConfig } from '@/config/z2mConnections'
import { getSavedConnectionId, saveConnectionId } from '@/composables/useConnectionPreference'
import DevicesView from '@/views/DevicesView.vue'
import DeviceExposesView from '@/views/DeviceExposesView.vue'
import DeviceInfoView from '@/views/DeviceInfoView.vue'
import NetworkMapView from '@/views/NetworkMapView.vue'
import DeviceStateView from '@/views/DeviceStateView.vue'
import InformationView from '@/views/InformationView.vue'
import LogsView from '@/views/LogsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        const savedConnectionId = getSavedConnectionId()
        const connectionId = savedConnectionId && getZ2MConnectionConfig(savedConnectionId)
          ? savedConnectionId
          : getDefaultConnectionId()

        return `/connections/${connectionId}`
      },
    },
    {
      path: '/connections/:connectionId',
      name: 'devices',
      component: DevicesView,
      props: true,
    },
    {
      path: '/connections/:connectionId/devices/:id',
      redirect: to => `/connections/${to.params.connectionId}/devices/${to.params.id}/exposes`,
    },
    {
      path: '/connections/:connectionId/devices/:id/exposes',
      name: 'device-exposes',
      component: DeviceExposesView,
      props: true,
    },
    {
      path: '/connections/:connectionId/devices/:id/info',
      name: 'device-info',
      component: DeviceInfoView,
      props: true,
    },
    {
      path: '/connections/:connectionId/devices/:id/state',
      name: 'device-state',
      component: DeviceStateView,
      props: true,
    },
    {
      path: '/connections/:connectionId/logs',
      name: 'logs',
      component: LogsView,
      props: true,
    },
    {
      path: '/connections/:connectionId/information',
      name: 'information',
      component: InformationView,
      props: true,
    },
    {
      path: '/connections/:connectionId/network-map',
      name: 'network-map',
      component: NetworkMapView,
      props: true,
    },
  ],
})

router.beforeEach((to) => {
  const rawConnectionId = typeof to.params.connectionId === 'string' ? to.params.connectionId : null

  if (!rawConnectionId) {
    return true
  }

  const connection = getZ2MConnectionConfig(rawConnectionId)

  if (!connection) {
    const fallbackConnectionId = getSavedConnectionId()
    const connectionId = fallbackConnectionId && getZ2MConnectionConfig(fallbackConnectionId)
      ? fallbackConnectionId
      : getDefaultConnectionId()

    if (to.name === 'device-exposes' || to.name === 'device-info' || to.name === 'device-state') {
      return `/connections/${connectionId}/devices/${to.params.id}/${String(to.name).replace('device-', '')}`
    }

    if (to.name === 'logs') {
      return `/connections/${connectionId}/logs`
    }

    if (to.name === 'information') {
      return `/connections/${connectionId}/information`
    }

    if (to.name === 'network-map') {
      return `/connections/${connectionId}/network-map`
    }

    return `/connections/${connectionId}`
  }

  saveConnectionId(rawConnectionId)
  return true
})

export default router
