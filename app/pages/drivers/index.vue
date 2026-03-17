<script setup lang="ts">
import { Search, Plus, UserPlus, Bus as BusIcon, Calendar, AlertTriangle, Eye } from 'lucide-vue-next'
import { formatDateOnly } from '~/lib/utils'
import type { Driver, User, Bus } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const route = useRoute()

interface DriverWithRelations extends Driver {
  users: User
  buses: Bus | null
}

const drivers = ref<DriverWithRelations[]>([])
const buses = ref<Bus[]>([])
const passengers = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref('')

const showAddDialog = ref(false)
const showConvertDialog = ref(false)
const showAssignBusDialog = ref(false)
const showLicenseImageDialog = ref(false)
const selectedDriver = ref<DriverWithRelations | null>(null)
const selectedLicenseImage = ref<string | null>(null)

const newDriver = ref({
  passenger_id: '',
  license_number: '',
  license_expiry: ''
})

const selectedBusId = ref('')
const actionLoading = ref(false)

const fetchDrivers = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('drivers')
      .select(`
        *,
        users!drivers_id_fkey(*),
        buses:assigned_bus_id(*)
      `)
      .order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    drivers.value = (data || []) as DriverWithRelations[]
  } catch (error) {
    console.error('Error fetching drivers:', error)
  } finally {
    loading.value = false
  }
}

const fetchBuses = async () => {
  const { data } = await supabase
    .from('buses')
    .select('*')
    .eq('is_available', true)

  buses.value = data || []
}

const fetchPassengers = async () => {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'passenger')
    .eq('is_active', true)

  passengers.value = data || []
}

const openConvertDialog = () => {
  fetchPassengers()
  newDriver.value = { passenger_id: '', license_number: '', license_expiry: '' }
  showConvertDialog.value = true
}

const convertToDriver = async () => {
  if (!newDriver.value.passenger_id || !newDriver.value.license_number || !newDriver.value.license_expiry) return

  actionLoading.value = true
  try {
    const passenger = passengers.value.find(p => p.id === newDriver.value.passenger_id)
    if (!passenger) return

    const { error: userError } = await supabase
      .from('users')
      .update({ role: 'driver' })
      .eq('id', newDriver.value.passenger_id)

    if (userError) throw userError

    const { error: driverError } = await supabase
      .from('drivers')
      .insert({
        id: newDriver.value.passenger_id,
        driver_license_number: newDriver.value.license_number,
        license_expiry_date: newDriver.value.license_expiry,
        full_name: passenger.full_name
      })

    if (driverError) throw driverError

    showConvertDialog.value = false
    await fetchDrivers()
  } catch (error) {
    console.error('Error converting to driver:', error)
  } finally {
    actionLoading.value = false
  }
}

const openAssignBusDialog = (driver: DriverWithRelations) => {
  selectedDriver.value = driver
  selectedBusId.value = driver.assigned_bus_id || ''
  fetchBuses()
  showAssignBusDialog.value = true
}

const openLicenseImageDialog = (driver: DriverWithRelations) => {
  selectedDriver.value = driver
  selectedLicenseImage.value = driver.license_image_url || null
  showLicenseImageDialog.value = true
}

const assignBus = async () => {
  if (!selectedDriver.value) return

  actionLoading.value = true
  try {
    const { error } = await supabase
      .from('drivers')
      .update({ assigned_bus_id: selectedBusId.value || null })
      .eq('id', selectedDriver.value.id)

    if (error) throw error

    showAssignBusDialog.value = false
    await fetchDrivers()
  } catch (error) {
    console.error('Error assigning bus:', error)
  } finally {
    actionLoading.value = false
  }
}

const isLicenseExpiringSoon = (date: string) => {
  const expiry = new Date(date)
  const today = new Date()
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diffDays <= 30 && diffDays > 0
}

const isLicenseExpired = (date: string) => {
  return new Date(date) < new Date()
}

const filteredDrivers = computed(() => {
  if (!searchQuery.value) return drivers.value
  const query = searchQuery.value.toLowerCase()
  return drivers.value.filter(d =>
    d.users?.full_name?.toLowerCase().includes(query) ||
    d.driver_license_number?.toLowerCase().includes(query) ||
    d.full_name?.toLowerCase().includes(query)
  )
})

