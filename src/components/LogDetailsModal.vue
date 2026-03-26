<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLogDetailsStore } from '@/stores/logDetails'
import {
  parseBridgeLoggingPayload,
  parseTopicPayload,
  prettyJson,
  rawLine,
} from '@/utils/logPresentation'

const logDetailsStore = useLogDetailsStore()
const { t } = useI18n()
const toast = useToast()

const selected = computed(() => logDetailsStore.selected)
const parsedTopicPayload = computed(() =>
  selected.value ? parseTopicPayload(selected.value.raw) : null,
)
const parsedBridgeLoggingPayload = computed(() =>
  selected.value ? parseBridgeLoggingPayload(selected.value.raw) : null,
)

async function copyText(value: string, title: string) {
  await navigator.clipboard.writeText(value)
  toast.add({
    title,
    color: 'success',
  })
}

watch(
  () => logDetailsStore.isOpen,
  (open) => {
    if (!open) {
      window.setTimeout(() => {
        if (!logDetailsStore.isOpen) {
          logDetailsStore.clear()
        }
      }, 220)
    }
  },
)
</script>

<template>
  <UModal
    :open="logDetailsStore.isOpen"
    :title="selected?.summary || t('logsPage.title')"
    :description="
      selected
        ? `[${new Date(selected.time).toLocaleString()}] ${selected.kind} ${selected.level}`
        : undefined
    "
    :ui="{ content: 'sm:max-w-4xl' }"
    @update:open="(open: boolean) => (open ? null : logDetailsStore.close())"
  >
    <template #body>
      <div v-if="selected" class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div
            v-if="selected.lineNumber != null"
            class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60"
          >
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.line') }}
            </p>
            <p class="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ selected.lineNumber }}
            </p>
          </div>

          <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.timestamp') }}
            </p>
            <p class="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ new Date(selected.time).toLocaleString() }}
            </p>
          </div>

          <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.level') }}
            </p>
            <p class="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ selected.level }}
            </p>
          </div>

          <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.kind') }}
            </p>
            <p class="mt-1 font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ selected.kind }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
          <div class="flex items-start justify-between gap-3">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.message') }}
            </p>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="copyText(selected.line || rawLine(selected), t('logsPage.messageCopied'))"
            />
          </div>
          <textarea
            readonly
            :value="selected.line || rawLine(selected)"
            class="mt-2 min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white/90 p-3 font-mono text-xs leading-5 text-slate-800 outline-none dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-200"
          />
        </div>

        <div v-if="parsedBridgeLoggingPayload" class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.errorMessage') }}
            </p>
            <p class="mt-1 break-words font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ parsedBridgeLoggingPayload.message }}
            </p>
          </div>
          <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.sourceDevice') }}
            </p>
            <p class="mt-1 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ parsedBridgeLoggingPayload.deviceName || t('app.unknown') }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
          <div class="flex items-start justify-between gap-3">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {{ t('logsPage.payload') }}
            </p>
            <UButton
              icon="i-lucide-copy"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="copyText(prettyJson(selected.raw), t('logsPage.payloadCopied'))"
            />
          </div>
          <textarea
            readonly
            :value="prettyJson(selected.raw)"
            class="mt-2 min-h-48 w-full resize-y rounded-xl border border-slate-200 bg-white/90 p-3 font-mono text-xs leading-5 text-slate-800 outline-none dark:border-white/10 dark:bg-slate-950/80 dark:text-slate-200"
          />
        </div>

        <div v-if="parsedTopicPayload" class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Topic</p>
            <p class="mt-1 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ parsedTopicPayload.topic }}
            </p>
          </div>
          <div class="rounded-2xl bg-slate-100/80 p-3 dark:bg-slate-900/60">
            <p class="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Payload
            </p>
            <p class="mt-1 break-all font-mono text-sm text-slate-900 dark:text-slate-100">
              {{ parsedTopicPayload.payload }}
            </p>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
