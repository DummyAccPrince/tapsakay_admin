<script setup lang="ts">
import { MoreVertical, Eye, Edit, Bus as BusIcon, AlertTriangle, Calendar, Phone, Mail } from 'lucide-vue-next'
import { formatDateOnly } from '~/lib/utils'
import type { Driver, User, Bus } from '~/types'

interface DriverWithRelations extends Driver {
  users: User
  buses: Bus | null
}

interface Props {
  driver: DriverWithRelations
  selected?: boolean
}

interface Emits {
  (e: 'toggle-select', driverId: string): void
  (e: 'assign-bus', driver: DriverWithRelations): void
  (e: 'view-license', driver: DriverWithRelations): void
  (e: 'edit-driver', driver: DriverWithRelations): void
}

const props = withDefaults(defineProps<Props>(), {
  selected: false
})

const emit = defineEmits<Emits>()

const showMenu = ref(false)
const { getLicenseExpiryStatus, getDutyStatusStyle, getBusAssignmentStatus } = useDriverStatus()

// License expiry status
const licenseStatus = computed(() => 
  getLicenseExpiryStatus(props.driver.license_expiry_date)
)

// Duty status styling
const dutyStatus = computed(() => 
  getDutyStatusStyle(props.driver.is_on_duty)
)

// Bus assignment status
const busStatus = computed(() => 
  getBusAssignmentStatus(!!props.driver.buses)
)
</script>

<template>
  <tr 
    :class="[
      'group border-b border-slate-200 transition-colors hover:bg-slate-50/50',
      selected && 'bg-blue-50/30',
      licenseStatus.urgent && 'bg-red-50/20'
    ]"
  >
    <!-- Checkbox -->
    <td class="w-12 px-4 py-3">
      <input
        type="checkbox"
        :checked="selected"
        @change="emit('toggle-select', driver.id)"
        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
      />
    </td>

    <!-- Driver Info (Name + Contact) -->
    <td class="px-4 py-3">
      <div class="flex items-center gap-3">
        <!-- Avatar -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-semibold text-white ring-2 ring-white shadow-sm">
          {{ (driver.users?.full_name || driver.full_name)?.charAt(0).toUpperCase() || 'D' }}
        </div>
        
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900">
            {{ driver.users?.full_name || driver.full_name || 'Unnamed Driver' }}
          </p>
          <div class="flex items-center gap-3 text-xs text-slate-500">
            <span v-if="driver.users?.email" class="flex items-center gap-1 truncate">
              <Mail class="h-3 w-3 shrink-0" />
              {{ driver.users.email }}
            </span>
            <span v-if="driver.users?.phone_number" class="flex items-center gap-1">
              <Phone class="h-3 w-3 shrink-0" />
              {{ driver.users.phone_number }}
            </span>
          </div>
        </div>
      </div>
    </td>

    <!-- License Number -->
    <td class="px-4 py-3">
      <code class="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700">
        {{ driver.driver_license_number }}
      </code>
    </td>

    <!-- License Expiry with Urgency Indicator -->
    <td class="px-4 py-3">
      <div class="flex items-center gap-2">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-1.5">
            <Calendar class="h-3.5 w-3.5 text-slate-400" />
            <span :class="['text-sm', licenseStatus.textClass]">
              {{ formatDateOnly(driver.license_expiry_date) }}
            </span>
          </div>
          
          <!-- Urgency Badge -->
          <span
            v-if="licenseStatus.urgent || licenseStatus.status === 'warning'"
            :class="[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              licenseStatus.badgeClass
            ]"
          >
            <AlertTriangle class="h-3 w-3" />
            {{ licenseStatus.label }}
          </span>
        </div>
      </div>
    </td>

    <!-- Bus Assignment with Ghost Button -->
    <td class="px-4 py-3">
      <button
        v-if="!driver.buses"
        @click="emit('assign-bus', driver)"
        :class="[
          'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
          busStatus.buttonClass
        ]"
      >
        <BusIcon :class="['h-4 w-4', busStatus.iconClass]" />
        <span>Assign Bus</span>
      </button>
      
      <div v-else class="flex items-center gap-2">
        <div class="flex-1">
          <p class="text-sm font-medium text-slate-900">
            {{ driver.buses.bus_number }}
          </p>
          <p class="text-xs text-slate-500">
            {{ driver.buses.plate_number }}
          </p>
        </div>
        <button
          @click="emit('assign-bus', driver)"
          class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
          title="Change bus assignment"
        >
          <Edit class="h-3.5 w-3.5" />
        </button>
      </div>
    </td>

    <!-- Duty Status with Pulsing Indicator -->
    <td class="px-4 py-3">
      <div class="flex items-center gap-2">
        <!-- Pulsing Dot for On Duty -->
        <span
          v-if="dutyStatus.showPulse"
          class="relative flex h-2.5 w-2.5"
        >
          <span :class="['absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', dutyStatus.pulseClass]"></span>
          <span :class="['relative inline-flex h-2.5 w-2.5 rounded-full', dutyStatus.pulseClass.replace('bg-emerald-400', 'bg-emerald-500')]"></span>
        </span>
        <span
          v-else
          class="inline-flex h-2.5 w-2.5 rounded-full bg-slate-300"
        ></span>
        
        <span :class="['text-sm font-medium', dutyStatus.showPulse ? 'text-emerald-700' : 'text-slate-500']">
          {{ dutyStatus.label }}
        </span>
      </div>
    </td>

    <!-- Compact Actions -->
    <td class="px-4 py-3">
      <div class="flex items-center justify-end gap-1">
        <!-- Quick Actions (visible on hover) -->
        <div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            v-if="driver.license_image_url"
            @click="emit('view-license', driver)"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
            title="View license image"
          >
            <Eye class="h-4 w-4" />
          </button>
          
          <button
            @click="emit('edit-driver', driver)"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
            title="Edit driver"
          >
            <Edit class="h-4 w-4" />
          </button>
        </div>

        <!-- More Actions Menu -->
        <div class="relative">
          <button
            @click="showMenu = !showMenu"
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <MoreVertical class="h-4 w-4" />
          </button>

          <!-- Dropdown Menu -->
          <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="transform scale-95 opacity-0"
            enter-to-class="transform scale-100 opacity-100"
            leave-active-class="transition duration-75 ease-in"
            leave-from-class="transform scale-100 opacity-100"
            leave-to-class="transform scale-95 opacity-0"
          >
            <div
              v-if="showMenu"
              v-click-outside="() => showMenu = false"
              class="absolute right-0 top-full z-10 mt-1 w-48 origin-top-right rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
            >
              <button
                v-if="driver.license_image_url"
                @click="emit('view-license', driver); showMenu = false"
                class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Eye class="h-4 w-4 text-slate-400" />
                View License Image
              </button>
              
              <button
                @click="emit('edit-driver', driver); showMenu = false"
                class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Edit class="h-4 w-4 text-slate-400" />
                Edit Driver Info
              </button>
              
              <button
                @click="emit('assign-bus', driver); showMenu = false"
                class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <BusIcon class="h-4 w-4 text-slate-400" />
                {{ driver.buses ? 'Change Bus' : 'Assign Bus' }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </td>
  </tr>
</template>
