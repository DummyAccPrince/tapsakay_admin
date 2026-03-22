export interface DormantCapitalCard {
  id: string
  cardNumber: string
  ownerName: string | null
  email: string | null
  balance: number
  lastUsedAt: string | null
}

export interface LowBalanceCard {
  id: string
  cardNumber: string
  ownerName: string | null
  balance: number
  avgTripCost: number
}

export interface HighValueAsset {
  id: string
  cardNumber: string
  ownerName: string | null
  balance: number
}

export interface CardTypeDistributionPoint {
  label: string
  value: number
}

export interface DiscountBalancePoint {
  label: string
  totalBalance: number
}

export interface CardFinancialAuditResponse {
  avgTripCost: number
  dormantCapital: DormantCapitalCard[]
  lowBalanceSingleUse: LowBalanceCard[]
  highValueAssets: HighValueAsset[]
  charts: {
    cardTypeDistribution: CardTypeDistributionPoint[]
    balanceByDiscount: DiscountBalancePoint[]
  }
  recommendations: {
    toastMessage: string | null
    twoFactorSuggested: boolean
  }
}

export const useCardFinancialAudit = () => {
  const { data, pending, error, refresh } = useFetch<CardFinancialAuditResponse>('/api/cards/financial-audit', {
    key: 'card-financial-audit',
    default: () => ({
      avgTripCost: 15,
      dormantCapital: [],
      lowBalanceSingleUse: [],
      highValueAssets: [],
      charts: {
        cardTypeDistribution: [],
        balanceByDiscount: []
      },
      recommendations: {
        toastMessage: null,
        twoFactorSuggested: false
      }
    })
  })

  return {
    audit: computed(() => data.value),
    pending,
    error,
    refresh
  }
}
