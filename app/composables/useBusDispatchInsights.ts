export interface BusDispatchRecommendation {
  busId: string
  busNumber: string
  routeName: string
  title: string
  message: string
  reason: 'scheduling_gap' | 'overdue_trip' | 'never_scheduled'
  inactiveHours: number | null
}

export interface BusDispatchInsightBus {
  id: string
  busNumber: string
  plateNumber: string
  routeName: string
  status: string
  isAvailable: boolean
  lastTripAt: string | null
  inactiveHours: number | null
  completedTripCount: number
  activeTripCount: number
  transactionRevenue: number
  transactionCount: number
  inactivityReason: 'active' | 'scheduling_gap' | 'overdue_trip' | 'never_scheduled'
}

export interface FleetUtilizationBreakdown {
  active: number
  inactive: number
  maintenance: number
  total: number
}

export interface RevenuePerBusPoint {
  busId: string
  busNumber: string
  routeName: string
  revenue: number
  transactionCount: number
  underperforming: boolean
}

export interface BusDispatchInsightsResponse {
  maintenanceLogsAvailable: boolean
  summary: FleetUtilizationBreakdown
  recommendation: BusDispatchRecommendation | null
  fleet: BusDispatchInsightBus[]
  charts: {
    utilization: FleetUtilizationBreakdown
    revenuePerBus: RevenuePerBusPoint[]
  }
}

export const useBusDispatchInsights = () => {
  const { data, pending, error, refresh } = useFetch<BusDispatchInsightsResponse>('/api/buses/dispatcher-insights', {
    key: 'bus-dispatch-insights',
    default: () => ({
      maintenanceLogsAvailable: false,
      summary: {
        active: 0,
        inactive: 0,
        maintenance: 0,
        total: 0
      },
      recommendation: null,
      fleet: [],
      charts: {
        utilization: {
          active: 0,
          inactive: 0,
          maintenance: 0,
          total: 0
        },
        revenuePerBus: []
      }
    })
  })

  return {
    insights: computed(() => data.value),
    pending,
    error,
    refresh
  }
}
