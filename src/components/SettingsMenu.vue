<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DropdownMenuItem } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'
import { useColorMode } from '@/composables/useColorMode'
import { useLocalePreference } from '@/composables/useLocalePreference'
import { useUiColorPreferences } from '@/composables/useUiColorPreferences'

defineProps<{
  collapsed?: boolean
}>()

const colorMode = useColorMode()
const { t } = useI18n()
const { locale } = useLocalePreference()
const { primary, neutral } = useUiColorPreferences()

const colors = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
]
const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']
const chipColors: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c',
  'old-neutral': '#737373',
}

const user = ref({
  name: '',
  icon: 'lucide:cog',
})

const localeOptions = [
  { value: 'en', labelKey: 'app.english', icon: 'i-lucide-languages' },
  { value: 'ru', labelKey: 'app.russian', icon: 'i-lucide-languages' },
] as const

const items = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('app.colors'),
      icon: 'i-lucide-palette',
      children: [
        {
          label: t('app.primary'),
          slot: 'chip',
          chip: primary.value,
          content: {
            align: 'center',
            collisionPadding: 16,
          },
          children: colors.map((color) => ({
            label: color,
            chip: color,
            slot: 'chip',
            checked: primary.value === color,
            type: 'checkbox',
            onSelect: (e) => {
              e.preventDefault()
              primary.value = color
            },
          })),
        },
        {
          label: t('app.neutral'),
          slot: 'chip',
          chip: neutral.value === 'neutral' ? 'old-neutral' : neutral.value,
          content: {
            align: 'end',
            collisionPadding: 16,
          },
          children: neutrals.map((color) => ({
            label: color,
            chip: color === 'neutral' ? 'old-neutral' : color,
            slot: 'chip',
            type: 'checkbox',
            checked: neutral.value === color,
            onSelect: (e) => {
              e.preventDefault()
              neutral.value = color
            },
          })),
        },
      ],
    },
    {
      label: t('app.theme'),
      icon: 'i-lucide-sun-moon',
      children: [
        {
          label: t('app.light'),
          icon: 'i-lucide-sun',
          type: 'checkbox',
          checked: colorMode.value === 'light',
          onSelect(e: Event) {
            e.preventDefault()
            colorMode.value = 'light'
          },
        },
        {
          label: t('app.dark'),
          icon: 'i-lucide-moon',
          type: 'checkbox',
          checked: colorMode.value === 'dark',
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.value = 'dark'
            }
          },
          onSelect(e: Event) {
            e.preventDefault()
          },
        },
      ],
    },
    {
      label: t('app.language'),
      icon: 'i-lucide-languages',
      children: localeOptions.map((option) => ({
        label: t(option.labelKey),
        icon: option.icon,
        type: 'checkbox',
        checked: locale.value === option.value,
        onSelect(e: Event) {
          e.preventDefault()
          locale.value = option.value
        },
      })),
    },
  ],
])
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...user,
        label: collapsed ? undefined : t('app.settings'),
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down',
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    />

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span
          class="size-2 rounded-full ring ring-bg"
          :style="{
            backgroundColor: chipColors[(item as any).chip] || '#94a3b8',
          }"
        />
      </div>
    </template>
  </UDropdownMenu>
</template>
