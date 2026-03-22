<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  title: string
  description: string
  icon: Component
  to: string
  iconBg?: string
  iconColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  iconBg: 'bg-blue-50',
  iconColor: 'text-blue-600'
})
</script>

<template>
  <NuxtLink :to="to" class="group block h-full">
    <article
      class="flex h-full min-h-[120px] items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.12)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-[0_8px_24px_-8px_rgba(37,99,235,0.24)] active:translate-y-0 active:scale-[0.98]"
    >
      <div
        :class="[
          iconBg,
          'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/5 transition-all duration-200 group-hover:scale-105 group-hover:bg-blue-100'
        ]"
      >
        <component :is="icon" :class="[iconColor, 'h-7 w-7 transition-colors group-hover:text-blue-700']" />
      </div>

      <div class="flex-1 space-y-1">
        <h3 class="text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600">
          {{ title }}
        </h3>
        <p class="text-xs leading-relaxed text-slate-500">
          {{ description }}
        </p>
      </div>

      <svg
        class="h-5 w-5 shrink-0 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-blue-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </article>
  </NuxtLink>
</template>
