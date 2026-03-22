import { serverSupabaseClient } from '#supabase/server'
import type { BusDispatchInsightsResponse, BusDispatchInsightBus, RevenuePerBusPoint } from '~/composables/useBusDispatchInsights'

interface BusRow {
  id: string
  bus_number: string
  plate_number: string
  route_name: string
  status: 'active' | 'inactive' | 'maintenance'
  is_available: boolean | null
  created_at: string
}

interface TripRow {
  id: string
  bus_id: string
  start_time: string
  end_time: string | null
  status: 'ongoing' | 'completed' | 'cancelled'
  total_fare_collected: string | number | null
}

interface TransactionRow {
  id: string
  bus_id: string | null
  amount: string | number
  status: 'success' | 'failed' | 'pending'
  transaction_type: 'tap_in' | 'tap_out' | 'reload'
}

const round = (value: number) => Number(value.toFixed(2))

export default defineEventHandler(async (event): Promise<BusDispatchInsightsResponse> => {
  const supabase = await serverSupabaseClient(event)

  const [busesRes, tripsRes, transactionsRes, maintenanceLogsCheck] = await Promise.all([
    supabase.from('buses').select('id, bus_number, plate_number, route_name, status, is_available, created_at').order('created_at', { ascending: false }),
    supabase.from('trips').select('id, bus_id, start_time, end_time, status, total_fare_collected').order('start_time', { ascending: false }),
    supabase.from('transactions').select('id, bus_id, amount, status, transaction_type'),
    supabase.from('maintenance_logs').select('id').limit(1)
  ])

  const busesError = busesRes.error
  const tripsError = tripsRes.error
  const transactionsError = transactionsRes.error

  if (busesError || tripsError || transactionsError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load dispatcher insights'
    })
  }

  const maintenanceLogsAvailable = !maintenanceLogsCheck.error
  const buses = (busesRes.data || []) as BusRow[]
  const trips = (tripsRes.data || []) as TripRow[]
  const transactions = (transactionsRes.data || []) as TransactionRow[]

  const busiestRoute = transactions
    .filter(item => item.status === 'success' && ['tap_in', 'tap_out'].includes(item.transaction_type))
    .reduce((acc, transaction) => {
      if (!transaction.bus_id) return acc
      const bus = buses.find(item => item.id === transaction.bus_id)
      if (!bus?.route_name) return acc
      acc.set(bus.route_name, (acc.get(bus.route_name) || 0) + 1)
      return acc
    }, new Map<string, number>())

  const topRoute = Array.from(busiestRoute.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null

  const fleet: BusDispatchInsightBus[] = buses.map((bus) => {
    const busTrips = trips.filter(trip => trip.bus_id === bus.id)
    const completedTrips = busTrips.filter(trip => trip.status === 'completed')
    const ongoingTrips = busTrips.filter(trip => trip.status === 'ongoing')
    const lastTrip = [...busTrips]
      .filter(trip => ['completed', 'ongoing'].includes(trip.status))
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]

    const busTransactions = transactions.filter(transaction =>
      transaction.bus_id === bus.id &&
      transaction.status === 'success' &&
      ['tap_in', 'tap_out'].includes(transaction.transaction_type)
    )

    const transactionRevenue = busTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const inactiveHours = lastTrip
      ? round((Date.now() - new Date(lastTrip.start_time).getTime()) / (1000 * 60 * 60))
      : null

    let inactivityReason: BusDispatchInsightBus['inactivityReason'] = 'active'
    if (bus.status !== 'active') {
      if (!lastTrip) {
        inactivityReason = 'never_scheduled'
      } else if (inactiveHours !== null && inactiveHours >= 48) {
        inactivityReason = 'overdue_trip'
      } else {
        inactivityReason = 'scheduling_gap'
      }
    }

    return {
      id: bus.id,
      busNumber: bus.bus_number,
      plateNumber: bus.plate_number,
      routeName: bus.route_name,
      status: bus.status,
      isAvailable: bus.is_available ?? true,
      lastTripAt: lastTrip?.start_time || null,
      inactiveHours,
      completedTripCount: completedTrips.length,
      activeTripCount: ongoingTrips.length,
      transactionRevenue: round(transactionRevenue),
      transactionCount: busTransactions.length,
      inactivityReason
    }
  })

  const summary = {
    active: fleet.filter(bus => bus.status === 'active').length,
    inactive: fleet.filter(bus => bus.status === 'inactive').length,
    maintenance: fleet.filter(bus => bus.status === 'maintenance').length,
    total: fleet.length
  }

  const avgRevenue = fleet.length > 0
    ? fleet.reduce((sum, bus) => sum + bus.transactionRevenue, 0) / fleet.length
    : 0

  const revenuePerBus: RevenuePerBusPoint[] = fleet.map((bus) => ({
    busId: bus.id,
    busNumber: bus.busNumber,
    routeName: bus.routeName,
    revenue: bus.transactionRevenue,
    transactionCount: bus.transactionCount,
    underperforming: avgRevenue > 0 && bus.transactionRevenue < avgRevenue * 0.8
  }))

  const recommendationTarget = [...fleet]
    .filter(bus => bus.status === 'inactive')
    .sort((a, b) => {
      const aScore = a.inactiveHours ?? Number.MAX_SAFE_INTEGER
      const bScore = b.inactiveHours ?? Number.MAX_SAFE_INTEGER
      return bScore - aScore
    })[0] || null

  const recommendation = recommendationTarget
    ? {
        busId: recommendationTarget.id,
        busNumber: recommendationTarget.busNumber,
        routeName: topRoute || recommendationTarget.routeName,
        title: `${recommendationTarget.busNumber} needs dispatch review`,
        message:
          recommendationTarget.inactivityReason === 'never_scheduled'
            ? `${recommendationTarget.busNumber} has no completed trip history yet; suggest assigning it to the ${topRoute || recommendationTarget.routeName} route to absorb current demand.`
            : `${recommendationTarget.busNumber} has been inactive for ${recommendationTarget.inactiveHours ?? 0} hours; suggest assigning it to the ${topRoute || recommendationTarget.routeName} route due to higher recent traffic.`,
        reason: recommendationTarget.inactivityReason === 'never_scheduled'
          ? 'never_scheduled' as const
          : recommendationTarget.inactivityReason === 'overdue_trip'
            ? 'overdue_trip' as const
            : 'scheduling_gap' as const,
        inactiveHours: recommendationTarget.inactiveHours
      }
    : null

  return {
    maintenanceLogsAvailable,
    summary,
    recommendation,
    fleet,
    charts: {
      utilization: summary,
      revenuePerBus
    }
  }
})
