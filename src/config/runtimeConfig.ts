export interface VeloraRuntimeConfig {
  connections?: unknown
  apiUrl?: unknown
}

declare global {
  interface Window {
    __VELORA_CONFIG__?: VeloraRuntimeConfig
  }
}

export function getVeloraRuntimeConfig(): VeloraRuntimeConfig {
  if (typeof window === 'undefined') {
    return {}
  }

  return window.__VELORA_CONFIG__ ?? {}
}
