<script setup lang="ts">
import { Search } from 'lucide-vue-next'
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
  let items = [...transactions.value]

  if (typeFilter.value !== 'all') {
    items = items.filter(transaction => transaction.transaction_type === typeFilter.value)
  }

  if (!searchQuery.value) return items
  const query = searchQuery.value.toLowerCase()
  return items.filter(t =>
    t.users?.full_name?.toLowerCase().includes(query) ||
    t.nfc_cards?.card_number?.toLowerCase().includes(query) ||
    t.location_name?.toLowerCase().includes(query)
  )
})

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

    <TransactionsTable :transactions="filteredTransactions" :loading="loading" />
  </div>
</template>
