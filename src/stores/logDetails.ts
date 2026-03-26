import { ref } from 'vue'
import { defineStore } from 'pinia'

import type { LogEntry } from '@/stores/logs'

export interface LogDetailsEntry extends LogEntry {
  lineNumber?: number
  line?: string
}

export const useLogDetailsStore = defineStore('logDetails', () => {
  const isOpen = ref(false)
  const selected = ref<LogDetailsEntry | null>(null)

  function open(entry: LogDetailsEntry) {
    // Keep a detached snapshot so the modal content stays stable while
    // incoming log traffic continues to update the underlying stores.
    selected.value = { ...entry }
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function clear() {
    selected.value = null
  }

  return {
    isOpen,
    selected,
    open,
    close,
    clear,
  }
})
