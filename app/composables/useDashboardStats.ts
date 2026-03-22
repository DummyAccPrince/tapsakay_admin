import type { DashboardStats } from '~/types'

export interface ActiveTripActivity {
  id: string
  busNumber: string
  routeName: string
  driverName: string
  location: string
  startedAt: string
  href: string
}

export interface PerformanceSeriesPoint {
  label: string
  revenue: number
  activeTrips: number
}

export interface FleetIntelligence {
  peakDemandPrediction: {
    predictedHourTomorrow: number
    predictedWindow: string
    expectedPassengerVolumeSignal: string
    basis: {
      topHistoricalHour: number
      historicalTransactionCount: number
      historicalRevenue: number
      confidence: string
    }
    reasoning: string
  }
  revenueAnomaly: {
    thresholdRule: string
    anomalousBuses: Array<{
      busId: string
      busNumber: string
      routeName: string
      transactionCount: number
      routeAverageTransactionCount: number
      deviationPercent: number
    }>
    reasoning: string
  }
  optimizationSuggestion: {
    routeName: string
    suggestion: string
    expectedImpact: string
    evidence: {
      observedPattern: string
      exampleTripDurationsMinutes: number[]
    }
  }
}

export interface DashboardStatsResponse {
  stats: DashboardStats
  trends: Record<keyof DashboardStats, string>
  activeTrips: ActiveTripActivity[]
  performanceSeries: PerformanceSeriesPoint[]
  fleetIntelligence: FleetIntelligence
}

export const useDashboardStats = () => {
  const { data, pending, error, refresh } = useFetch<DashboardStatsResponse>('/api/dashboard/stats', {
    key: 'dashboard-stats',
    default: () => ({
      stats: {
        totalUsers: 0,
        totalDrivers: 0,
        totalBuses: 0,
        totalCards: 0,
        totalTransactions: 0,
        totalRevenue: 0,
        activeTrips: 0
      },
      trends: {
        totalUsers: '+0.0%',
        totalDrivers: '+0.0%',
        totalBuses: '+0.0%',
        totalCards: '+0.0%',
        totalTransactions: '+0.0%',
        totalRevenue: '+0.0%',
        activeTrips: '+0.0%'
      },
      activeTrips: [],
      performanceSeries: [],
      fleetIntelligence: {
        peakDemandPrediction: {
          predictedHourTomorrow: 0,
          predictedWindow: '00:00-00:59',
          expectedPassengerVolumeSignal: 'low',
          basis: {
            topHistoricalHour: 0,
            historicalTransactionCount: 0,
            historicalRevenue: 0,
            confidence: 'low'
          },
          reasoning: 'No demand data available yet.'
        },
        revenueAnomaly: {
          thresholdRule: 'Flag buses with transaction volume at least 20% below their route average',
          anomalousBuses: [],
          reasoning: 'No anomaly data available yet.'
        },
        optimizationSuggestion: {
          routeName: 'No route data',
          suggestion: 'No optimization suggestion available yet.',
          expectedImpact: 'Awaiting operational data.',
          evidence: {
            observedPattern: 'No trip pattern available.',
            exampleTripDurationsMinutes: []
          }
        }
      }
    })
  })

  const stats = computed(() => data.value.stats)
  const trends = computed(() => data.value.trends)
  const activeTrips = computed(() => data.value.activeTrips)
  const performanceSeries = computed(() => data.value.performanceSeries)
  const fleetIntelligence = computed(() => data.value.fleetIntelligence)

  return {
    stats,
    trends,
    activeTrips,
    performanceSeries,
    fleetIntelligence,
    pending,
    error,
    refresh
  }
}
