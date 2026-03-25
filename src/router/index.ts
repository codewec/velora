import { createRouter, createWebHistory } from 'vue-router'
import { getDefaultConnectionId } from '@/config/z2mConnections'
import DevicesView from '@/views/DevicesView.vue'
import DeviceView from '@/views/DeviceView.vue'
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
      name: 'device',
      component: DeviceView,
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
  ],
})

export default router