onMounted(() => {
  fetchDrivers()
  if (route.query.action === 'add') {
    openConvertDialog()
  }
})
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Drivers</h1>
        <p class="text-gray-500 mt-1">Manage driver accounts and assignments</p>
      </div>
      <div class="flex gap-2">
        <UiButton @click="$router.push('/drivers/create')">
          <Plus class="h-4 w-4 mr-2" />
          Create New Driver
        </UiButton>
        <UiButton variant="outline" @click="openConvertDialog">
          <UserPlus class="h-4 w-4 mr-2" />
          Convert Passenger
        </UiButton>
      </div>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <UiInput
        v-model="searchQuery"
        placeholder="Search drivers..."
        class="pl-10 max-w-md"
      />
    </div>

    <!-- Drivers Table -->
    <UiCard>
      <UiTable>
        <thead>
          <tr class="border-b">
            <th class="text-left p-4 font-medium text-gray-500">Driver</th>
            <th class="text-left p-4 font-medium text-gray-500">License</th>
            <th class="text-left p-4 font-medium text-gray-500">License Expiry</th>
            <th class="text-left p-4 font-medium text-gray-500">Assigned Bus</th>
            <th class="text-left p-4 font-medium text-gray-500">Status</th>
            <th class="text-right p-4 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="p-8 text-center text-gray-500">Loading...</td>
          </tr>
          <tr v-else-if="filteredDrivers.length === 0">
            <td colspan="6" class="p-8 text-center text-gray-500">No drivers found</td>
          </tr>
          <tr v-for="driver in filteredDrivers" :key="driver.id" class="border-b last:border-0 hover:bg-gray-50">
            <td class="p-4">
              <div class="font-medium text-gray-900">{{ driver.users?.full_name || driver.full_name }}</div>
              <div class="text-sm text-gray-500">{{ driver.users?.email }}</div>
            </td>
            <td class="p-4 text-gray-600 font-mono">{{ driver.driver_license_number }}</td>
            <td class="p-4">
              <div class="flex items-center gap-2">
                <span :class="[
                  isLicenseExpired(driver.license_expiry_date) ? 'text-red-600' :
                  isLicenseExpiringSoon(driver.license_expiry_date) ? 'text-yellow-600' : 'text-gray-600'
                ]">
                  {{ formatDateOnly(driver.license_expiry_date) }}
                </span>
                <AlertTriangle
                  v-if="isLicenseExpired(driver.license_expiry_date) || isLicenseExpiringSoon(driver.license_expiry_date)"
                  :class="[
                    'h-4 w-4',
                    isLicenseExpired(driver.license_expiry_date) ? 'text-red-500' : 'text-yellow-500'
                  ]"
                />
              </div>
            </td>
            <td class="p-4">
              <span v-if="driver.buses" class="text-gray-900">
                {{ driver.buses.bus_number }} - {{ driver.buses.plate_number }}
              </span>
              <span v-else class="text-gray-400">Not assigned</span>
            </td>
            <td class="p-4">
              <UiBadge :variant="driver.is_on_duty ? 'success' : 'secondary'">
                {{ driver.is_on_duty ? 'On Duty' : 'Off Duty' }}
              </UiBadge>
            </td>
            <td class="p-4">
              <div class="flex items-center justify-end gap-2">
                <UiButton
                  v-if="driver.license_image_url"
                  variant="ghost"
                  size="sm"
                  @click="openLicenseImageDialog(driver)"
                  title="View License Image"
                >
                  <Eye class="h-4 w-4" />
                </UiButton>
                <UiButton variant="outline" size="sm" @click="openAssignBusDialog(driver)">
                  <BusIcon class="h-4 w-4 mr-1" />
                  {{ driver.buses ? 'Change Bus' : 'Assign Bus' }}
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>

    <!-- Convert Passenger Dialog -->
    <UiDialog :open="showConvertDialog" title="Convert Passenger to Driver" @close="showConvertDialog = false">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Select Passenger</label>
          <UiSelect
            v-model="newDriver.passenger_id"
            :options="passengers.map(p => ({ value: p.id, label: `${p.full_name} (${p.email})` }))"
            placeholder="Select a passenger"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">License Number</label>
          <UiInput
            v-model="newDriver.license_number"
            placeholder="Enter license number"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">License Expiry Date</label>
          <UiInput
            v-model="newDriver.license_expiry"
            type="date"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton variant="outline" @click="showConvertDialog = false">Cancel</UiButton>
          <UiButton
            :disabled="!newDriver.passenger_id || !newDriver.license_number || !newDriver.license_expiry || actionLoading"
            @click="convertToDriver"
          >
            {{ actionLoading ? 'Converting...' : 'Convert to Driver' }}
          </UiButton>
        </div>
      </div>
    </UiDialog>

    <!-- Assign Bus Dialog -->
    <UiDialog :open="showAssignBusDialog" title="Assign Bus" @close="showAssignBusDialog = false">
      <div class="space-y-4">
        <div v-if="selectedDriver">
          <p class="text-sm text-gray-500 mb-4">
            Assign bus to <strong>{{ selectedDriver.users?.full_name || selectedDriver.full_name }}</strong>
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Select Bus</label>
          <UiSelect
            v-model="selectedBusId"
            :options="[
              { value: '', label: 'No bus assigned' },
              ...buses.map(b => ({ value: b.id, label: `${b.bus_number} - ${b.plate_number} (${b.route_name})` }))
            ]"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton variant="outline" @click="showAssignBusDialog = false">Cancel</UiButton>
          <UiButton :disabled="actionLoading" @click="assignBus">
            {{ actionLoading ? 'Saving...' : 'Save Assignment' }}
          </UiButton>
        </div>
      </div>
    </UiDialog>

    <!-- License Image Dialog -->
    <UiDialog :open="showLicenseImageDialog" title="Driver's License" @close="showLicenseImageDialog = false" class="max-w-2xl">
      <div class="space-y-4">
        <div v-if="selectedDriver">
          <p class="text-sm text-gray-500 mb-4">
            License for <strong>{{ selectedDriver.users?.full_name || selectedDriver.full_name }}</strong>
          </p>
          <p class="text-sm text-gray-600 mb-2">
            License #: <span class="font-mono">{{ selectedDriver.driver_license_number }}</span>
          </p>
        </div>

        <div v-if="selectedLicenseImage" class="flex justify-center">
          <img
            :src="selectedLicenseImage"
            alt="Driver's License"
            class="max-w-full max-h-96 object-contain rounded-lg border"
          />
        </div>
        <div v-else class="text-center py-8 text-gray-500">
          No license image available
        </div>

        <div class="flex justify-end pt-4">
          <UiButton variant="outline" @click="showLicenseImageDialog = false">Close</UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
