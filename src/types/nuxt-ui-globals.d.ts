export {}

declare global {
  const useToast: typeof import('@nuxt/ui/composables').useToast
  const useAppConfig: typeof import('@nuxt/ui/dist/runtime/vue/composables/useAppConfig.js').useAppConfig
}
