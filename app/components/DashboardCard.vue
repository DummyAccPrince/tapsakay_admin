<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  title: string
  value: string | number
  icon: Component
  trend: string
  color: string
  to: string
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const isNegativeTrend = computed(() => props.trend.trim().startsWith('-'))
</script>

<template>
  <NuxtLink :to="to" class="block group">
    <div class="bg-white rounded-xl border border-gray-200 p-6 transition-all duration-200 hover:shadow-xl hover:border-blue-200 group-hover:-translate-y-0.5">
      <div class="flex items-start justify-between mb-4">
        <div :class="[color, 'p-3 rounded-lg shadow-sm']">
          <component :is="icon" class="h-6 w-6 text-white" />
        </div>

        <div
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="isNegativeTrend ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'"
        >
          <span>{{ trend }}</span>
        </div>
      </div>

      <p class="text-sm font-medium text-gray-600 mb-1">{{ title }}</p>
      <p class="text-3xl font-bold text-gray-900 tracking-tight">
        <span v-if="loading" class="inline-block min-w-16 animate-pulse text-gray-300">---</span>
        <span v-else>{{ value }}</span>
      </p>
    </div>
  </NuxtLink>
</template>
