<script setup lang="ts">
import {
  LayoutDashboard,
  Users,
  UserCog,
  Bus,
  CreditCard,
  Receipt,
  MapPin,
  LogOut,
  Menu,
  X,
  Route,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'

const { user, logout } = useAuth()
const route = useRoute()
const sidebarOpen = ref(false)
const sidebarCollapsed = useState('sidebarCollapsed', () => false)

// Fetch active trips count for badge
const { stats } = useDashboardStats()
const activeTripsCount = computed(() => stats.value.activeTrips || 0)

const navigation = [
  { 
    name: 'Dashboard', 
    href: '/', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Users', 
    href: '/users', 
    icon: Users,
    subItems: [
      { name: 'All Users', href: '/users' },
      { name: 'Drivers', href: '/drivers' }
    ]
  },
  { 
    name: 'Buses', 
    href: '/buses', 
    icon: Bus 
  },
  { 
    name: 'NFC Cards', 
    href: '/cards', 
    icon: CreditCard,
    subItems: [
      { name: 'All Cards', href: '/cards' },
      { name: 'Top-up Center', href: '/top-up' }
    ]
  },
  { 
    name: 'Trips', 
    href: '/trips', 
    icon: Route,
    badge: { type: 'count' as const, value: activeTripsCount.value }
  },
  { 
    name: 'Transactions', 
    href: '/transactions', 
    icon: Receipt 
  },
  { 
    name: 'Live Map', 
    href: '/live-map', 
    icon: MapPin,
    badge: { type: 'live' as const }
  }
]

const isActive = (href: string) => {
  if (href === '/') return route.path === '/'
  return route.path.startsWith(href)
}

const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <!-- Mobile sidebar toggle -->
    <div class="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-white px-4 py-3 shadow">
      <div class="flex items-center gap-2">
        <Bus class="h-8 w-8 text-primary" />
        <span class="text-xl font-bold text-primary" style="font-family: 'Cinzel', serif;">Tapsakay</span>
      </div>
      <button @click="sidebarOpen = !sidebarOpen" class="p-2">
        <Menu v-if="!sidebarOpen" class="h-6 w-6" />
        <X v-else class="h-6 w-6" />
      </button>
    </div>

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-30 transform border-r border-slate-200 bg-white shadow-[4px_0_24px_-8px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        sidebarCollapsed ? 'w-[72px]' : 'w-64'
      ]"
    >
      <!-- Header -->
      <div 
        :class="[
          'flex h-16 items-center border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 transition-all duration-300',
          sidebarCollapsed ? 'justify-center gap-0' : 'justify-between gap-3'
        ]"
      >
        <div :class="['flex items-center gap-3', sidebarCollapsed && 'justify-center']">
          <Bus :class="['shrink-0 text-emerald-600 transition-all', sidebarCollapsed ? 'h-7 w-7' : 'h-6 w-6']" />
          <span 
            v-if="!sidebarCollapsed" 
            class="text-lg font-bold tracking-wide text-slate-900 transition-opacity"
            style="font-family: 'Inter', sans-serif; letter-spacing: 0.5px;"
          >
            TAPSAKAY
          </span>
        </div>

        <!-- Desktop Toggle Button -->
        <button
          v-if="!sidebarCollapsed"
          @click="toggleSidebar"
          class="hidden rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 lg:block"
          title="Collapse sidebar"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
      </div>

      <!-- Expand Button (when collapsed) -->
      <button
        v-if="sidebarCollapsed"
        @click="toggleSidebar"
        class="absolute -right-3 top-20 hidden rounded-full border border-slate-200 bg-white p-1 text-slate-400 shadow-md transition-all hover:bg-emerald-50 hover:text-emerald-600 lg:block"
        title="Expand sidebar"
      >
        <ChevronRight class="h-3.5 w-3.5" />
      </button>

      <!-- Navigation -->
      <nav 
        :class="[
          'mt-4 space-y-1 overflow-y-auto px-3 pb-32',
          sidebarCollapsed ? 'scrollbar-hide' : ''
        ]"
        style="max-height: calc(100vh - 200px);"
      >
        <SidebarItem
          v-for="item in navigation"
          :key="item.name"
          :name="item.name"
          :href="item.href"
          :icon="item.icon"
          :is-active="isActive(item.href)"
          :is-collapsed="sidebarCollapsed"
          :badge="item.badge"
          :sub-items="item.subItems"
          @click="sidebarOpen = false"
        />
      </nav>

      <!-- User Profile & Logout -->
      <div 
        :class="[
          'absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-gradient-to-t from-slate-50/80 to-white/80 p-3 backdrop-blur-sm transition-all duration-300',
          sidebarCollapsed && 'px-2'
        ]"
      >
        <!-- User Info -->
        <div 
          v-if="!sidebarCollapsed"
          class="mb-2 rounded-lg bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200"
        >
          <p class="truncate text-sm font-semibold text-slate-900">{{ user?.full_name }}</p>
          <p class="truncate text-xs text-slate-500">{{ user?.email }}</p>
        </div>

        <!-- Logout Button -->
        <button
          @click="logout"
          :class="[
            'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-red-50 hover:text-red-600 hover:shadow-sm',
            sidebarCollapsed && 'justify-center px-2'
          ]"
          :title="sidebarCollapsed ? 'Logout' : ''"
        >
          <LogOut class="h-5 w-5 shrink-0" />
          <span v-if="!sidebarCollapsed">Logout</span>

          <!-- Tooltip for collapsed state -->
          <div
            v-if="sidebarCollapsed"
            class="pointer-events-none absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 lg:block"
          >
            Logout
            <div class="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-900"></div>
          </div>
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main 
      :class="[
        'pt-14 transition-all duration-300 lg:pt-0',
        sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
      ]"
    >
      <div class="p-8 max-w-[1600px]">
        <slot />
      </div>
    </main>

    <!-- Mobile overlay -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-20 bg-black/50 lg:hidden"
      @click="sidebarOpen = false"
    />
  </div>
</template>
