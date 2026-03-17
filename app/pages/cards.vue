<script setup lang="ts">
import { Search, Plus, CreditCard, Ban, CheckCircle } from 'lucide-vue-next'
import { formatCurrency, formatDate } from '~/lib/utils'
import type { NfcCard, User } from '~/types'

definePageMeta({
  middleware: 'auth'
})

const supabase = useSupabaseClient()
const route = useRoute()

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
    await fetchCards()
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
    const { error } = await supabase
      .from('nfc_cards')
      .update({ is_blocked: !card.is_blocked })
      .eq('id', card.id)

    if (error) throw error
    await fetchCards()
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
