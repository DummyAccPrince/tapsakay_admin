<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'
import type { PerformanceSeriesPoint } from '~/composables/useDashboardStats'

interface Props {
  seriesData: PerformanceSeriesPoint[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const ApexChart = VueApexCharts
const { formatCurrency } = useFormatCurrency()

// Format currency for Y-axis with abbreviations
const formatAxisCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `₱${(value / 1000).toFixed(1)}k`
  }
  return `₱${value.toFixed(0)}`
}

const categories = computed(() => props.seriesData.map(point => point.label))

const series = computed(() => [
  {
    name: 'Revenue',
    type: 'area',
    data: props.seriesData.map(point => Number(point.revenue))
  },
  {
    name: 'Active Trips',
    type: 'bar',
    data: props.seriesData.map(point => Number(point.activeTrips))
  }
])

const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'Inter, system-ui, sans-serif',
    foreColor: '#64748b',
    stacked: false,
    background: 'transparent'
  },
  colors: ['#10b981', '#3b82f6'],
  stroke: {
    curve: 'smooth',
    width: [3, 0]
  },
  fill: {
    type: ['gradient', 'solid'],
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.4,
      opacityTo: 0.05,
      stops: [0, 85, 100]
    }
  },
  markers: {
    size: 5,
    colors: ['#10b981'],
    strokeColors: '#ffffff',
    strokeWidth: 2.5,
    hover: {
      size: 7,
      sizeOffset: 2
    }
  },
  plotOptions: {
    bar: {
      columnWidth: '42%',
      borderRadius: 8,
      borderRadiusApplication: 'end'
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    borderColor: '#e2e8f0',
    strokeDashArray: 3,
    padding: {
      left: 10,
      right: 10
    }
  },
  xaxis: {
    categories: categories.value,
    axisBorder: {
      color: '#cbd5e1',
      height: 1
    },
    axisTicks: {
      color: '#cbd5e1'
    },
    labels: {
      rotate: -45,
      rotateAlways: false,
      style: {
        colors: '#64748b',
        fontSize: '12px',
        fontWeight: 500
      }
    }
  },
  yaxis: [
    {
      seriesName: 'Revenue',
      title: {
        text: 'Revenue (₱)',
        style: {
          color: '#10b981',
          fontSize: '13px',
          fontWeight: 600
        }
      },
      labels: {
        formatter: (value: number) => formatAxisCurrency(value),
        style: {
          colors: '#64748b',
          fontSize: '12px',
          fontWeight: 500
        }
      },
      axisBorder: {
        show: true,
        color: '#10b981'
      }
    },
    {
      opposite: true,
      seriesName: 'Active Trips',
      title: {
        text: 'Active Trips',
        style: {
          color: '#3b82f6',
          fontSize: '13px',
          fontWeight: 600
        }
      },
      labels: {
        formatter: (value: number) => `${Math.round(value)}`,
        style: {
          colors: '#64748b',
          fontSize: '12px',
          fontWeight: 500
        }
      },
      axisBorder: {
        show: true,
        color: '#3b82f6'
      }
    }
  ],
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    fontSize: '14px',
    fontWeight: 600,
    markers: {
      width: 12,
      height: 12,
      radius: 3
    },
    itemMargin: {
      horizontal: 16
    }
  },
  tooltip: {
    shared: true,
    intersect: false,
    theme: 'light',
    style: {
      fontSize: '13px'
    },
    y: [
      {
        formatter: (value: number) => formatCurrency(value),
        title: {
          formatter: () => 'Revenue: '
        }
      },
      {
        formatter: (value: number) => `${Math.round(value)} trips`,
        title: {
          formatter: () => 'Active Trips: '
        }
      }
    ]
  },
  noData: {
    text: 'No performance data available',
    style: {
      color: '#64748b',
      fontSize: '14px'
    }
  }
}))
</script>

<template>
  <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
    <div class="mb-6 flex items-start justify-between gap-4">
      <div>
        <h3 class="text-xl font-semibold text-slate-900">Performance Overview</h3>
        <p class="mt-1 text-sm text-slate-500">Revenue and active trip activity over time</p>
      </div>
      <div class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        Live Data
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="loading" class="h-[400px] w-full animate-pulse space-y-4">
      <div class="flex items-center gap-6">
        <div class="h-4 w-24 rounded bg-slate-200"></div>
        <div class="h-4 w-24 rounded bg-slate-200"></div>
      </div>
      <div class="relative h-[340px] w-full rounded-lg bg-slate-100">
        <div class="absolute inset-0 flex items-end justify-around gap-2 p-8">
          <div class="h-32 w-12 rounded-t bg-slate-200"></div>
          <div class="h-48 w-12 rounded-t bg-slate-200"></div>
          <div class="h-40 w-12 rounded-t bg-slate-200"></div>
          <div class="h-56 w-12 rounded-t bg-slate-200"></div>
          <div class="h-44 w-12 rounded-t bg-slate-200"></div>
          <div class="h-52 w-12 rounded-t bg-slate-200"></div>
          <div class="h-36 w-12 rounded-t bg-slate-200"></div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div 
      v-else-if="props.seriesData.length === 0" 
      class="flex h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50"
    >
      <svg class="mb-4 h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p class="text-sm font-medium text-slate-600">No performance data available</p>
      <p class="mt-1 text-xs text-slate-400">Data will appear here once transactions are recorded</p>
    </div>

    <!-- Chart -->
    <div v-else class="w-full overflow-hidden">
      <ApexChart
        type="line"
        height="400"
        :options="chartOptions"
        :series="series"
        class="w-full"
      />
    </div>
  </div>
</template>
