import { serverSupabaseClient } from '#supabase/server'
import type { DashboardStats } from '~/types'
import type { ActiveTripActivity, DashboardStatsResponse, FleetIntelligence, PerformanceSeriesPoint } from '~/composables/useDashboardStats'

interface CreatedAtRow {
  created_at: string
}

interface TransactionRow {
  id: string
  created_at: string
  amount: string | number
  status: 'success' | 'failed' | 'pending'
  transaction_type: 'tap_in' | 'tap_out' | 'reload'
  bus_id: string | null
}

interface TripRow {
  id: string
  created_at: string
  start_time: string
  total_fare_collected: string | number | null
  status: 'ongoing' | 'completed' | 'cancelled'
  start_location: string | null
  end_time?: string | null
  buses: { id?: string; bus_number: string; route_name: string } | null
  drivers: { full_name: string | null } | null
}

const timeZone = 'Asia/Manila'
const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})
const labelFormatter = new Intl.DateTimeFormat('en-PH', {
  timeZone,
  month: 'short',
  day: 'numeric'
})

const getDateKey = (date: string | Date) => dateKeyFormatter.format(new Date(date))
const getLabel = (date: Date) => labelFormatter.format(date)

const startOfDayDaysAgo = (daysAgo: number) => {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  date.setHours(0, 0, 0, 0)
  return date
}

