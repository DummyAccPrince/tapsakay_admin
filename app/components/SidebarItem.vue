<script setup lang="ts">
import type { Component } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

interface SubItem {
  name: string
  href: string
}

interface Props {
  name: string
  href: string
  icon: Component
  isActive: boolean
  isCollapsed?: boolean
  badge?: {
    type: 'live' | 'count' | 'new'
    value?: number
  }
  subItems?: SubItem[]
}

const props = withDefaults(defineProps<Props>(), {
  isCollapsed: false
})

const route = useRoute()
const isExpanded = ref(false)

const hasActiveSubItem = computed(() => {
  if (!props.subItems) return false
  return props.subItems.some(sub => route.path.startsWith(sub.href))
})

const toggleExpand = (e?: Event) => {
  if (props.subItems && !props.isCollapsed) {
    e?.preventDefault()
    e?.stopPropagation()
    isExpanded.value = !isExpanded.value
  }
}

// Auto-expand if sub-item is active
watch(() => hasActiveSubItem.value, (active) => {
  if (active) isExpanded.value = true
}, { immediate: true })
</script>

<template>
  <div>
    <!-- Main Item -->
    <NuxtLink
      :to="href"
      :class="[
        'group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out',
        isActive || hasActiveSubItem
          ? 'bg-emerald-50/80 text-emerald-700 shadow-[inset_3px_0_0_0_#10b981]'
          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900 hover:-translate-x-0.5 hover:shadow-sm',
        isCollapsed && 'justify-center px-2'
      ]"
    >
      <!-- Icon -->
      <component
        :is="icon"
        :class="[
          'h-5 w-5 shrink-0 transition-all duration-200',
          isActive || hasActiveSubItem ? 'text-emerald-600' : 'text-slate-500 group-hover:text-slate-700 group-hover:scale-110'
        ]"
      />

      <!-- Label & Badge (hidden when collapsed) -->
      <span v-if="!isCollapsed" class="flex flex-1 items-center justify-between gap-2">
        <span class="truncate">{{ name }}</span>

        <!-- Badges -->
        <div class="flex items-center gap-1.5">
          <!-- Live Badge -->
          <span
            v-if="badge?.type === 'live'"
            class="relative flex h-2 w-2"
          >
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>

          <!-- Count Badge -->
          <span
            v-if="badge?.type === 'count' && badge.value"
            class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-500 px-1.5 text-[10px] font-bold text-white tabular-nums"
          >
            {{ badge.value > 99 ? '99+' : badge.value }}
          </span>

          <!-- New Badge -->
          <span
            v-if="badge?.type === 'new'"
            class="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
          >
            New
          </span>

          <!-- Expand Icon for Sub-Items -->
          <button
            v-if="subItems"
            @click="toggleExpand"
            class="flex items-center justify-center rounded p-0.5 hover:bg-slate-200/50"
            type="button"
          >
            <ChevronDown
              :class="[
                'h-4 w-4 transition-transform duration-200',
                isExpanded ? 'rotate-180' : ''
              ]"
            />
          </button>
        </div>
      </span>

      <!-- Tooltip for collapsed state -->
      <div
        v-if="isCollapsed"
        class="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:block"
      >
        {{ name }}
        <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
      </div>
    </NuxtLink>

    <!-- Sub-Items (with transition) -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2 max-h-0"
      enter-to-class="opacity-100 translate-y-0 max-h-96"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0 max-h-96"
      leave-to-class="opacity-0 -translate-y-2 max-h-0"
    >
      <div v-if="subItems && isExpanded && !isCollapsed" class="ml-8 mt-1 space-y-1 overflow-hidden border-l-2 border-slate-200 pl-3">
        <NuxtLink
          v-for="subItem in subItems"
          :key="subItem.href"
          :to="subItem.href"
          :class="[
            'block rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
            route.path.startsWith(subItem.href)
              ? 'bg-emerald-50 text-emerald-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          ]"
        >
          {{ subItem.name }}
        </NuxtLink>
      </div>
    </Transition>
  </div>
</template>
