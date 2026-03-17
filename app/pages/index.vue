<script setup lang="ts">
import {
  Users,
  Bus,
  CreditCard,
  Receipt,
  TrendingUp,
  UserCheck,
  MapPin,
  Plus,
  UserPlus,
  BusFront,
  CreditCardIcon,
  Map
} from 'lucide-vue-next'
import { formatCurrency } from '~/lib/utils'
import type { DashboardStats } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

const stats = ref<DashboardStats>({
  totalUsers: 0,
  totalDrivers: 0,
  totalBuses: 0,
  totalCards: 0,
  totalTransactions: 0,
  totalRevenue: 0,
  activeTrips: 0
})

const loading = ref(true)

const fetchStats = async () => {
  loading.value = true
  try {
    const [
      usersRes,
      driversRes,
      busesRes,
      cardsRes,
      transactionsRes,
      revenueRes,
      activeTripsRes
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('drivers').select('id', { count: 'exact', head: true }),
      supabase.from('buses').select('id', { count: 'exact', head: true }),
      supabase.from('nfc_cards').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('id', { count: 'exact', head: true }),
      supabase.from('transactions').select('amount').eq('transaction_type', 'tap_out'),
      supabase.from('trips').select('id', { count: 'exact', head: true }).eq('status', 'ongoing')
    ])

    stats.value = {
      totalUsers: usersRes.count || 0,
      totalDrivers: driversRes.count || 0,
      totalBuses: busesRes.count || 0,
      totalCards: cardsRes.count || 0,
      totalTransactions: transactionsRes.count || 0,
      totalRevenue: revenueRes.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0,
      activeTrips: activeTripsRes.count || 0
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchStats)

const statCards = computed(() => [
  {
    title: 'Total Users',
    value: stats.value.totalUsers,
    icon: Users,
    color: 'bg-blue-500',
    href: '/users'
  },
  {
    title: 'Active Drivers',
    value: stats.value.totalDrivers,
    icon: UserCheck,
    color: 'bg-green-500',
    href: '/drivers'
  },
  {
    title: 'Total Buses',
    value: stats.value.totalBuses,
    icon: Bus,
    color: 'bg-purple-500',
    href: '/buses'
  },
  {
    title: 'NFC Cards',
    value: stats.value.totalCards,
    icon: CreditCard,
    color: 'bg-orange-500',
    href: '/cards'
  },
  {
    title: 'Transactions',
    value: stats.value.totalTransactions,
    icon: Receipt,
    color: 'bg-pink-500',
    href: '/transactions'
  },
  {
    title: 'Total Revenue',
    value: formatCurrency(stats.value.totalRevenue),
    icon: TrendingUp,
    color: 'bg-emerald-500',
    href: '/transactions'
  },
  {
    title: 'Active Trips',
    value: stats.value.activeTrips,
    icon: MapPin,
    color: 'bg-red-500',
    href: '/live-map'
  }
])

const quickActions = [
  { title: 'Add Driver', href: '/drivers?action=add', icon: UserPlus },
  { title: 'Add Bus', href: '/buses?action=add', icon: BusFront },
  { title: 'Create NFC Card', href: '/cards?action=add', icon: CreditCard },
  { title: 'View Live Map', href: '/live-map', icon: Map }
]
</script>

<template>
  <div>
    <!-- Enhanced Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
      <p class="text-gray-600">Welcome to Tapsakay Admin Dashboard</p>
    </div>

    <!-- Enhanced Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
      <NuxtLink
        v-for="stat in statCards"
        :key="stat.title"
        :to="stat.href"
        class="block group"
      >
        <div class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-200">
          <div class="flex items-start justify-between mb-4">
            <div :class="[stat.color, 'p-3 rounded-lg']">
              <component :is="stat.icon" class="h-6 w-6 text-white" />
            </div>
          </div>
          <p class="text-sm font-medium text-gray-600 mb-1">{{ stat.title }}</p>
          <p class="text-3xl font-bold text-gray-900">
            {{ loading ? '...' : stat.value }}
          </p>
        </div>
      </NuxtLink>
    </div>

    <!-- Enhanced Quick Actions -->
    <div>
      <h2 class="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
        <NuxtLink
          v-for="action in quickActions"
          :key="action.title"
          :to="action.href"
          class="group"
        >
          <div class="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-200">
            <div class="flex flex-col items-center text-center gap-4">
              <div class="p-4 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                <component :is="action.icon" class="h-6 w-6 text-blue-600" />
              </div>
              <span class="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">{{ action.title }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
