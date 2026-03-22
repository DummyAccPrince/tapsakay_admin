<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import type { DiscountBalancePoint } from '~/composables/useCardFinancialAudit'

interface Props {
  points: DiscountBalancePoint[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const ApexChart = VueApexCharts
const { formatCurrency } = useFormatCurrency()

const series = computed(() => [{
  name: 'Total Balance',
  data: props.points.map(point => point.totalBalance)
}])

const chartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  colors: ['#7c3aed'],
  plotOptions: {
    bar: {
      borderRadius: 8,
      columnWidth: '48%'
    }
  },
  dataLabels: {
    enabled: false
  },
  xaxis: {
    categories: props.points.map(point => point.label)
  },
  yaxis: {
    labels: {
      formatter: (value: number) => formatCurrency(value)
    }
  },
  tooltip: {
    y: {
      formatter: (value: number) => formatCurrency(value)
    }
  },
  noData: {
    text: 'No balance distribution available'
  }
}))
</script>

<template>
  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
    <div class="mb-5">
      <h3 class="text-lg font-semibold text-slate-900">Total Balance by Discount Category</h3>
      <p class="mt-1 text-sm text-slate-500">Compare stored value exposure by fare class.</p>
    </div>

    <div v-if="loading" class="flex h-[320px] animate-pulse items-end justify-around gap-3 rounded-xl bg-slate-50 px-6 py-8">
      <div v-for="index in 4" :key="index" class="w-10 rounded-t bg-slate-200" :style="{ height: `${90 + index * 30}px` }"></div>
    </div>

    <ApexChart v-else type="bar" height="320" :options="chartOptions" :series="series" />
  </section>
</template>
