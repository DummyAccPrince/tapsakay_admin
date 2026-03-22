<script setup lang="ts">
import { AlertTriangle, ArrowRight, Clock3 } from 'lucide-vue-next'
import type { BusDispatchRecommendation } from '~/composables/useBusDispatchInsights'

interface Props {
  recommendation: BusDispatchRecommendation | null
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  loading: false
})
</script>

<template>
  <section class="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-white p-5 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.3)]">
    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-4 w-40 rounded bg-amber-200"></div>
      <div class="h-6 w-2/3 rounded bg-amber-200"></div>
      <div class="h-4 w-full rounded bg-amber-100"></div>
    </div>

    <div v-else-if="recommendation" class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-start gap-4">
        <div class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle class="h-5 w-5" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Smart Recommendation</p>
          <h2 class="mt-1 text-lg font-semibold text-slate-900">{{ recommendation.title }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">{{ recommendation.message }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              <Clock3 class="h-3.5 w-3.5" />
              <span v-if="recommendation.inactiveHours !== null">Inactive for {{ recommendation.inactiveHours }}h</span>
              <span v-else>No completed trip history</span>
            </span>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">
              Suggested route: {{ recommendation.routeName }}
            </span>
          </div>
        </div>
      </div>

      <div class="inline-flex items-center gap-2 self-start rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Dispatch suggestion
        <ArrowRight class="h-4 w-4" />
      </div>
    </div>

    <div v-else class="flex items-center gap-3 text-sm text-slate-600">
      <div class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
        <AlertTriangle class="h-5 w-5" />
      </div>
      <div>
        <p class="font-semibold text-slate-900">No urgent dispatcher recommendation</p>
        <p class="text-slate-500">Fleet activity looks balanced based on current trip and revenue signals.</p>
      </div>
    </div>
  </section>
</template>
