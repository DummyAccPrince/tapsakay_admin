<script setup lang="ts">
import {
  Users,
  Bus,
  CreditCard,
  Receipt,
  TrendingUp,
  UserCheck,
  MapPin,
  UserPlus,
  BusFront,
  Map
} from 'lucide-vue-next'

definePageMeta({
  middleware: 'auth'
})

const { formatCurrency } = useFormatCurrency()
const { stats, trends, activeTrips, performanceSeries, fleetIntelligence, pending: loading } = useDashboardStats()

const statCards = computed(() => [
  {
    title: 'Total Users',
    value: stats.value.totalUsers,
    icon: Users,
    color: 'bg-blue-500',
    trend: trends.value.totalUsers,
    to: '/users'
  },
  {
    title: 'Active Drivers',
    value: stats.value.totalDrivers,
    icon: UserCheck,
    color: 'bg-green-500',
    trend: trends.value.totalDrivers,
    to: '/drivers'
  },
  {
    title: 'Total Buses',
    value: stats.value.totalBuses,
    icon: Bus,
    color: 'bg-purple-500',
    trend: trends.value.totalBuses,
    to: '/buses'
  },
  {
    title: 'NFC Cards',
    value: stats.value.totalCards,
    icon: CreditCard,
    color: 'bg-orange-500',
    trend: trends.value.totalCards,
    to: '/cards'
  },
  {
    title: 'Transactions',
    value: stats.value.totalTransactions,
    icon: Receipt,
    color: 'bg-pink-500',
    trend: trends.value.totalTransactions,
    to: '/transactions'
  },
  {
    title: 'Total Revenue',
    value: formatCurrency(stats.value.totalRevenue),
    icon: TrendingUp,
    color: 'bg-emerald-500',
    trend: trends.value.totalRevenue,
    to: '/transactions'
  },
  {
    title: 'Active Trips',
    value: stats.value.activeTrips,
    icon: MapPin,
    color: 'bg-red-500',
    trend: trends.value.activeTrips,
    to: '/live-map'
  }
])

const quickActions = [
  { 
    title: 'Add Driver', 
    description: 'Register new drivers and assign credentials',
    href: '/drivers?action=add', 
    icon: UserPlus 
  },
  { 
    title: 'Add Bus', 
    description: 'Add vehicles to your fleet inventory',
    href: '/buses?action=add', 
    icon: BusFront 
  },
  { 
    title: 'Create NFC Card', 
    description: 'Issue tap cards for passenger payments',
    href: '/cards?action=add', 
    icon: CreditCard 
  },
  { 
    title: 'View Live Map', 
    description: 'Track active buses in real-time',
    href: '/live-map', 
    icon: Map 
  }
]
</script>

<template>
  <div>
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p class="text-gray-600">Welcome to Tapsakay Admin Dashboard</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <DashboardCard
        v-for="stat in statCards"
        :key="stat.title"
        :title="stat.title"
        :value="stat.value"
        :icon="stat.icon"
        :trend="stat.trend"
        :color="stat.color"
        :to="stat.to"
        :loading="loading"
      />
    </div>

    <!-- Performance Overview - Full Width -->
    <div class="mb-8">
      <PerformanceChart :series-data="performanceSeries" :loading="loading" />
    </div>

    <!-- Fleet Intelligence -->
    <div class="mb-8">
      <FleetIntelligenceWidget :intelligence="fleetIntelligence" :loading="loading" />
    </div>

    <!-- Quick Actions -->
    <div class="mb-8">
      <h2 class="text-2xl font-semibold text-slate-900 mb-6">Quick Actions</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <QuickActionCard
          v-for="action in quickActions"
          :key="action.title"
          :title="action.title"
          :description="action.description"
          :icon="action.icon"
          :to="action.href"
        />
      </div>
    </div>

    <div class="mt-6">
      <LiveTripActivity :trips="activeTrips" />
    </div>
  </div>
</template>
