<script setup lang="ts">
import { Search, Plus, UserPlus, Bus as BusIcon, Calendar, AlertTriangle, Eye, Edit } from 'lucide-vue-next'
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
const showEditDialog = ref(false)
const selectedDriver = ref<DriverWithRelations | null>(null)
const selectedLicenseImage = ref<string | null>(null)

const editForm = ref({
  full_name: '',
  email: '',
  phone_number: '',
  license_number: '',
  license_expiry: ''
})

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

const openEditDialog = (driver: DriverWithRelations) => {
  selectedDriver.value = driver
  editForm.value = {
    full_name: driver.users?.full_name || driver.full_name || '',
    email: driver.users?.email || '',
    phone_number: driver.users?.phone_number || '',
    license_number: driver.driver_license_number || '',
    license_expiry: driver.license_expiry_date || ''
  }
  showEditDialog.value = true
}

const updateDriver = async () => {
  if (!selectedDriver.value) return
  
  actionLoading.value = true
  try {
    // Update user info
    const { error: userError } = await supabase
      .from('users')
      .update({
        full_name: editForm.value.full_name.trim(),
        email: editForm.value.email.toLowerCase().trim(),
        phone_number: editForm.value.phone_number.trim() || null
      })
      .eq('id', selectedDriver.value.id)
    
    if (userError) throw userError
    
    // Update driver info
    const { error: driverError } = await supabase
      .from('drivers')
      .update({
        full_name: editForm.value.full_name.trim(),
        driver_license_number: editForm.value.license_number.trim(),
        license_expiry_date: editForm.value.license_expiry
      })
      .eq('id', selectedDriver.value.id)
    
    if (driverError) throw driverError
    
    showEditDialog.value = false
    await fetchDrivers()
  } catch (error) {
    console.error('Error updating driver:', error)
  } finally {
    actionLoading.value = false
  }
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
    <!-- Header with Improved Action Hierarchy -->
    <div class="mb-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Drivers</h1>
          <p class="mt-1.5 text-sm text-slate-600">Manage driver accounts, licenses, and bus assignments</p>
        </div>
        
        <div class="flex flex-wrap items-center gap-3">
          <!-- Secondary Action -->
          <UiButton 
            variant="outline" 
            @click="openConvertDialog"
            class="border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            <UserPlus class="h-4 w-4 mr-2" />
            Convert Passenger
          </UiButton>
          
          <!-- Primary Action -->
          <UiButton 
            @click="$router.push('/drivers/create')"
            class="bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            <Plus class="h-4 w-4 mr-2" />
            Create New Driver
          </UiButton>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <UiInput
        v-model="searchQuery"
        placeholder="Search by name, email, or license number..."
        class="pl-10 max-w-md"
      />
    </div>

    <!-- Drivers Table with Filters -->
    <DriverTable
      :drivers="filteredDrivers"
      :loading="loading"
      @assign-bus="openAssignBusDialog"
      @view-license="openLicenseImageDialog"
      @edit-driver="openEditDialog"
    />

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

    <!-- Edit Driver Dialog -->
    <UiDialog :open="showEditDialog" title="Edit Driver Information" @close="showEditDialog = false">
      <div class="space-y-4">
        <div v-if="selectedDriver">
          <p class="text-sm text-gray-500 mb-4">
            Editing driver: <strong>{{ selectedDriver.users?.full_name || selectedDriver.full_name }}</strong>
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
          <UiInput
            v-model="editForm.full_name"
            placeholder="Enter full name"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <UiInput
            v-model="editForm.email"
            type="email"
            placeholder="Enter email"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
          <UiInput
            v-model="editForm.phone_number"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">License Number</label>
          <UiInput
            v-model="editForm.license_number"
            placeholder="Enter license number"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">License Expiry Date</label>
          <UiInput
            v-model="editForm.license_expiry"
            type="date"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton variant="outline" @click="showEditDialog = false">Cancel</UiButton>
          <UiButton
            :disabled="!editForm.full_name || !editForm.email || !editForm.license_number || !editForm.license_expiry || actionLoading"
            @click="updateDriver"
          >
            {{ actionLoading ? 'Saving...' : 'Save Changes' }}
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
