import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'
import vueDevTools from 'vite-plugin-vue-devtools'

interface ProxyConnectionConfig {
  id: string
  target: string
  cookie?: string
}

function parseProxyConnections(value: string | undefined): ProxyConnectionConfig[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((item): item is ProxyConnectionConfig => {
      if (typeof item !== 'object' || item === null) {
        return false
      }

      const candidate = item as Record<string, unknown>
      return typeof candidate.id === 'string' && typeof candidate.target === 'string'
    })
  } catch {
    return []
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyConnections = parseProxyConnections(env.Z2M_PROXY_CONNECTIONS)
  const proxyEntries = Object.fromEntries(
    proxyConnections.map((connection) => [
      `/z2m-ws/${connection.id}`,
      {
        target: connection.target,
        changeOrigin: true,
        ws: true,
        rewrite: () => '/api',
        headers: connection.cookie
          ? {
              Cookie: `ingress_session=${connection.cookie}`,
            }
          : undefined,
      },
    ]),
  )

  return {
    plugins: [
      vue(),
      ui({
        ui: {
          colors: {
            primary: 'green',
            neutral: 'zinc',
          },
        },
      }),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: proxyConnections.length
      ? {
          proxy: proxyEntries,
        }
      : undefined,
  }
})
