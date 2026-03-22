<script setup lang="ts">
import { MoreVertical, DollarSign, Ban, UserCheck, Loader2 } from 'lucide-vue-next'
import { formatDate } from '~/lib/utils'
import type { User } from '~/types'

interface Props {
  user: User
  selected?: boolean
  updating?: boolean
}

interface Emits {
  (e: 'toggle-select', userId: string): void
  (e: 'toggle-status', user: User): void
  (e: 'open-topup', user: User): void
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  updating: false
})

const emit = defineEmits<Emits>()

const showMenu = ref(false)
const isUpdating = ref(false)

// Role badge configuration with high-contrast colors
const roleConfig = {
  admin: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    ring: 'ring-1 ring-indigo-600/20',
    label: 'Admin'
  },
  driver: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    ring: 'ring-1 ring-blue-600/20',
    label: 'Driver'
  },
  passenger: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-1 ring-emerald-600/20',
    label: 'Passenger'
  }
}

const roleStyle = computed(() => roleConfig[props.user.role as keyof typeof roleConfig] || roleConfig.passenger)

// Optimistic UI update
const handleStatusToggle = async () => {
  isUpdating.value = true
  emit('toggle-status', props.user)
  
  // Keep updating state for at least 500ms for visual feedback
  setTimeout(() => {
    isUpdating.value = false
  }, 500)
}
</script>

<template>
  <tr 
    :class="[
      'group border-b border-slate-200 transition-colors hover:bg-slate-50/50',
      selected && 'bg-blue-50/30',
      updating && 'opacity-60 pointer-events-none'
    ]"
  >
    <!-- Checkbox -->
    <td class="w-12 px-4 py-3">
      <input
        type="checkbox"
        :checked="selected"
        @change="emit('toggle-select', user.id)"
        class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
      />
    </td>

    <!-- Name & Phone -->
    <td class="px-4 py-3">
      <div class="flex items-center gap-3">
        <!-- Avatar -->
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-sm font-semibold text-white ring-2 ring-white">
          {{ user.full_name?.charAt(0).toUpperCase() || 'U' }}
        </div>
        
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-slate-900">
            {{ user.full_name || 'Unnamed User' }}
          </p>
          <p class="truncate text-xs text-slate-500">
            {{ user.phone_number || 'No phone number' }}
          </p>
        </div>
      </div>
    </td>

    <!-- Email -->
    <td class="px-4 py-3">
      <p class="truncate text-sm text-slate-600">{{ user.email }}</p>
    </td>

    <!-- Role Badge -->
    <td class="px-4 py-3">
      <span 
        :class="[
          roleStyle.bg,
          roleStyle.text,
          roleStyle.ring,
          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold'
        ]"
      >
        {{ roleStyle.label }}
      </span>
    </td>

    <!-- Status with Live Indicator -->
    <td class="px-4 py-3">
      <div class="flex items-center gap-2">
        <span
          v-if="user.is_active"
          class="relative flex h-2 w-2"
        >
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
        <span
          v-else
          class="inline-flex h-2 w-2 rounded-full bg-slate-300"
        ></span>
        
        <span :class="['text-sm font-medium', user.is_active ? 'text-emerald-700' : 'text-slate-500']">
          {{ user.is_active ? 'Active' : 'Disabled' }}
        </span>
      </div>
    </td>

    <!-- Created Date -->
    <td class="px-4 py-3 text-sm text-slate-500">
      {{ formatDate(user.created_at) }}
    </td>

    <!-- Actions -->
    <td class="px-4 py-3">
      <div class="flex items-center justify-end gap-2">
        <!-- Status Toggle (Ghost → Solid on Hover) -->
        <button
          @click="handleStatusToggle"
          :disabled="isUpdating"
          :class="[
            'group/btn relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
            user.is_active
              ? 'border border-red-200 text-red-600 hover:border-red-600 hover:bg-red-600 hover:text-white hover:shadow-sm'
              : 'border border-emerald-200 text-emerald-600 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-sm',
            isUpdating && 'opacity-50 cursor-not-allowed'
          ]"
        >
          <Loader2 v-if="isUpdating" class="h-3.5 w-3.5 animate-spin" />
          <Ban v-else-if="user.is_active" class="h-3.5 w-3.5" />
          <UserCheck v-else class="h-3.5 w-3.5" />
          <span>{{ user.is_active ? 'Disable' : 'Enable' }}</span>
        </button>

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
                v-if="user.role === 'passenger'"
                @click="emit('open-topup', user); showMenu = false"
                class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <DollarSign class="h-4 w-4 text-slate-400" />
                Top-up Balance
              </button>
              
              <button
                class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                disabled
              >
                <span class="text-xs text-slate-400">More actions coming soon</span>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </td>
  </tr>
</template>
