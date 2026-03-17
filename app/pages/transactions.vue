<script setup lang="ts">
import { Search, ArrowUpCircle, ArrowDownCircle, RefreshCw, Filter } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/lib/utils'
import type { Transaction, User, NfcCard, Bus } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()

interface TransactionWithRelations extends Transaction {
  users: User
  nfc_cards: NfcCard
  buses: Bus | null
}

const transactions = ref<TransactionWithRelations[]>([])
const loading = ref(true)
const searchQuery = ref('')
const typeFilter = ref('all')

const typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'tap_in', label: 'Tap In' },
  { value: 'tap_out', label: 'Tap Out' },
  { value: 'reload', label: 'Reload' }
]

const fetchTransactions = async () => {
  loading.value = true
  try {
    let query = supabase
      .from('transactions')
      .select(`
        *,
        users:passenger_id(*),
        nfc_cards:nfc_card_id(*),
        buses:bus_id(*)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (typeFilter.value !== 'all') {
      query = query.eq('transaction_type', typeFilter.value)
    }

    const { data, error } = await query

    if (error) throw error
    transactions.value = (data || []) as TransactionWithRelations[]
  } catch (error) {
    console.error('Error fetching transactions:', error)
  } finally {
    loading.value = false
  }
}

const filteredTransactions = computed(() => {
  if (!searchQuery.value) return transactions.value
  const query = searchQuery.value.toLowerCase()
  return transactions.value.filter(t =>
    t.users?.full_name?.toLowerCase().includes(query) ||
    t.nfc_cards?.card_number?.toLowerCase().includes(query) ||
    t.location_name?.toLowerCase().includes(query)
  )
})

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'tap_in': return ArrowDownCircle
    case 'tap_out': return ArrowUpCircle
    case 'reload': return RefreshCw
    default: return ArrowDownCircle
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'tap_in': return 'text-green-500'
    case 'tap_out': return 'text-red-500'
    case 'reload': return 'text-blue-500'
    default: return 'text-gray-500'
  }
}

const getTypeBadgeVariant = (type: string) => {
  switch (type) {
    case 'tap_in': return 'success'
    case 'tap_out': return 'destructive'
    case 'reload': return 'default'
    default: return 'secondary'
  }
}

watch(typeFilter, fetchTransactions)

onMounted(fetchTransactions)
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Transactions</h1>
        <p class="text-gray-500 mt-1">View all reloads, tap-ins, and tap-outs</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col sm:flex-row gap-4 mb-6">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <UiInput
          v-model="searchQuery"
          placeholder="Search transactions..."
          class="pl-10"
        />
      </div>
      <UiSelect
        v-model="typeFilter"
        :options="typeOptions"
        class="w-full sm:w-48"
      />
    </div>

    <!-- Transactions Table -->
    <UiCard>
      <UiTable>
        <thead>
          <tr class="border-b">
            <th class="text-left p-4 font-medium text-gray-500">Type</th>
            <th class="text-left p-4 font-medium text-gray-500">Passenger</th>
            <th class="text-left p-4 font-medium text-gray-500">Card</th>
            <th class="text-left p-4 font-medium text-gray-500">Amount</th>
            <th class="text-left p-4 font-medium text-gray-500">Balance</th>
            <th class="text-left p-4 font-medium text-gray-500">Location</th>
            <th class="text-left p-4 font-medium text-gray-500">Date & Time</th>
            <th class="text-left p-4 font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="8" class="p-8 text-center text-gray-500">Loading...</td>
          </tr>
          <tr v-else-if="filteredTransactions.length === 0">
            <td colspan="8" class="p-8 text-center text-gray-500">No transactions found</td>
          </tr>
          <tr v-for="tx in filteredTransactions" :key="tx.id" class="border-b last:border-0 hover:bg-gray-50">
            <td class="p-4">
              <div class="flex items-center gap-2">
                <component :is="getTypeIcon(tx.transaction_type)" :class="['h-5 w-5', getTypeColor(tx.transaction_type)]" />
                <UiBadge :variant="getTypeBadgeVariant(tx.transaction_type)">
                  {{ tx.transaction_type.replace('_', ' ') }}
                </UiBadge>
              </div>
            </td>
            <td class="p-4">
              <div class="font-medium text-gray-900">{{ tx.users?.full_name }}</div>
            </td>
            <td class="p-4">
              <div class="font-mono text-sm text-gray-600">{{ tx.nfc_cards?.card_number }}</div>
            </td>
            <td class="p-4">
              <span :class="[
                'font-medium',
                tx.transaction_type === 'reload' ? 'text-green-600' : 
                tx.transaction_type === 'tap_out' ? 'text-red-600' : 'text-gray-900'
              ]">
                {{ tx.transaction_type === 'reload' ? '+' : tx.transaction_type === 'tap_out' ? '-' : '' }}{{ formatCurrency(Number(tx.amount)) }}
              </span>
              <div v-if="tx.discount_applied && Number(tx.discount_applied) > 0" class="text-xs text-green-600">
                Discount: {{ formatCurrency(Number(tx.discount_applied)) }}
              </div>
            </td>
            <td class="p-4">
              <div class="text-sm">
                <div class="text-gray-500">Before: {{ formatCurrency(Number(tx.balance_before)) }}</div>
                <div class="font-medium text-gray-900">After: {{ formatCurrency(Number(tx.balance_after)) }}</div>
              </div>
            </td>
            <td class="p-4">
              <span v-if="tx.location_name" class="text-gray-600">{{ tx.location_name }}</span>
              <span v-else-if="tx.buses" class="text-gray-600">{{ tx.buses.route_name }}</span>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4 text-sm text-gray-600">{{ formatDate(tx.created_at) }}</td>
            <td class="p-4">
              <UiBadge :variant="tx.status === 'success' ? 'success' : tx.status === 'failed' ? 'destructive' : 'warning'">
                {{ tx.status }}
              </UiBadge>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>
  </div>
</template>
