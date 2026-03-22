<script setup lang="ts">
import { Filter, X } from 'lucide-vue-next'
import type { Driver, User, Bus } from '~/types'

interface DriverWithRelations extends Driver {
  users: User
  buses: Bus | null
}

interface Props {
  drivers: DriverWithRelations[]
  loading?: boolean
}

interface Emits {
  (e: 'assign-bus', driver: DriverWithRelations): void
  (e: 'view-license', driver: DriverWithRelations): void
  (e: 'edit-driver', driver: DriverWithRelations): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const selectedDrivers = ref<Set<string>>(new Set())
const licenseFilter = ref('all')
const dutyFilter = ref('all')

const licenseFilterOptions = [
  { value: 'all', label: 'All Licenses' },
  { value: 'expired', label: 'Expired' },
  { value: 'expiring-soon', label: 'Expiring Soon (30 days)' },
  { value: 'valid', label: 'Valid' }
]

const dutyFilterOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'on-duty', label: 'On Duty' },
  { value: 'off-duty', label: 'Off Duty' }
]

const { getLicenseExpiryStatus } = useDriverStatus()

// Filter drivers based on selected filters
const filteredDrivers = computed(() => {
  let result = props.drivers

  // License filter
  if (licenseFilter.value !== 'all') {
    result = result.filter(driver => {
      const status = getLicenseExpiryStatus(driver.license_expiry_date)
      
      switch (licenseFilter.value) {
        case 'expired':
          return status.status === 'expired' || status.status === 'expires-today'
        case 'expiring-soon':
          return status.status === 'warning' || status.status === 'critical'
        case 'valid':
          return status.status === 'valid'
        default:
          return true
      }
    })
  }

  // Duty filter
  if (dutyFilter.value !== 'all') {
    result = result.filter(driver => {
      if (dutyFilter.value === 'on-duty') return driver.is_on_duty
      if (dutyFilter.value === 'off-duty') return !driver.is_on_duty
      return true
    })
  }

  return result
})

const allSelected = computed({
  get: () => filteredDrivers.value.length > 0 && selectedDrivers.value.size === filteredDrivers.value.length,
  set: (value: boolean) => {
    if (value) {
      selectedDrivers.value = new Set(filteredDrivers.value.map(d => d.id))
    } else {
      selectedDrivers.value.clear()
    }
  }
})

const someSelected = computed(() => 
  selectedDrivers.value.size > 0 && selectedDrivers.value.size < filteredDrivers.value.length
)

const toggleDriverSelect = (driverId: string) => {
  if (selectedDrivers.value.has(driverId)) {
    selectedDrivers.value.delete(driverId)
  } else {
    selectedDrivers.value.add(driverId)
  }
}

const hasActiveFilters = computed(() => 
  licenseFilter.value !== 'all' || dutyFilter.value !== 'all'
)

const clearFilters = () => {
  licenseFilter.value = 'all'
  dutyFilter.value = 'all'
}

// Count urgent drivers (expired or expiring soon)
const urgentDriversCount = computed(() => {
  return props.drivers.filter(driver => {
    const status = getLicenseExpiryStatus(driver.license_expiry_date)
    return status.urgent
  }).length
})
</script>

<template>
  <div class="space-y-4">
    <!-- Filter Bar -->
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex items-center gap-2 text-sm font-medium text-slate-700">
        <Filter class="h-4 w-4" />
        <span>Filters:</span>
      </div>

      <!-- License Status Filter -->
      <select
        v-model="licenseFilter"
        class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option v-for="option in licenseFilterOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- Duty Status Filter -->
      <select
        v-model="dutyFilter"
        class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option v-for="option in dutyFilterOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- Clear Filters -->
      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        <X class="h-3.5 w-3.5" />
        Clear
      </button>

      <!-- Urgent Drivers Alert -->
      <div v-if="urgentDriversCount > 0" class="ml-auto flex items-center gap-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-red-600/20">
        <span class="relative flex h-2 w-2">
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
        </span>
        {{ urgentDriversCount }} license{{ urgentDriversCount !== 1 ? 's' : '' }} need attention
      </div>
    </div>

    <!-- Results Summary -->
    <div v-if="hasActiveFilters" class="text-sm text-slate-600">
      Showing <span class="font-semibold">{{ filteredDrivers.length }}</span> of <span class="font-semibold">{{ drivers.length }}</span> drivers
    </div>

    <!-- Table Container -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="max-h-[calc(100vh-320px)] overflow-auto">
        <table class="w-full border-collapse">
          <!-- Sticky Header -->
          <thead class="sticky top-0 z-10 bg-slate-50 backdrop-blur-sm">
            <tr class="border-b border-slate-200">
              <th class="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  :checked="allSelected"
                  :indeterminate="someSelected"
                  @change="allSelected = !allSelected"
                  class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Driver
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                License #
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Expiry Date
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Bus Assignment
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Status
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">
                Actions
              </th>
            </tr>
          </thead>

          <!-- Table Body -->
          <tbody class="divide-y divide-slate-200 bg-white">
            <!-- Loading State -->
            <tr v-if="loading">
              <td colspan="7" class="px-4 py-12 text-center">
                <div class="flex flex-col items-center gap-3">
                  <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
                  <p class="text-sm text-slate-500">Loading drivers...</p>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="filteredDrivers.length === 0">
              <td colspan="7" class="px-4 py-12 text-center">
                <div class="flex flex-col items-center gap-3">
                  <svg class="h-16 w-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <div>
                    <p class="text-sm font-semibold text-slate-700">
                      {{ hasActiveFilters ? 'No drivers match your filters' : 'No drivers found' }}
                    </p>
                    <p class="mt-1 text-xs text-slate-500">
                      {{ hasActiveFilters ? 'Try adjusting your filter criteria' : 'Get started by creating your first driver' }}
                    </p>
                  </div>
                  <button
                    v-if="hasActiveFilters"
                    @click="clearFilters"
                    class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <X class="h-4 w-4" />
                    Clear filters
                  </button>
                </div>
              </td>
            </tr>

            <!-- Driver Rows -->
            <DriverRow
              v-for="driver in filteredDrivers"
              :key="driver.id"
              :driver="driver"
              :selected="selectedDrivers.has(driver.id)"
              @toggle-select="toggleDriverSelect"
              @assign-bus="(driver) => emit('assign-bus', driver)"
              @view-license="(driver) => emit('view-license', driver)"
              @edit-driver="(driver) => emit('edit-driver', driver)"
            />
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Ensure checkbox indeterminate state works */
input[type="checkbox"]:indeterminate {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3e%3cpath stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3e%3c/svg%3e");
  background-color: currentColor;
  border-color: transparent;
}

/* Custom scrollbar */
.overflow-auto::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>