const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? '+0.0%' : '+100.0%'
  }

  const change = ((current - previous) / previous) * 100
  return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`
}

const withinRange = (dateValue: string, start: Date, end: Date) => {
  const value = new Date(dateValue)
  return value >= start && value < end
}

const sumRevenue = (trips: TripRow[]) =>
  trips.reduce((sum, trip) => sum + Number(trip.total_fare_collected || 0), 0)

const toHourWindow = (hour: number) => `${hour.toString().padStart(2, '0')}:00-${hour.toString().padStart(2, '0')}:59`

const getTripMinutes = (trip: TripRow) => {
  if (!trip.end_time) return null
  const start = new Date(trip.start_time).getTime()
  const end = new Date(trip.end_time).getTime()
  const diff = (end - start) / (1000 * 60)
  if (!Number.isFinite(diff) || diff <= 0 || diff > 240) return null
  return diff
}

export default defineEventHandler(async (event): Promise<DashboardStatsResponse> => {
  const supabase = await serverSupabaseClient(event)

  const [usersRes, driversRes, busesRes, cardsRes, transactionsRes, tripsRes] = await Promise.all([
    supabase.from('users').select('created_at'),
    supabase.from('drivers').select('created_at'),
    supabase.from('buses').select('created_at'),
    supabase.from('nfc_cards').select('created_at'),
    supabase.from('transactions').select('id, created_at, amount, status, transaction_type, bus_id'),
    supabase
      .from('trips')
      .select(`
        id,
        created_at,
        start_time,
        end_time,
        total_fare_collected,
        status,
        start_location,
        buses:bus_id(id, bus_number, route_name),
        drivers:driver_id(full_name)
      `)
      .order('start_time', { ascending: false })
  ])

  const queryErrors = [usersRes.error, driversRes.error, busesRes.error, cardsRes.error, transactionsRes.error, tripsRes.error].filter(Boolean)
  if (queryErrors.length > 0) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load dashboard stats'
    })
  }

  const users = (usersRes.data || []) as CreatedAtRow[]
  const drivers = (driversRes.data || []) as CreatedAtRow[]
  const buses = (busesRes.data || []) as CreatedAtRow[]
  const cards = (cardsRes.data || []) as CreatedAtRow[]
  const transactions = (transactionsRes.data || []) as TransactionRow[]
  const trips = (tripsRes.data || []) as TripRow[]

  const currentWindowStart = startOfDayDaysAgo(7)
  const previousWindowStart = startOfDayDaysAgo(14)

  const periodCounts = (rows: CreatedAtRow[]) => {
    const current = rows.filter(row => withinRange(row.created_at, currentWindowStart, new Date())).length
    const previous = rows.filter(row => withinRange(row.created_at, previousWindowStart, currentWindowStart)).length
    return calculateTrend(current, previous)
  }

  const totalRevenueTrips = trips.filter(trip => trip.status === 'completed')
  const totalRevenue = sumRevenue(totalRevenueTrips)

  const currentRevenueTrips = totalRevenueTrips.filter(trip => withinRange(trip.start_time, currentWindowStart, new Date()))
  const previousRevenueTrips = totalRevenueTrips.filter(trip => withinRange(trip.start_time, previousWindowStart, currentWindowStart))

  const currentActiveTrips = trips.filter(trip => trip.status === 'ongoing' && withinRange(trip.start_time, currentWindowStart, new Date())).length
  const previousActiveTrips = trips.filter(trip => trip.status === 'ongoing' && withinRange(trip.start_time, previousWindowStart, currentWindowStart)).length

  const trendValues: DashboardStatsResponse['trends'] = {
    totalUsers: periodCounts(users),
    totalDrivers: periodCounts(drivers),
    totalBuses: periodCounts(buses),
    totalCards: periodCounts(cards),
    totalTransactions: periodCounts(transactions.map(({ created_at }) => ({ created_at }))),
    totalRevenue: calculateTrend(sumRevenue(currentRevenueTrips), sumRevenue(previousRevenueTrips)),
    activeTrips: calculateTrend(currentActiveTrips, previousActiveTrips)
  }

  const chartDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - index))
    date.setHours(0, 0, 0, 0)
    const key = getDateKey(date)

    return {
      key,
      label: getLabel(date),
      revenue: 0,
      activeTrips: 0
    }
  })

  const chartBuckets = new Map<string, PerformanceSeriesPoint>()
  chartDays.forEach(day => {
    chartBuckets.set(day.key, {
      label: day.label,
      revenue: 0,
      activeTrips: 0
    })
  })

  trips.forEach((trip) => {
    const dayKey = getDateKey(trip.start_time)
    const bucket = chartBuckets.get(dayKey)
    if (!bucket) return

    if (trip.status === 'completed') {
      bucket.revenue += Number(trip.total_fare_collected || 0)
    }

    if (trip.status === 'ongoing') {
      bucket.activeTrips += 1
    }
  })

  const performanceSeries = Array.from(chartBuckets.values())

  const activeTrips = trips
    .filter(trip => trip.status === 'ongoing')
    .slice(0, 5)
    .map((trip): ActiveTripActivity => ({
      id: trip.id,
      busNumber: trip.buses?.bus_number || 'No Bus',
      routeName: trip.buses?.route_name || 'No Route',
      driverName: trip.drivers?.full_name || 'Unknown Driver',
      location: trip.start_location || trip.buses?.route_name || 'On route',
      startedAt: trip.start_time,
      href: '/live-map'
    }))

  const successfulPassengerTransactions = transactions.filter(transaction =>
    transaction.status === 'success' && ['tap_in', 'tap_out'].includes(transaction.transaction_type)
  )

  const hourlyDemand = successfulPassengerTransactions.reduce((acc, transaction) => {
    const hour = Number(new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false
    }).format(new Date(transaction.created_at)))

    if (!acc.has(hour)) {
      acc.set(hour, { transactionCount: 0, revenue: 0 })
    }

    const current = acc.get(hour)!
    current.transactionCount += 1
    current.revenue += Number(transaction.amount || 0)
    return acc
  }, new Map<number, { transactionCount: number; revenue: number }>())

  const bestHourEntry = Array.from(hourlyDemand.entries()).sort((a, b) => {
    if (b[1].transactionCount !== a[1].transactionCount) {
      return b[1].transactionCount - a[1].transactionCount
    }
    return b[1].revenue - a[1].revenue
  })[0] ?? [0, { transactionCount: 0, revenue: 0 }]

  const busPerformance = successfulPassengerTransactions.reduce((acc, transaction) => {
    if (!transaction.bus_id) return acc
    const trip = trips.find(item => item.buses?.id === transaction.bus_id)
    const busNumber = trip?.buses?.bus_number || 'Unknown Bus'
    const routeName = trip?.buses?.route_name || 'Unknown Route'

    if (!acc.has(transaction.bus_id)) {
      acc.set(transaction.bus_id, {
        busId: transaction.bus_id,
        busNumber,
        routeName,
        transactionCount: 0,
        revenue: 0
      })
    }

    const current = acc.get(transaction.bus_id)!
    current.transactionCount += 1
    current.revenue += Number(transaction.amount || 0)
    return acc
  }, new Map<string, { busId: string; busNumber: string; routeName: string; transactionCount: number; revenue: number }>())

  const routeAverages = Array.from(busPerformance.values()).reduce((acc, bus) => {
    if (!acc.has(bus.routeName)) {
      acc.set(bus.routeName, [])
    }
    acc.get(bus.routeName)!.push(bus.transactionCount)
    return acc
  }, new Map<string, number[]>())

  const anomalousBuses = Array.from(busPerformance.values()).flatMap((bus) => {
    const routeValues = routeAverages.get(bus.routeName) || []
    const routeAverage = routeValues.length > 0
      ? routeValues.reduce((sum, value) => sum + value, 0) / routeValues.length
      : 0

    if (routeAverage === 0 || bus.transactionCount >= routeAverage * 0.8) {
      return []
    }

    return [{
      busId: bus.busId,
      busNumber: bus.busNumber,
      routeName: bus.routeName,
      transactionCount: bus.transactionCount,
      routeAverageTransactionCount: Number(routeAverage.toFixed(2)),
      deviationPercent: Number((((routeAverage - bus.transactionCount) / routeAverage) * 100).toFixed(1))
    }]
  })

  const routeTripDurations = trips.reduce((acc, trip) => {
    const routeName = trip.buses?.route_name
    const duration = getTripMinutes(trip)
    if (!routeName || duration === null || trip.status !== 'completed') return acc

    if (!acc.has(routeName)) {
      acc.set(routeName, [])
    }
    acc.get(routeName)!.push(duration)
    return acc
  }, new Map<string, number[]>())

  const optimizationTarget = Array.from(routeTripDurations.entries())
    .map(([routeName, durations]) => ({
      routeName,
      durations,
      shortTrips: durations.filter(duration => duration < 5).length
    }))
    .sort((a, b) => b.shortTrips - a.shortTrips)[0]

  const fleetIntelligence: FleetIntelligence = {
    peakDemandPrediction: {
      predictedHourTomorrow: bestHourEntry[0],
      predictedWindow: toHourWindow(bestHourEntry[0]),
      expectedPassengerVolumeSignal: bestHourEntry[1].transactionCount > 0 ? 'highest' : 'low',
      basis: {
        topHistoricalHour: bestHourEntry[0],
        historicalTransactionCount: bestHourEntry[1].transactionCount,
        historicalRevenue: Number(bestHourEntry[1].revenue.toFixed(2)),
        confidence: bestHourEntry[1].transactionCount >= 5 ? 'medium' : 'low'
      },
      reasoning: bestHourEntry[1].transactionCount > 0
        ? 'This hour has the strongest observed passenger transaction volume, with revenue used as the tie-breaker.'
        : 'No strong transaction pattern is available yet.'
    },
    revenueAnomaly: {
      thresholdRule: 'Flag buses with transaction volume at least 20% below their route average',
      anomalousBuses,
      reasoning: anomalousBuses.length > 0
        ? 'These buses are materially below the average transaction volume of other buses on the same route.'
        : 'No buses are currently underperforming against their route average, or each route only has a single bus in the dataset.'
    },
    optimizationSuggestion: {
      routeName: optimizationTarget?.routeName || 'No route data',
      suggestion: optimizationTarget
        ? `Reduce short-turn idle churn on the ${optimizationTarget.routeName} route by consolidating very short trips into fewer scheduled departures during peak windows.`
        : 'No optimization suggestion available yet.',
      expectedImpact: optimizationTarget
        ? 'Lower idle/reset time between trips and better vehicle utilization.'
        : 'Awaiting more completed trip data.',
      evidence: {
        observedPattern: optimizationTarget
          ? `Observed ${optimizationTarget.shortTrips} short completed trips under 5 minutes, which suggests fragmented dispatching or idle-reset overhead.`
          : 'No trip pattern available.',
        exampleTripDurationsMinutes: optimizationTarget
          ? optimizationTarget.durations.filter(duration => duration < 5).slice(0, 7).map(duration => Number(duration.toFixed(2)))
          : []
      }
    }
  }

  const stats: DashboardStats = {
    totalUsers: users.length,
    totalDrivers: drivers.length,
    totalBuses: buses.length,
    totalCards: cards.length,
    totalTransactions: transactions.length,
    totalRevenue,
    activeTrips: trips.filter(trip => trip.status === 'ongoing').length
  }

  return {
    stats,
    trends: trendValues,
    activeTrips,
    performanceSeries,
    fleetIntelligence
  }
})
