import { serverSupabaseClient } from '#supabase/server'

interface TripAnalyticsAnomaly {
  id: string
  busId: string
  busNumber: string
  routeName: string
  driverId: string
  startTime: string
  endTime: string | null
  status: 'ongoing' | 'completed' | 'cancelled'
  totalPassengers: number
  totalFareCollected: number
  durationMinutes: number | null
  anomalyTypes: Array<'negative_duration' | 'zero_passengers_completed' | 'missing_end_time_completed' | 'extreme_duration'>
}

interface RouteEfficiencyPoint {
  routeName: string
  totalRevenue: number
  totalDurationMinutes: number
  revenueDensity: number
}

interface PassengerFlowPoint {
  hour: number
  label: string
  tapIn: number
  tapOut: number
}

interface SouthcomDispatchTarget {
  tripId: string
  busNumber: string
  routeName: string
  startTime: string
  avgDurationMinutes: number
  medianDurationMinutes: number
  targetCompletionTime: string | null
  recommendation: string
}

interface TripsAnalyticsResponse {
  dataCleaning: {
    anomalies: TripAnalyticsAnomaly[]
    sqlFixSuggestion: {
      description: string
      preview: string
    }
  }
  efficiencyAnalysis: {
    routes: RouteEfficiencyPoint[]
    mostEfficientRoute: RouteEfficiencyPoint | null
    leastEfficientRoute: RouteEfficiencyPoint | null
  }
  passengerFlowChart: {
    categories: string[]
    series: Array<{
      name: string
      data: number[]
    }>
    points: PassengerFlowPoint[]
  }
  predictiveDispatch: {
    southcomTarget: SouthcomDispatchTarget | null
  }
}

interface TripRow {
  id: string
  bus_id: string
  driver_id: string
  start_time: string
  end_time: string | null
  status: 'ongoing' | 'completed' | 'cancelled'
  total_passengers: number | null
  total_fare_collected: string | number | null
  buses: {
    bus_number: string
    route_name: string
  } | null
}

interface TransactionRow {
  created_at: string
  transaction_type: 'tap_in' | 'tap_out' | 'reload'
  status: 'success' | 'failed' | 'pending'
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits))

const getDurationMinutes = (startTime: string, endTime: string | null) => {
  if (!endTime) return null
  return (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60)
}

const getHourLabel = (hour: number) => `${hour.toString().padStart(2, '0')}:00`

