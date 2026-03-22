<script setup lang="ts">
import { Search, Plus, CreditCard, Ban, CheckCircle, AlertTriangle, Wallet } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/lib/utils'
import type { NfcCard, User } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const route = useRoute()
const { audit, pending: auditLoading, refresh: refreshAudit } = useCardFinancialAudit()

interface CardWithOwner extends NfcCard {
  users: User | null
}

const cards = ref<CardWithOwner[]>([])
const users = ref<User[]>([])
const loading = ref(true)
const searchQuery = ref('')

const showAddDialog = ref(false)
const actionLoading = ref(false)

const newCard = ref({
  card_number: '',
  uid: '',
  card_type: 'reloadable',
  owner_id: '',
  balance: 0,
  discount_type: 'none'
})

const cardTypeOptions = [
  { value: 'reloadable', label: 'Reloadable' },
  { value: 'single_use', label: 'Single Use' }
]

const discountOptions = [
  { value: 'none', label: 'None' },
  { value: 'student', label: 'Student (20%)' },
  { value: 'senior', label: 'Senior Citizen (20%)' },
  { value: 'pwd', label: 'PWD (20%)' }
]

const fetchCards = async () => {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('nfc_cards')
      .select(`
        *,
        users:owner_id(*)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    cards.value = (data || []) as CardWithOwner[]
  } catch (error) {
    console.error('Error fetching cards:', error)
  } finally {
    loading.value = false
  }
}

const fetchUsers = async () => {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('full_name')

  users.value = data || []
}

const openAddDialog = () => {
  fetchUsers()
  newCard.value = {
    card_number: generateCardNumber(),
    uid: '',
    card_type: 'reloadable',
    owner_id: '',
    balance: 0,
    discount_type: 'none'
  }
  showAddDialog.value = true
}

const generateCardNumber = () => {
  const prefix = 'TAP'
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return `${prefix}-${random}`
}

const createCard = async () => {
  actionLoading.value = true
  try {
    const { error } = await supabase
      .from('nfc_cards')
      .insert({
        card_number: newCard.value.card_number,
        uid: newCard.value.uid || null,
        card_type: newCard.value.card_type,
        owner_id: newCard.value.owner_id || null,
        balance: newCard.value.balance,
        discount_type: newCard.value.discount_type
      })

    if (error) throw error

    showAddDialog.value = false
    await Promise.all([fetchCards(), refreshAudit()])
  } catch (error) {
    console.error('Error creating card:', error)
  } finally {
    actionLoading.value = false
  }
}

const toggleCardStatus = async (card: CardWithOwner) => {
  try {
    const { error } = await supabase
      .from('nfc_cards')
      .update({ is_active: !card.is_active })
      .eq('id', card.id)

    if (error) throw error
    await fetchCards()
  } catch (error) {
    console.error('Error updating card status:', error)
  }
}

const toggleCardBlock = async (card: CardWithOwner) => {
  try {
    const isHighValueAsset = audit.value.highValueAssets.some(asset => asset.id === card.id)

    if (!card.is_blocked && isHighValueAsset) {
      const confirmed = confirm(
        `High Value Asset detected for ${card.card_number} with balance ${formatCurrency(Number(card.balance))}.\n\nSuggested control: require two-factor confirmation before blocking.\n\nType-safe fallback: confirm this action manually now.`
      )

      if (!confirmed) {
        return
      }
    }

    const { error } = await supabase
      .from('nfc_cards')
      .update({ is_blocked: !card.is_blocked })
      .eq('id', card.id)

    if (error) throw error
    await Promise.all([fetchCards(), refreshAudit()])
  } catch (error) {
    console.error('Error updating card block status:', error)
  }
}

const filteredCards = computed(() => {
  if (!searchQuery.value) return cards.value
  const query = searchQuery.value.toLowerCase()
  return cards.value.filter(c =>
    c.card_number.toLowerCase().includes(query) ||
    c.uid?.toLowerCase().includes(query) ||
    c.users?.full_name?.toLowerCase().includes(query)
  )
})

const getDiscountLabel = (type: string | null) => {
  switch (type) {
    case 'student': return 'Student'
    case 'senior': return 'Senior'
    case 'pwd': return 'PWD'
    default: return 'None'
  }
}

onMounted(() => {
  fetchCards()
  if (route.query.action === 'add') {
    openAddDialog()
  }
})
</script>

<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">NFC Cards</h1>
        <p class="text-gray-500 mt-1">Manage NFC card registry</p>
      </div>
      <UiButton @click="openAddDialog">
        <Plus class="h-4 w-4 mr-2" />
        Create Card
      </UiButton>
    </div>

    <div v-if="audit.recommendations.toastMessage" class="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-white p-4 shadow-[0_8px_24px_-12px_rgba(245,158,11,0.35)]">
      <div class="flex items-start gap-3">
        <div class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
          <AlertTriangle class="h-5 w-5" />
        </div>
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Low-Balance Alert</p>
          <p class="mt-1 text-sm leading-6 text-slate-700">{{ audit.recommendations.toastMessage }}</p>
        </div>
      </div>
    </div>

    <div class="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div class="xl:col-span-2">
        <CardTypePieChart :points="audit.charts.cardTypeDistribution" :loading="auditLoading" />
      </div>
      <div class="xl:col-span-3">
        <DiscountBalanceBarChart :points="audit.charts.balanceByDiscount" :loading="auditLoading" />
      </div>
    </div>

    <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Dormant Capital</h2>
            <p class="mt-1 text-sm text-slate-500">Reloadable cards unused for 30 days with balances above ₱100.</p>
          </div>
          <div class="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            {{ audit.dormantCapital.length }} flagged
          </div>
        </div>

        <div v-if="auditLoading" class="space-y-3 animate-pulse">
          <div v-for="i in 3" :key="i" class="h-12 rounded-xl bg-slate-100"></div>
        </div>
        <div v-else-if="audit.dormantCapital.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No dormant capital cards detected.
        </div>
        <div v-else class="space-y-3">
          <div v-for="card in audit.dormantCapital.slice(0, 5)" :key="card.id" class="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <div>
              <p class="font-medium text-slate-900">{{ card.cardNumber }}</p>
              <p class="text-xs text-slate-500">{{ card.ownerName || 'Unassigned owner' }}</p>
            </div>
            <div class="text-right">
              <p class="font-semibold text-slate-900">{{ formatCurrency(card.balance) }}</p>
              <p class="text-xs text-slate-500">
                {{ card.lastUsedAt ? `Last used ${formatDate(card.lastUsedAt)}` : 'Never used' }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)]">
        <div class="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">High Value Assets</h2>
            <p class="mt-1 text-sm text-slate-500">Cards above ₱5,000 should use stronger controls before blocking.</p>
          </div>
          <div class="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
            {{ audit.highValueAssets.length }} high value
          </div>
        </div>

        <div v-if="auditLoading" class="space-y-3 animate-pulse">
          <div v-for="i in 2" :key="i" class="h-12 rounded-xl bg-slate-100"></div>
        </div>
        <div v-else-if="audit.highValueAssets.length === 0" class="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No high value asset cards detected.
        </div>
        <div v-else class="space-y-3">
          <div v-for="asset in audit.highValueAssets" :key="asset.id" class="flex items-center justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 ring-1 ring-rose-200">
                <Wallet class="h-5 w-5" />
              </div>
              <div>
                <p class="font-medium text-slate-900">{{ asset.cardNumber }}</p>
                <p class="text-xs text-slate-500">{{ asset.ownerName || 'Unassigned owner' }}</p>
              </div>
            </div>
            <p class="font-semibold text-rose-700">{{ formatCurrency(asset.balance) }}</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <UiInput
        v-model="searchQuery"
        placeholder="Search cards..."
        class="pl-10 max-w-md"
      />
    </div>

    <!-- Cards Table -->
    <UiCard>
      <UiTable>
        <thead>
          <tr class="border-b">
            <th class="text-left p-4 font-medium text-gray-500">Card Number</th>
            <th class="text-left p-4 font-medium text-gray-500">Type</th>
            <th class="text-left p-4 font-medium text-gray-500">Owner</th>
            <th class="text-left p-4 font-medium text-gray-500">Balance</th>
            <th class="text-left p-4 font-medium text-gray-500">Discount</th>
            <th class="text-left p-4 font-medium text-gray-500">Status</th>
            <th class="text-right p-4 font-medium text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="p-8 text-center text-gray-500">Loading...</td>
          </tr>
          <tr v-else-if="filteredCards.length === 0">
            <td colspan="7" class="p-8 text-center text-gray-500">No cards found</td>
          </tr>
          <tr v-for="card in filteredCards" :key="card.id" class="border-b last:border-0 hover:bg-gray-50">
            <td class="p-4">
              <div class="flex items-center gap-2">
                <CreditCard class="h-5 w-5 text-gray-400" />
                <div>
                  <div class="font-mono font-medium text-gray-900">{{ card.card_number }}</div>
                  <div v-if="card.uid" class="text-xs text-gray-500">UID: {{ card.uid }}</div>
                </div>
              </div>
            </td>
            <td class="p-4">
              <UiBadge :variant="card.card_type === 'reloadable' ? 'default' : 'secondary'">
                {{ card.card_type }}
              </UiBadge>
            </td>
            <td class="p-4">
              <span v-if="card.users" class="text-gray-900">{{ card.users.full_name }}</span>
              <span v-else class="text-gray-400">Unassigned</span>
            </td>
            <td class="p-4 font-medium text-gray-900">{{ formatCurrency(Number(card.balance)) }}</td>
            <td class="p-4">
              <UiBadge v-if="card.discount_type && card.discount_type !== 'none'" variant="warning">
                {{ getDiscountLabel(card.discount_type) }}
              </UiBadge>
              <span v-else class="text-gray-400">-</span>
            </td>
            <td class="p-4">
              <div class="flex flex-col gap-1">
                <UiBadge :variant="card.is_active ? 'success' : 'destructive'" class="w-fit">
                  {{ card.is_active ? 'Active' : 'Inactive' }}
                </UiBadge>
                <UiBadge v-if="card.is_blocked" variant="destructive" class="w-fit">
                  Blocked
                </UiBadge>
                <UiBadge v-if="audit.highValueAssets.some(asset => asset.id === card.id)" variant="warning" class="w-fit">
                  High Value Asset
                </UiBadge>
              </div>
            </td>
            <td class="p-4">
              <div class="flex items-center justify-end gap-2">
                <UiButton
                  :variant="card.is_blocked ? 'success' : 'destructive'"
                  size="sm"
                  @click="toggleCardBlock(card)"
                >
                  <Ban v-if="!card.is_blocked" class="h-4 w-4 mr-1" />
                  <CheckCircle v-else class="h-4 w-4 mr-1" />
                  {{ card.is_blocked ? 'Unblock' : 'Block' }}
                </UiButton>
              </div>
            </td>
          </tr>
        </tbody>
      </UiTable>
    </UiCard>

    <!-- Add Card Dialog -->
    <UiDialog :open="showAddDialog" title="Create NFC Card" @close="showAddDialog = false">
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Card Number</label>
            <UiInput v-model="newCard.card_number" placeholder="Auto-generated" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">UID (Optional)</label>
            <UiInput v-model="newCard.uid" placeholder="NFC UID" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Card Type</label>
            <UiSelect v-model="newCard.card_type" :options="cardTypeOptions" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Initial Balance</label>
            <UiInput v-model="newCard.balance" type="number" min="0" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Assign to User (Optional)</label>
          <UiSelect
            v-model="newCard.owner_id"
            :options="[
              { value: '', label: 'No owner' },
              ...users.map(u => ({ value: u.id, label: `${u.full_name} (${u.email})` }))
            ]"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5">Discount Type</label>
          <UiSelect v-model="newCard.discount_type" :options="discountOptions" />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton variant="outline" @click="showAddDialog = false">Cancel</UiButton>
          <UiButton
            :disabled="!newCard.card_number || actionLoading"
            @click="createCard"
          >
            {{ actionLoading ? 'Creating...' : 'Create Card' }}
          </UiButton>
        </div>
      </div>
    </UiDialog>
  </div>
</template>
