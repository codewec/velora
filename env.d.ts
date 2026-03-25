/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_Z2M_API_URL?: string
  readonly VITE_Z2M_CONNECTIONS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
