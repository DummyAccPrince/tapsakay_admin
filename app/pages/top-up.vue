<script setup lang="ts">
import { Search, Wallet, CreditCard, ArrowRight, RefreshCw } from 'lucide-vue-next'
import { formatCurrency } from '~/lib/utils'
import type { NfcCard, User } from '~/types'

definePageMeta({
  middleware: 'auth'
})

interface UserWithCards extends User {
  cards: NfcCard[]
}

const supabase = useSupabaseClient()
const { user } = useAuth()

const loading = ref(true)
const actionLoading = ref(false)
const searchQuery = ref('')
const users = ref<UserWithCards[]>([])
const selectedUserId = ref('')
const selectedCardId = ref('')
const topUpAmount = ref('100')

const amountSuggestions = [100, 200, 500, 1000]

const fetchTopUpData = async () => {
  loading.value = true
  try {
    const [usersRes, cardsRes] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .eq('role', 'passenger')
        .eq('is_active', true)
        .order('full_name'),
      supabase
        .from('nfc_cards')
        .select('*')
        .eq('is_active', true)
        .eq('is_blocked', false)
        .order('created_at', { ascending: false })
    ])

    if (usersRes.error) throw usersRes.error
    if (cardsRes.error) throw cardsRes.error

    const cards = (cardsRes.data || []) as NfcCard[]
    users.value = ((usersRes.data || []) as User[]).map(passenger => ({
      ...passenger,
      cards: cards.filter(card => card.owner_id === passenger.id)
    }))

    if (!selectedUserId.value && users.value.length > 0) {
      selectedUserId.value = users.value.find(item => item.cards.length > 0)?.id || users.value[0].id
    }
  } catch (error) {
    console.error('Error fetching top-up data:', error)
  } finally {
    loading.value = false
  }
}

const filteredUsers = computed(() => {
  if (!searchQuery.value) return users.value
  const query = searchQuery.value.toLowerCase()
  return users.value.filter(item =>
    item.full_name.toLowerCase().includes(query) ||
    item.email.toLowerCase().includes(query) ||
    item.cards.some(card => card.card_number.toLowerCase().includes(query))
  )
})

const selectedUser = computed(() =>
  filteredUsers.value.find(item => item.id === selectedUserId.value) ||
  users.value.find(item => item.id === selectedUserId.value) ||
  null
)

const selectedCard = computed(() =>
  selectedUser.value?.cards.find(card => card.id === selectedCardId.value) || null
)

watch(selectedUser, (value) => {
  if (!value) {
    selectedCardId.value = ''
    return
  }

  if (!value.cards.some(card => card.id === selectedCardId.value)) {
    selectedCardId.value = value.cards[0]?.id || ''
  }
}, { immediate: true })

const canSubmit = computed(() => Number(topUpAmount.value) > 0 && !!selectedUser.value && !!selectedCard.value)

const processTopUp = async () => {
  if (!selectedUser.value || !selectedCard.value || !canSubmit.value) return

  actionLoading.value = true
  try {
    const amount = Number(topUpAmount.value)
    const balanceBefore = Number(selectedCard.value.balance)
    const balanceAfter = balanceBefore + amount

    const { error: cardError } = await supabase
      .from('nfc_cards')
      .update({ balance: balanceAfter })
      .eq('id', selectedCard.value.id)

    if (cardError) throw cardError

    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        passenger_id: selectedUser.value.id,
        nfc_card_id: selectedCard.value.id,
        transaction_type: 'reload',
        amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        admin_id: user.value?.id,
        status: 'success',
        location_name: 'Top-up Center'
      })

    if (transactionError) throw transactionError

    await fetchTopUpData()
  } catch (error) {
    console.error('Error processing top-up:', error)
  } finally {
    actionLoading.value = false
  }
}

