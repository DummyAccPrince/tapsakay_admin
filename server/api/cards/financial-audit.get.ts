import { serverSupabaseClient } from '#supabase/server'
import type { CardFinancialAuditResponse } from '~/composables/useCardFinancialAudit'

interface CardRow {
  id: string
  card_number: string
  card_type: 'reloadable' | 'single_use'
  balance: string | number | null
  discount_type: string | null
  last_used_at: string | null
  owner_id: string | null
  users: {
    full_name: string | null
    email: string | null
  } | null
}

interface PassengerTripRow {
  final_amount: string | number | null
}

const round = (value: number) => Number(value.toFixed(2))

export default defineEventHandler(async (event): Promise<CardFinancialAuditResponse> => {
  const supabase = await serverSupabaseClient(event)

  const [cardsRes, passengerTripsRes] = await Promise.all([
    supabase
      .from('nfc_cards')
      .select(`
        id,
        card_number,
        card_type,
        balance,
        discount_type,
        last_used_at,
        owner_id,
        users:owner_id(full_name, email)
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('passenger_trips')
      .select('final_amount')
      .not('final_amount', 'is', null)
  ])

  if (cardsRes.error || passengerTripsRes.error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load card financial audit'
    })
  }

  const cards = (cardsRes.data || []) as CardRow[]
  const passengerTrips = (passengerTripsRes.data || []) as PassengerTripRow[]

  const tripValues = passengerTrips
    .map(item => Number(item.final_amount || 0))
    .filter(value => value > 0)

  const avgTripCost = tripValues.length > 0
    ? round(tripValues.reduce((sum, value) => sum + value, 0) / tripValues.length)
    : 15

  const dormantCapital = cards
    .filter(card =>
      card.card_type === 'reloadable' &&
      Number(card.balance || 0) > 100 &&
      (!card.last_used_at || new Date(card.last_used_at) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    )
    .map(card => ({
      id: card.id,
      cardNumber: card.card_number,
      ownerName: card.users?.full_name || null,
      email: card.users?.email || null,
      balance: Number(card.balance || 0),
      lastUsedAt: card.last_used_at
    }))

  const lowBalanceSingleUse = cards
    .filter(card => card.card_type === 'single_use' && Number(card.balance || 0) < avgTripCost)
    .map(card => ({
      id: card.id,
      cardNumber: card.card_number,
      ownerName: card.users?.full_name || null,
      balance: Number(card.balance || 0),
      avgTripCost
    }))

  const highValueAssets = cards
    .filter(card => Number(card.balance || 0) > 5000)
    .map(card => ({
      id: card.id,
      cardNumber: card.card_number,
      ownerName: card.users?.full_name || null,
      balance: Number(card.balance || 0)
    }))

  const cardTypeMap = cards.reduce((acc, card) => {
    acc.set(card.card_type, (acc.get(card.card_type) || 0) + 1)
    return acc
  }, new Map<string, number>())

  const discountBalanceMap = cards.reduce((acc, card) => {
    const key = card.discount_type && card.discount_type !== 'none' ? card.discount_type : 'regular'
    acc.set(key, (acc.get(key) || 0) + Number(card.balance || 0))
    return acc
  }, new Map<string, number>())

  const toastMessage = lowBalanceSingleUse.length > 0
    ? `${lowBalanceSingleUse.length} single-use card${lowBalanceSingleUse.length > 1 ? 's' : ''} are below the average trip cost of ₱${avgTripCost}. Suggest notifying affected users to top up or replace cards.`
    : null

  return {
    avgTripCost,
    dormantCapital,
    lowBalanceSingleUse,
    highValueAssets,
    charts: {
      cardTypeDistribution: [
        { label: 'Reloadable', value: cardTypeMap.get('reloadable') || 0 },
        { label: 'Single-use', value: cardTypeMap.get('single_use') || 0 }
      ],
      balanceByDiscount: Array.from(discountBalanceMap.entries()).map(([label, totalBalance]) => ({
        label: label === 'none' ? 'Regular' : label.charAt(0).toUpperCase() + label.slice(1),
        totalBalance: round(totalBalance)
      }))
    },
    recommendations: {
      toastMessage,
      twoFactorSuggested: highValueAssets.length > 0
    }
  }
})
