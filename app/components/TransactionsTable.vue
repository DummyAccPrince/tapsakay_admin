<script setup lang="ts">
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  MapPin,
  Route
} from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/lib/utils'

interface TransactionRow {
  id: string
  transaction_type: string
  amount: number | string
  balance_before: number | string
  balance_after: number | string
  discount_applied?: number | string | null
  location_name?: string | null
  created_at: string
  status: string
  users?: {
    full_name?: string | null
  } | null
  nfc_cards?: {
    card_number?: string | null
  } | null
  buses?: {
    route_name?: string | null
  } | null
}

interface Props {
  transactions: TransactionRow[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const currentPage = ref(1)
const rowsPerPage = ref('8')

const rowsPerPageOptions = [
  { value: '8', label: '8 / page' },
  { value: '12', label: '12 / page' },
  { value: '20', label: '20 / page' }
]

const transactionTypeLabel = (type: string) => type.replace('_', ' ')

const isCredit = (type: string) => type === 'reload'

const getAmountPrefix = (type: string) => (isCredit(type) ? '+' : '-')

const getAmountBadgeClass = (type: string) => {
  if (isCredit(type)) {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  }
  return 'bg-rose-50 text-rose-700 ring-rose-200'
}

const getTypeIcon = (type: string) => {
  if (type === 'reload') return ArrowUpRight
  return ArrowDownLeft
}

const getTypeIconClass = (type: string) => {
  if (type === 'reload') return 'text-emerald-600'
  return 'text-rose-600'
}

const displayedTransactions = computed(() => {
  const pageSize = Number(rowsPerPage.value)
  const start = (currentPage.value - 1) * pageSize
  return props.transactions.slice(start, start + pageSize)
})

const totalPages = computed(() => Math.max(1, Math.ceil(props.transactions.length / Number(rowsPerPage.value))))

const insightItems = computed(() => {
  const today = new Date().toDateString()
  const todayTransactions = props.transactions.filter(transaction => new Date(transaction.created_at).toDateString() === today)
  const tapOutToday = todayTransactions.filter(transaction => transaction.transaction_type === 'tap_out')
  const divisoriaTapOuts = tapOutToday.filter(transaction => transaction.buses?.route_name?.toLowerCase().includes('divisoria'))
  const reloadByCard = props.transactions
    .filter(transaction => transaction.transaction_type === 'reload')
    .reduce((acc, transaction) => {
      const key = transaction.nfc_cards?.card_number || 'Unknown Card'
      acc.set(key, (acc.get(key) || 0) + 1)
      return acc
    }, new Map<string, number>())

  const unusualReload = Array.from(reloadByCard.entries()).sort((a, b) => b[1] - a[1])[0]
  const tapOutPercent = todayTransactions.length > 0 ? Math.round((tapOutToday.length / todayTransactions.length) * 100) : 0

  return [
    {
      icon: Lightbulb,
      text: `Insight: ${tapOutPercent}% of transactions today are 'Tap-outs'${divisoriaTapOuts.length > 0 ? ' on the Divisoria route' : ''}.`,
      tone: 'bg-blue-50 text-blue-700 ring-blue-200'
    },
    {
      icon: AlertTriangle,
      text: `Alert: ${unusualReload ? `Unusual reload pattern detected for Card ${unusualReload[0]}.` : 'No unusual reload pattern detected.'}`,
      tone: 'bg-amber-50 text-amber-700 ring-amber-200'
    }
  ]
})

watch(rowsPerPage, () => {
  currentPage.value = 1
})

const goPrevious = () => {
  currentPage.value = Math.max(1, currentPage.value - 1)
}

const goNext = () => {
  currentPage.value = Math.min(totalPages.value, currentPage.value + 1)
}
</script>

<template>
  <div class="space-y-5">
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_30px_-16px_rgba(15,23,42,0.24)]">
      <div class="flex min-w-max items-center gap-3">
        <div
          v-for="item in insightItems"
          :key="item.text"
          :class="['inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1', item.tone]"
        >
          <component :is="item.icon" class="h-4 w-4" />
          {{ item.text }}
        </div>
      </div>
    </div>

