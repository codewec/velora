import { createRouter, createWebHistory } from 'vue-router'
import { getDefaultConnectionId } from '@/config/z2mConnections'
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
      redirect: `/connections/${getDefaultConnectionId()}`,
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

export default router