export default defineEventHandler(async (event): Promise<TripsAnalyticsResponse> => {
  const supabase = await serverSupabaseClient(event)

  const [tripsRes, transactionsRes] = await Promise.all([
    supabase
      .from('trips')
      .select(`
        id,
        bus_id,
        driver_id,
        start_time,
        end_time,
        status,
        total_passengers,
        total_fare_collected,
        buses:bus_id(bus_number, route_name)
      `)
      .order('start_time', { ascending: false }),
    supabase
      .from('transactions')
      .select('created_at, transaction_type, status')
  ])

  if (tripsRes.error || transactionsRes.error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load trip analytics'
    })
  }

  const trips = (tripsRes.data || []) as TripRow[]
  const transactions = (transactionsRes.data || []) as TransactionRow[]

  const anomalies: TripAnalyticsAnomaly[] = trips
    .filter((trip) => trip.status === 'completed')
    .map((trip) => {
      const durationMinutes = getDurationMinutes(trip.start_time, trip.end_time)
      const totalPassengers = Number(trip.total_passengers || 0)
      const anomalyTypes: TripAnalyticsAnomaly['anomalyTypes'] = []

      if (durationMinutes !== null && durationMinutes < 0) {
        anomalyTypes.push('negative_duration')
      }
      if (totalPassengers === 0) {
        anomalyTypes.push('zero_passengers_completed')
      }
      if (!trip.end_time) {
        anomalyTypes.push('missing_end_time_completed')
      }
      if (durationMinutes !== null && durationMinutes > 240) {
        anomalyTypes.push('extreme_duration')
      }

      return {
        id: trip.id,
        busId: trip.bus_id,
        busNumber: trip.buses?.bus_number || 'Unknown Bus',
        routeName: trip.buses?.route_name || 'Unknown Route',
        driverId: trip.driver_id,
        startTime: trip.start_time,
        endTime: trip.end_time,
        status: trip.status,
        totalPassengers,
        totalFareCollected: Number(trip.total_fare_collected || 0),
        durationMinutes: durationMinutes === null ? null : round(durationMinutes, 2),
        anomalyTypes
      }
    })
    .filter((trip) => trip.anomalyTypes.length > 0)

  const completedValidTrips = trips.filter((trip) => {
    const durationMinutes = getDurationMinutes(trip.start_time, trip.end_time)
    return trip.status === 'completed' && trip.buses?.route_name && durationMinutes !== null && durationMinutes > 0 && durationMinutes < 240
  })

  const routeMap = completedValidTrips.reduce((acc, trip) => {
    const routeName = trip.buses?.route_name || 'Unknown Route'
    const durationMinutes = getDurationMinutes(trip.start_time, trip.end_time) || 0
    const current = acc.get(routeName) || { totalRevenue: 0, totalDurationMinutes: 0 }
    current.totalRevenue += Number(trip.total_fare_collected || 0)
    current.totalDurationMinutes += durationMinutes
    acc.set(routeName, current)
    return acc
  }, new Map<string, { totalRevenue: number; totalDurationMinutes: number }>())

  const routes: RouteEfficiencyPoint[] = Array.from(routeMap.entries())
    .map(([routeName, values]) => ({
      routeName,
      totalRevenue: round(values.totalRevenue),
      totalDurationMinutes: round(values.totalDurationMinutes),
      revenueDensity: values.totalDurationMinutes > 0 ? round(values.totalRevenue / values.totalDurationMinutes, 4) : 0
    }))
    .sort((a, b) => b.revenueDensity - a.revenueDensity)

  const successfulPassengerTransactions = transactions.filter((transaction) =>
    transaction.status === 'success' && ['tap_in', 'tap_out'].includes(transaction.transaction_type)
  )

  const hourlyMap = new Map<number, { tapIn: number; tapOut: number }>()
  for (let hour = 0; hour < 24; hour += 1) {
    hourlyMap.set(hour, { tapIn: 0, tapOut: 0 })
  }

  successfulPassengerTransactions.forEach((transaction) => {
    const hour = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false
    }).format(new Date(transaction.created_at)))

    const bucket = hourlyMap.get(hour)
    if (!bucket) return

    if (transaction.transaction_type === 'tap_in') {
      bucket.tapIn += 1
    }
    if (transaction.transaction_type === 'tap_out') {
      bucket.tapOut += 1
    }
  })

  const passengerFlowPoints: PassengerFlowPoint[] = Array.from(hourlyMap.entries()).map(([hour, values]) => ({
    hour,
    label: getHourLabel(hour),
    tapIn: values.tapIn,
    tapOut: values.tapOut
  }))

  const southcomCompletedDurations = completedValidTrips
    .filter((trip) => trip.buses?.route_name === 'SOUTHCOM - DIVISORIA')
    .map((trip) => getDurationMinutes(trip.start_time, trip.end_time) || 0)
    .sort((a, b) => a - b)

  const southcomOngoing = trips
    .filter((trip) => trip.status === 'ongoing' && trip.buses?.route_name === 'SOUTHCOM - DIVISORIA')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0]

  let southcomTarget: SouthcomDispatchTarget | null = null
  if (southcomOngoing) {
    const average = southcomCompletedDurations.length > 0
      ? southcomCompletedDurations.reduce((sum, value) => sum + value, 0) / southcomCompletedDurations.length
      : 0

    const middle = Math.floor(southcomCompletedDurations.length / 2)
    const median = southcomCompletedDurations.length === 0
      ? 0
      : southcomCompletedDurations.length % 2 === 0
        ? (southcomCompletedDurations[middle - 1] + southcomCompletedDurations[middle]) / 2
        : southcomCompletedDurations[middle]

    const targetCompletionTime = median > 0
      ? new Date(new Date(southcomOngoing.start_time).getTime() + median * 60 * 1000).toISOString()
      : null

    southcomTarget = {
      tripId: southcomOngoing.id,
      busNumber: southcomOngoing.buses?.bus_number || 'Unknown Bus',
      routeName: southcomOngoing.buses?.route_name || 'Unknown Route',
      startTime: southcomOngoing.start_time,
      avgDurationMinutes: round(average),
      medianDurationMinutes: round(median),
      targetCompletionTime,
      recommendation: median > 0
        ? `Target completion for the ongoing SOUTHCOM - DIVISORIA trip is ${round(median)} minutes from departure, using the historical median to reduce skew from outliers.`
        : 'Not enough completed SOUTHCOM - DIVISORIA trips to generate a dispatch target yet.'
    }
  }

  return {
    dataCleaning: {
      anomalies,
      sqlFixSuggestion: {
        description: 'Flag negative-duration, missing-end-time, extreme-duration, or zero-passenger completed trips for cleanup instead of trusting them in reporting.',
        preview: `update public.trips\nset status = 'cancelled',\n    total_passengers = null,\n    total_fare_collected = null,\n    updated_at = now()\nwhere status = 'completed'\n  and (\n    end_time is null\n    or end_time < start_time\n    or extract(epoch from (end_time - start_time)) / 60.0 > 240\n    or coalesce(total_passengers, 0) = 0\n  );`
      }
    },
    efficiencyAnalysis: {
      routes,
      mostEfficientRoute: routes[0] || null,
      leastEfficientRoute: routes[routes.length - 1] || null
    },
    passengerFlowChart: {
      categories: passengerFlowPoints.map((point) => point.label),
      series: [
        {
          name: 'Tap In',
          data: passengerFlowPoints.map((point) => point.tapIn)
        },
        {
          name: 'Tap Out',
          data: passengerFlowPoints.map((point) => point.tapOut)
        }
      ],
      points: passengerFlowPoints
    },
    predictiveDispatch: {
      southcomTarget
    }
  }
})
