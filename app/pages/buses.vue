<script setup lang="ts">
import { Search, Plus, Edit, Trash2 } from 'lucide-vue-next'
import type { Bus } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const route = useRoute()

const buses = ref<Bus[]>([])
const loading = ref(true)
const searchQuery = ref('')

const showAddDialog = ref(false)
const showEditDialog = ref(false)
const selectedBus = ref<Bus | null>(null)
const actionLoading = ref(false)

const newBus = ref({
  bus_number: '',
  plate_number: '',
  capacity: 40,
  route_name: '',
  route_description: '',
  status: 'inactive'
})

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' }
]

const fetchBuses = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('buses')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    buses.value = data || []
  } catch (error) {
    console.error('Error fetching buses:', error)
  } finally {
    loading.value = false
  }
}

const openAddDialog = () => {
  newBus.value = {
    bus_number: '',
    plate_number: '',
    capacity: 40,
    route_name: '',
    route_description: '',
    status: 'inactive'
  }
  showAddDialog.value = true
}

const createBus = async () => {
  actionLoading.value = true
  try {
    const { error } = await supabase
      .from('buses')
      .insert({
        bus_number: newBus.value.bus_number,
        plate_number: newBus.value.plate_number,
        capacity: newBus.value.capacity,
        route_name: newBus.value.route_name,
        route_description: newBus.value.route_description || null,
        status: newBus.value.status
      })

    if (error) throw error

    showAddDialog.value = false
    await fetchBuses()
  } catch (error) {
    console.error('Error creating bus:', error)
  } finally {
    actionLoading.value = false
  }
}

const openEditDialog = (bus: Bus) => {
  selectedBus.value = bus
  newBus.value = {
    bus_number: bus.bus_number,
    plate_number: bus.plate_number,
    capacity: bus.capacity,
    route_name: bus.route_name,
    route_description: bus.route_description || '',
    status: bus.status
  }
  showEditDialog.value = true
}

const updateBus = async () => {
  if (!selectedBus.value) return

  actionLoading.value = true
  try {
    const { error } = await supabase
      .from('buses')
      .update({
        bus_number: newBus.value.bus_number,
        plate_number: newBus.value.plate_number,
        capacity: newBus.value.capacity,
        route_name: newBus.value.route_name,
        route_description: newBus.value.route_description || null,
        status: newBus.value.status
      })
      .eq('id', selectedBus.value.id)

    if (error) throw error

    showEditDialog.value = false
    await fetchBuses()
  } catch (error) {
    console.error('Error updating bus:', error)
  } finally {
    actionLoading.value = false
  }
}

const deleteBus = async (bus: Bus) => {
  if (!confirm(`Are you sure you want to delete bus ${bus.bus_number}?`)) return

  try {
    const { error } = await supabase
      .from('buses')
      .delete()
      .eq('id', bus.id)

    if (error) throw error
    await fetchBuses()
  } catch (error) {
    console.error('Error deleting bus:', error)
  }
}

const filteredBuses = computed(() => {
  if (!searchQuery.value) return buses.value
  const query = searchQuery.value.toLowerCase()
  return buses.value.filter(b =>
    b.bus_number.toLowerCase().includes(query) ||
    b.plate_number.toLowerCase().includes(query) ||
    b.route_name.toLowerCase().includes(query)
  )
})

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'success'
    case 'inactive': return 'secondary'
    case 'maintenance': return 'warning'
    default: return 'secondary'
  }
}

onMounted(() => {
  fetchBuses()
  if (route.query.action === 'add') {
    openAddDialog()
  }
})
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Buses</h1>
        <p class="text-gray-500 mt-1">Manage bus fleet</p>
      </div>
      <UiButton @click="openAddDialog">
        <Plus class="h-4 w-4 mr-2" />
        Add Bus
      </UiButton>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <UiInput
        v-model="searchQuery"
        placeholder="Search buses..."
        class="pl-10 max-w-md"
      />
    </div>

    <!-- Buses Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-if="loading" class="col-span-full text-center py-8 text-gray-500">
        Loading...
      </div>
      <div v-else-if="filteredBuses.length === 0" class="col-span-full text-center py-8 text-gray-500">
        No buses found
      </div>
      <UiCard v-for="bus in filteredBuses" :key="bus.id" class="p-5">
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-gray-900 text-lg">{{ bus.bus_number }}</h3>
            <p class="text-sm text-gray-500">{{ bus.plate_number }}</p>
          </div>
          <UiBadge :variant="getStatusColor(bus.status)">
            {{ bus.status }}
          </UiBadge>
        </div>

        <div class="space-y-2 mb-4">
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Route:</span>
            <span class="text-gray-900 font-medium">{{ bus.route_name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-500">Capacity:</span>
            <span class="text-gray-900">{{ bus.capacity }} passengers</span>
          </div>
          <div v-if="bus.route_description" class="text-sm text-gray-500">
            {{ bus.route_description }}
          </div>
        </div>

        <div class="flex gap-2">
          <UiButton variant="outline" size="sm" class="flex-1" @click="openEditDialog(bus)">
            <Edit class="h-4 w-4 mr-1" />
            Edit
          </UiButton>
          <UiButton variant="destructive" size="sm" @click="deleteBus(bus)">
            <Trash2 class="h-4 w-4" />
          </UiButton>
        </div>
      </UiCard>
    </div>

    <!-- Add Bus Dialog -->
    <UiDialog :open="showAddDialog" title="Add New Bus" @close="showAddDialog = false">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Bus Number</label>
            <UiInput v-model="newBus.bus_number" placeholder="e.g., BUS-001" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Plate Number</label>
            <UiInput v-model="newBus.plate_number" placeholder="e.g., ABC 1234" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Capacity</label>
            <UiInput v-model="newBus.capacity" type="number" min="1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <UiSelect v-model="newBus.status" :options="statusOptions" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Route Name</label>
          <UiInput v-model="newBus.route_name" placeholder="e.g., Manila - Quezon City" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Route Description (Optional)</label>
          <UiInput v-model="newBus.route_description" placeholder="Additional route details" />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton variant="outline" @click="showAddDialog = false">Cancel</UiButton>
          <UiButton
            :disabled="!newBus.bus_number || !newBus.plate_number || !newBus.route_name || actionLoading"
            @click="createBus"
          >
            {{ actionLoading ? 'Creating...' : 'Create Bus' }}
          </UiButton>
        </div>
      </div>
    </UiDialog>

    <!-- Edit Bus Dialog -->
    <UiDialog :open="showEditDialog" title="Edit Bus" @close="showEditDialog = false">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Bus Number</label>
            <UiInput v-model="newBus.bus_number" placeholder="e.g., BUS-001" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Plate Number</label>
            <UiInput v-model="newBus.plate_number" placeholder="e.g., ABC 1234" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Capacity</label>
            <UiInput v-model="newBus.capacity" type="number" min="1" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <UiSelect v-model="newBus.status" :options="statusOptions" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Route Name</label>
          <UiInput v-model="newBus.route_name" placeholder="e.g., Manila - Quezon City" />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Route Description (Optional)</label>
          <UiInput v-model="newBus.route_description" placeholder="Additional route details" />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton variant="outline" @click="showEditDialog = false">Cancel</UiButton>
          <UiButton
            :disabled="!newBus.bus_number || !newBus.plate_number || !newBus.route_name || actionLoading"
            @click="updateBus"
          >
            {{ actionLoading ? 'Saving...' : 'Save Changes' }}
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
