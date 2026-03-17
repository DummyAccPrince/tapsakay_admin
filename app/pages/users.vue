<script setup lang="ts">
import { Search, Plus, MoreVertical, Ban, DollarSign, UserCheck } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/lib/utils'
import type { User, NfcCard } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

const users = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref('')
const roleFilter = ref('all')
const selectedUser = ref<User | null>(null)
const showTopUpDialog = ref(false)
const topUpAmount = ref('')
const topUpLoading = ref(false)
const userCards = ref<NfcCard[]>([])
const selectedCardId = ref('')

const roleOptions = [
  { value: 'all', label: 'All Roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'driver', label: 'Driver' },
  { value: 'passenger', label: 'Passenger' }
]

const fetchUsers = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (roleFilter.value !== 'all') {
      query = query.eq('role', roleFilter.value)
    }

    if (searchQuery.value) {
      query = query.or(`full_name.ilike.%${searchQuery.value}%,email.ilike.%${searchQuery.value}%`)
    }

    const { data, error } = await query

    if (error) throw error
    users.value = data || []
  } catch (error) {
    console.error('Error fetching users:', error)
  } finally {
    loading.value = false
  }
}

const toggleUserStatus = async (user: User) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ is_active: !user.is_active })
      .eq('id', user.id)

    if (error) throw error
    await fetchUsers()
  } catch (error) {
    console.error('Error updating user status:', error)
  }
}

const openTopUpDialog = async (user: User) => {
  selectedUser.value = user
  topUpAmount.value = ''
  selectedCardId.value = ''
  
  const { data } = await supabase
    .from('nfc_cards')
    .select('*')
    .eq('owner_id', user.id)
    .eq('is_active', true)

  userCards.value = data || []
  showTopUpDialog.value = true
}

const handleTopUp = async () => {
  if (!selectedUser.value || !selectedCardId.value || !topUpAmount.value) return

  topUpLoading.value = true
  try {
    const amount = parseFloat(topUpAmount.value)
    const card = userCards.value.find(c => c.id === selectedCardId.value)
    if (!card) return

    const { user } = useAuth()
    const balanceBefore = Number(card.balance)
    const balanceAfter = balanceBefore + amount

    const { error: cardError } = await supabase
      .from('nfc_cards')
      .update({ balance: balanceAfter })
      .eq('id', selectedCardId.value)

    if (cardError) throw cardError

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        passenger_id: selectedUser.value.id,
        nfc_card_id: selectedCardId.value,
        transaction_type: 'reload',
        amount: amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        admin_id: user.value?.id,
        status: 'success'
      })

    if (txError) throw txError

    showTopUpDialog.value = false
    await fetchUsers()
  } catch (error) {
    console.error('Error processing top-up:', error)
  } finally {
    topUpLoading.value = false
  }
}

watch([roleFilter, searchQuery], () => {
  fetchUsers()
})

onMounted(fetchUsers)
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Users</h1>
        <p class="text-gray-500 mt-1">Manage all user accounts</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search users..."
          class="pl-10"
        />
      </div>
      <UiSelect
        v-model="roleFilter"
        :options="roleOptions"
        class="w-full sm:w-48"
      />
    </div>

    <!-- Users Table -->
    <UiCard>
      <UiTable>
        <thead>
          <tr class="border-b">
            <th class="text-left p-4 font-medium text-gray-500">Name</th>
            <th class="text-left p-4 font-medium text-gray-500">Email</th>
            <th class="text-left p-4 font-medium text-gray-500">Role</th>
            <th class="text-left p-4 font-medium text-gray-500">Status</th>
            <th class="text-left p-4 font-medium text-gray-500">Created</th>
            <th class="text-right p-4 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="p-8 text-center text-gray-500">Loading...</td>
          </tr>
          <tr v-else-if="users.length === 0">
            <td colspan="6" class="p-8 text-center text-gray-500">No users found</td>
          </tr>
          <tr v-for="user in users" :key="user.id" class="border-b last:border-0 hover:bg-gray-50">
            <td class="p-4">
              <div class="font-medium text-gray-900">{{ user.full_name }}</div>
              <div class="text-sm text-gray-500">{{ user.phone_number || 'No phone' }}</div>
            </td>
            <td class="p-4 text-gray-600">{{ user.email }}</td>
            <td class="p-4">
              <UiBadge
                :variant="user.role === 'admin' ? 'default' : user.role === 'driver' ? 'secondary' : 'outline'"
              >
                {{ user.role }}
              </UiBadge>
            </td>
            <td class="p-4">
              <UiBadge :variant="user.is_active ? 'success' : 'destructive'">
                {{ user.is_active ? 'Active' : 'Disabled' }}
              </UiBadge>
            </td>
            <td class="p-4 text-gray-600 text-sm">{{ formatDate(user.created_at) }}</td>
            <td class="p-4">
              <div class="flex items-center justify-end gap-2">
                <UiButton
                  v-if="user.role === 'passenger'"
                  variant="outline"
                  size="sm"
                  @click="openTopUpDialog(user)"
                >
                  <DollarSign class="h-4 w-4 mr-1" />
                  Top-up
                </UiButton>
                <UiButton
                  :variant="user.is_active ? 'destructive' : 'success'"
                  size="sm"
                  @click="toggleUserStatus(user)"
                >
                  <Ban v-if="user.is_active" class="h-4 w-4 mr-1" />
                  <UserCheck v-else class="h-4 w-4 mr-1" />
                  {{ user.is_active ? 'Disable' : 'Enable' }}
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>

    <!-- Top-up Dialog -->
    <UiDialog :open="showTopUpDialog" title="Top-up Balance" @close="showTopUpDialog = false">
      <div class="space-y-4">
        <div v-if="selectedUser">
          <p class="text-sm text-gray-500 mb-4">
            Top-up balance for <strong>{{ selectedUser.full_name }}</strong>
          </p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Select Card</label>
          <UiSelect
            v-model="selectedCardId"
            :options="userCards.map(c => ({ value: c.id, label: `${c.card_number} (₱${c.balance})` }))"
            placeholder="Select a card"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Amount (PHP)</label>
          <UiInput
            v-model="topUpAmount"
            type="number"
            placeholder="Enter amount"
            min="1"
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton variant="outline" @click="showTopUpDialog = false">Cancel</UiButton>
          <UiButton
            :disabled="!selectedCardId || !topUpAmount || topUpLoading"
            @click="handleTopUp"
          >
            {{ topUpLoading ? 'Processing...' : 'Confirm Top-up' }}
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
