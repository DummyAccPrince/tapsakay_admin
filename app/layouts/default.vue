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
  Route
} from 'lucide-vue-next'

const { user, logout } = useAuth()
const route = useRoute()
const sidebarOpen = ref(false)

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Drivers', href: '/drivers', icon: UserCog },
  { name: 'Buses', href: '/buses', icon: Bus },
  { name: 'NFC Cards', href: '/cards', icon: CreditCard },
  { name: 'Trips', href: '/trips', icon: Route },
  { name: 'Transactions', href: '/transactions', icon: Receipt },
  { name: 'Live Map', href: '/live-map', icon: MapPin }
]

const isActive = (href: string) => {
  if (href === '/') return route.path === '/'
  return route.path.startsWith(href)
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
        'fixed inset-y-0 left-0 z-30 w-64 transform bg-white border-r border-gray-200 transition-transform duration-200 lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <div class="flex h-16 items-center gap-3 border-b border-gray-200 px-6">
        <Bus class="h-7 w-7 text-blue-600" />
        <span class="text-xl font-bold text-gray-900" style="font-family: 'Cinzel', serif; letter-spacing: 0.5px;">TAPSAKAY</span>
      </div>

      <nav class="mt-6 px-3">
        <NuxtLink
          v-for="item in navigation"
          :key="item.name"
          :to="item.href"
          :class="[
            'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all mb-1 rounded-lg',
            isActive(item.href)
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          ]"
          @click="sidebarOpen = false"
        >
          <component :is="item.icon" class="h-5 w-5" />
          {{ item.name }}
        </NuxtLink>
      </nav>

      <div class="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4">
        <div class="mb-3 px-4">
          <p class="text-sm font-semibold text-gray-900">{{ user?.full_name }}</p>
          <p class="text-xs text-gray-500">{{ user?.email }}</p>
        </div>
        <button
          @click="logout"
          class="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut class="h-5 w-5" />
          Logout
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="lg:pl-64 pt-14 lg:pt-0">
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
