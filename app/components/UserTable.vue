<script setup lang="ts">
import { Trash2, Ban, UserCheck } from 'lucide-vue-next'
import type { User } from '~/types'

interface Props {
  users: User[]
  loading?: boolean
  currentPage?: number
  totalPages?: number
}

interface Emits {
  (e: 'toggle-status', user: User): void
  (e: 'open-topup', user: User): void
  (e: 'page-change', page: number): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  currentPage: 1,
  totalPages: 1
})

const emit = defineEmits<Emits>()

const selectedUsers = ref<Set<string>>(new Set())
const updatingUsers = ref<Set<string>>(new Set())

const allSelected = computed({
  get: () => props.users.length > 0 && selectedUsers.value.size === props.users.length,
  set: (value: boolean) => {
    if (value) {
      selectedUsers.value = new Set(props.users.map(u => u.id))
    } else {
      selectedUsers.value.clear()
    }
  }
})

const someSelected = computed(() => 
  selectedUsers.value.size > 0 && selectedUsers.value.size < props.users.length
)

const toggleUserSelect = (userId: string) => {
  if (selectedUsers.value.has(userId)) {
    selectedUsers.value.delete(userId)
  } else {
    selectedUsers.value.add(userId)
  }
}

const handleToggleStatus = async (user: User) => {
  updatingUsers.value.add(user.id)
  emit('toggle-status', user)
  
  // Remove from updating set after operation
  setTimeout(() => {
    updatingUsers.value.delete(user.id)
  }, 1000)
}

const clearSelection = () => {
  selectedUsers.value.clear()
}

// Bulk actions
const bulkDisable = () => {
  // Emit bulk action event
  console.log('Bulk disable:', Array.from(selectedUsers.value))
  clearSelection()
}

const bulkEnable = () => {
  console.log('Bulk enable:', Array.from(selectedUsers.value))
  clearSelection()
}
</script>

<template>
  <div class="space-y-4">
    <!-- Bulk Actions Toolbar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="transform -translate-y-2 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-2 opacity-0"
    >
      <div
        v-if="selectedUsers.size > 0"
        class="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm font-semibold text-blue-900">
            {{ selectedUsers.size }} user{{ selectedUsers.size > 1 ? 's' : '' }} selected
          </span>
          <button
            @click="clearSelection"
            class="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            Clear selection
          </button>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="bulkDisable"
            class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            <Ban class="h-3.5 w-3.5" />
            Disable
          </button>
          <button
            @click="bulkEnable"
            class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
          >
            <UserCheck class="h-3.5 w-3.5" />
            Enable
          </button>
        </div>
      </div>
    </Transition>

    <!-- Table Container with Sticky Header -->
    <div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="max-h-[calc(100vh-280px)] overflow-auto">
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
                User
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Email
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Role
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Status
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                Created
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
                  <p class="text-sm text-slate-500">Loading users...</p>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="users.length === 0">
              <td colspan="7" class="px-4 py-12 text-center">
                <div class="flex flex-col items-center gap-2">
                  <svg class="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p class="text-sm font-medium text-slate-600">No users found</p>
                  <p class="text-xs text-slate-400">Try adjusting your search or filters</p>
                </div>
              </td>
            </tr>

            <!-- User Rows -->
            <UserTableRow
              v-for="user in users"
              :key="user.id"
              :user="user"
              :selected="selectedUsers.has(user.id)"
              :updating="updatingUsers.has(user.id)"
              @toggle-select="toggleUserSelect"
              @toggle-status="handleToggleStatus"
              @open-topup="(user) => emit('open-topup', user)"
            />
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3"
      >
        <p class="text-sm text-slate-600">
          Page <span class="font-semibold">{{ currentPage }}</span> of <span class="font-semibold">{{ totalPages }}</span>
        </p>

        <div class="flex items-center gap-2">
          <button
            @click="emit('page-change', currentPage - 1)"
            :disabled="currentPage === 1"
            class="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            @click="emit('page-change', currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
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

/* Custom scrollbar for table */
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
