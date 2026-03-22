<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import type { FleetUtilizationBreakdown } from '~/composables/useBusDispatchInsights'

interface Props {
  data: FleetUtilizationBreakdown
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const ApexChart = VueApexCharts

const series = computed(() => [
  props.data.active,
  props.data.inactive,
  props.data.maintenance
])

const chartOptions = computed(() => ({
  chart: {
    type: 'donut',
    toolbar: { show: false },
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  labels: ['Active', 'Inactive', 'Maintenance'],
  colors: ['#10b981', '#94a3b8', '#f59e0b'],
  stroke: {
    width: 0
  },
  legend: {
    position: 'bottom',
    fontSize: '13px'
  },
  dataLabels: {
    enabled: false
  },
  plotOptions: {
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          total: {
            show: true,
            label: 'Fleet',
            formatter: () => `${props.data.total}`
          }
        }
      }
    }
  },
  tooltip: {
    y: {
      formatter: (value: number) => `${value} bus${value !== 1 ? 'es' : ''}`
    }
  },
  noData: {
    text: 'No fleet data available'
  }
}))
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
    <div class="mb-5">
      <h3 class="text-lg font-semibold text-slate-900">Fleet Utilization</h3>
      <p class="mt-1 text-sm text-slate-500">Active versus inactive fleet capacity.</p>
    </div>

    <div v-if="loading" class="flex h-[320px] animate-pulse items-center justify-center rounded-xl bg-slate-50">
      <div class="h-40 w-40 rounded-full border-[24px] border-slate-200 border-t-slate-300"></div>
    </div>

    <ApexChart
      v-else
      type="donut"
      height="320"
      :options="chartOptions"
      :series="series"
    />
  </section>
</template>
