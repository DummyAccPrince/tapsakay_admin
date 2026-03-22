<script setup lang="ts">
import { AlertTriangle, TrendingUp, Clock3, Route } from 'lucide-vue-next'
import type { FleetIntelligence } from '~/composables/useDashboardStats'

interface Props {
  intelligence: FleetIntelligence
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const anomalyCount = computed(() => props.intelligence.revenueAnomaly.anomalousBuses.length)
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold text-slate-900">Fleet Intelligence</h2>
        <p class="mt-1 text-sm text-slate-500">Forecast demand, detect route underperformance, and reduce idle time.</p>
      </div>
      <div class="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
        </span>
        Live Insight
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div v-for="index in 3" :key="index" class="min-h-[168px] animate-pulse rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div class="mb-4 h-10 w-10 rounded-xl bg-slate-200"></div>
        <div class="mb-3 h-4 w-32 rounded bg-slate-200"></div>
        <div class="mb-2 h-6 w-24 rounded bg-slate-200"></div>
        <div class="h-3 w-full rounded bg-slate-200"></div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <article class="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Clock3 class="h-5 w-5" />
        </div>
        <p class="text-sm font-medium text-slate-500">Peak Demand Prediction</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {{ intelligence.peakDemandPrediction.predictedWindow }}
        </p>
        <p class="mt-2 text-sm text-slate-600">
          Highest expected passenger volume tomorrow based on the strongest historical demand hour.
        </p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <TrendingUp class="h-5 w-5" />
        </div>
        <p class="text-sm font-medium text-slate-500">Revenue Anomaly</p>
        <p class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          {{ anomalyCount }}
        </p>
        <p class="mt-2 text-sm text-slate-600">
          {{ anomalyCount > 0 ? 'Buses are performing at least 20% below their route average.' : 'No buses are currently underperforming against route averages.' }}
        </p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
        <div class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          <Route class="h-5 w-5" />
        </div>
        <p class="text-sm font-medium text-slate-500">Optimization Suggestion</p>
        <p class="mt-2 text-lg font-semibold tracking-tight text-slate-900">
          {{ intelligence.optimizationSuggestion.routeName }}
        </p>
        <p class="mt-2 text-sm text-slate-600">
          {{ intelligence.optimizationSuggestion.suggestion }}
        </p>
      </article>
    </div>

    <div v-if="!loading && anomalyCount > 0" class="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <div class="flex items-start gap-2">
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Underperforming buses:
          <span class="font-semibold">
            {{ intelligence.revenueAnomaly.anomalousBuses.map(bus => bus.busNumber).join(', ') }}
          </span>
        </p>
      </div>
    </div>
  </section>
</template>