    <div class="space-y-3">
      <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        Loading transactions...
      </div>

      <div v-else-if="transactions.length === 0" class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        No transactions found
      </div>

      <template v-else>
        <div
          v-for="tx in displayedTransactions"
          :key="tx.id"
          class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-18px_rgba(15,23,42,0.35)]"
        >
          <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div class="flex items-start gap-3">
                <div class="rounded-xl bg-slate-100 p-2.5">
                  <component :is="getTypeIcon(tx.transaction_type)" :class="['h-5 w-5', getTypeIconClass(tx.transaction_type)]" />
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Type</p>
                  <p class="mt-1 font-semibold text-slate-900">{{ transactionTypeLabel(tx.transaction_type) }}</p>
                  <p class="text-xs text-slate-500">{{ tx.users?.full_name || 'Unknown Passenger' }}</p>
                </div>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Card</p>
                <div class="mt-1 flex items-center gap-2 text-slate-700">
                  <CreditCard class="h-4 w-4 text-slate-400" />
                  <span class="font-mono text-sm">{{ tx.nfc_cards?.card_number || 'No Card' }}</span>
                </div>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Amount</p>
                <div class="mt-1">
                  <span :class="['inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1', getAmountBadgeClass(tx.transaction_type)]">
                    {{ getAmountPrefix(tx.transaction_type) }}{{ formatCurrency(Number(tx.amount)) }}
                  </span>
                  <p v-if="tx.discount_applied && Number(tx.discount_applied) > 0" class="mt-1 text-xs text-emerald-600">
                    Discount: {{ formatCurrency(Number(tx.discount_applied)) }}
                  </p>
                </div>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Balance Flow</p>
                <div class="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <span class="rounded-lg bg-slate-100 px-2.5 py-1 font-medium">{{ formatCurrency(Number(tx.balance_before)) }}</span>
                  <ArrowRight class="h-4 w-4 text-slate-400" />
                  <span class="rounded-lg bg-slate-900 px-2.5 py-1 font-medium text-white">{{ formatCurrency(Number(tx.balance_after)) }}</span>
                </div>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</p>
                <div class="mt-1 flex items-center gap-2 text-sm text-slate-700">
                  <MapPin class="h-4 w-4 text-slate-400" />
                  <span>{{ tx.location_name || tx.buses?.route_name || 'No location' }}</span>
                </div>
                <div v-if="tx.buses?.route_name" class="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <Route class="h-3.5 w-3.5" />
                  {{ tx.buses.route_name }}
                </div>
              </div>
            </div>

            <div class="flex min-w-[180px] flex-col items-start gap-2 lg:items-end">
              <p class="text-sm text-slate-500">{{ formatDate(tx.created_at) }}</p>
              <div v-if="tx.status === 'success'" class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 class="h-4 w-4" />
                Success
              </div>
              <div v-else-if="tx.status === 'pending'" class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 ring-1 ring-amber-200">
                <LoaderCircle class="h-4 w-4 animate-spin" />
                Pending
              </div>
              <div v-else class="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 ring-1 ring-rose-200">
                <AlertTriangle class="h-4 w-4" />
                {{ tx.status }}
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div class="text-sm text-slate-600">
        Showing <span class="font-semibold text-slate-900">{{ displayedTransactions.length }}</span> of <span class="font-semibold text-slate-900">{{ transactions.length }}</span> transactions
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="flex items-center gap-2 text-sm text-slate-600">
          Rows per page
          <UiSelect v-model="rowsPerPage" :options="rowsPerPageOptions" class="w-28" />
        </div>

        <div class="flex items-center gap-2">
          <UiButton variant="outline" size="sm" :disabled="currentPage === 1" @click="goPrevious">
            <ChevronLeft class="mr-1 h-4 w-4" />
            Prev
          </UiButton>
          <div class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            {{ currentPage }} / {{ totalPages }}
          </div>
          <UiButton variant="outline" size="sm" :disabled="currentPage === totalPages" @click="goNext">
            Next
            <ChevronRight class="ml-1 h-4 w-4" />
          </UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
