<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import type { RevenuePerBusPoint } from '~/composables/useBusDispatchInsights'

interface Props {
  points: RevenuePerBusPoint[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const ApexChart = VueApexCharts
const { formatCurrency } = useFormatCurrency()

const series = computed(() => [{
  name: 'Revenue',
  data: props.points.map(point => Number(point.revenue))
}])

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  colors: props.points.map(point => point.underperforming ? '#f59e0b' : '#3b82f6'),
  plotOptions: {
    bar: {
      borderRadius: 8,
      columnWidth: '48%',
      distributed: true
    }
  },
  dataLabels: {
    enabled: false
  },
  xaxis: {
    categories: props.points.map(point => point.busNumber),
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '12px'
      }
    }
  },
  yaxis: {
    labels: {
      formatter: (value: number) => formatCurrency(value),
      style: {
        colors: '#64748b'
      }
    }
  },
  tooltip: {
    y: {
      formatter: (value: number, context: { dataPointIndex: number }) => {
        const point = props.points[context.dataPointIndex]
        return `${formatCurrency(value)}${point?.underperforming ? ' (underperforming)' : ''}`
      }
    }
  },
  legend: {
    show: false
  },
  noData: {
    text: 'No revenue data available'
  }
}))
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
    <div class="mb-5 flex items-start justify-between gap-4">
      <div>
        <h3 class="text-lg font-semibold text-slate-900">Revenue per Bus</h3>
        <p class="mt-1 text-sm text-slate-500">Compare bus earnings and identify underperforming assets.</p>
      </div>
      <div class="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-100">
        Amber bars = underperforming
      </div>
    </div>

    <div v-if="loading" class="flex h-[320px] animate-pulse items-end justify-around gap-3 rounded-xl bg-slate-50 px-6 py-8">
      <div v-for="index in 5" :key="index" class="w-10 rounded-t bg-slate-200" :style="{ height: `${80 + index * 25}px` }"></div>
    </div>

    <ApexChart
      v-else
      type="bar"
      height="320"
      :options="chartOptions"
      :series="series"
    />
  </section>
</template>