onMounted(fetchTopUpData)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">Card Top-up Center</h1>
        <p class="mt-1 text-sm text-slate-500">Load new balance to active passenger cards and record successful reload transactions.</p>
      </div>
      <UiButton variant="outline" :disabled="loading" @click="fetchTopUpData">
        <RefreshCw :class="['mr-2 h-4 w-4', loading && 'animate-spin']" />
        Refresh
      </UiButton>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.2)]">
        <div class="relative mb-4">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <UiInput v-model="searchQuery" placeholder="Search passenger or card..." class="pl-10" />
        </div>

        <div class="space-y-3 max-h-[620px] overflow-y-auto pr-1">
          <div v-if="loading" class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            Loading top-up data...
          </div>
          <div v-else-if="filteredUsers.length === 0" class="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No passenger cards found.
          </div>
          <button
            v-for="passenger in filteredUsers"
            :key="passenger.id"
            class="w-full rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            :class="selectedUserId === passenger.id ? 'border-blue-200 bg-blue-50/70' : 'border-slate-200 bg-white'"
            @click="selectedUserId = passenger.id"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-900">{{ passenger.full_name }}</p>
                <p class="text-sm text-slate-500">{{ passenger.email }}</p>
              </div>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {{ passenger.cards.length }} card{{ passenger.cards.length === 1 ? '' : 's' }}
              </span>
            </div>
          </button>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.2)]">
        <div v-if="!selectedUser" class="flex h-full min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
          Select a passenger to load balance.
        </div>

        <div v-else class="space-y-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 class="text-xl font-semibold text-slate-900">{{ selectedUser.full_name }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ selectedUser.email }}</p>
            </div>
            <div class="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Reload transactions are recorded automatically after a successful balance update.
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            <button
              v-for="card in selectedUser.cards"
              :key="card.id"
              class="rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              :class="selectedCardId === card.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white'"
              @click="selectedCardId = card.id"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                  <div :class="selectedCardId === card.id ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'" class="rounded-xl p-2.5">
                    <CreditCard class="h-5 w-5" />
                  </div>
                  <div>
                    <p class="font-mono text-sm font-semibold">{{ card.card_number }}</p>
                    <p :class="selectedCardId === card.id ? 'text-white/70' : 'text-slate-500'" class="text-xs">{{ card.card_type }}</p>
                  </div>
                </div>
                <div class="text-right">
                  <p :class="selectedCardId === card.id ? 'text-white/70' : 'text-slate-500'" class="text-xs">Current Balance</p>
                  <p class="font-semibold">{{ formatCurrency(Number(card.balance)) }}</p>
                </div>
              </div>
            </button>
          </div>

          <div v-if="selectedCard" class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Load Balance</h3>

              <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <UiButton
                  v-for="amount in amountSuggestions"
                  :key="amount"
                  variant="outline"
                  @click="topUpAmount = String(amount)"
                >
                  {{ formatCurrency(amount) }}
                </UiButton>
              </div>

              <div class="mt-5 max-w-sm">
                <label class="mb-2 block text-sm font-medium text-slate-700">Custom top-up amount</label>
                <UiInput v-model="topUpAmount" type="number" min="1" step="0.01" />
              </div>
            </div>

            <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Balance Preview</h3>
              <div class="mt-5 space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-500">Before</span>
                  <span class="font-semibold text-slate-900">{{ formatCurrency(Number(selectedCard.balance)) }}</span>
                </div>
                <div class="flex items-center justify-center text-slate-400">
                  <ArrowRight class="h-5 w-5" />
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm text-slate-500">After</span>
                  <span class="font-semibold text-emerald-600">{{ formatCurrency(Number(selectedCard.balance) + Number(topUpAmount || 0)) }}</span>
                </div>
                <div class="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                  Admin reloads will be logged in the transactions ledger with `Top-up Center` as the location.
                </div>
                <UiButton class="w-full" :disabled="!canSubmit || actionLoading" @click="processTopUp">
                  <Wallet class="mr-2 h-4 w-4" />
                  {{ actionLoading ? 'Processing top-up...' : 'Load New Balance' }}
                </UiButton>
              </div>
            </div>
          </div>

          <div v-else class="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            This passenger has no active unblocked cards available for top-up.
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
