<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import type { CardTypeDistributionPoint } from '~/composables/useCardFinancialAudit'

interface Props {
  points: CardTypeDistributionPoint[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const ApexChart = VueApexCharts

const series = computed(() => props.points.map(point => point.value))

const chartOptions = computed(() => ({
  chart: {
    type: 'pie',
    toolbar: { show: false },
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  labels: props.points.map(point => point.label),
  colors: ['#2563eb', '#10b981'],
  legend: {
    position: 'bottom'
  },
  dataLabels: {
    enabled: true,
    formatter: (value: number) => `${value.toFixed(0)}%`
  },
  noData: {
    text: 'No card distribution available'
  }
}))
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
    <div class="mb-5">
      <h3 class="text-lg font-semibold text-slate-900">Card Type Distribution</h3>
      <p class="mt-1 text-sm text-slate-500">Reloadable versus single-use card mix.</p>
    </div>

    <div v-if="loading" class="flex h-[320px] animate-pulse items-center justify-center rounded-xl bg-slate-50">
      <div class="h-40 w-40 rounded-full bg-slate-200"></div>
    </div>

    <ApexChart v-else type="pie" height="320" :options="chartOptions" :series="series" />
  </section>
</template>
