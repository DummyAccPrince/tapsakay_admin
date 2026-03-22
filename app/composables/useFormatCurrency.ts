export const useFormatCurrency = () => {
  const formatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  const formatCurrency = (value: number | string | null | undefined) => {
    const numericValue = typeof value === 'string' ? Number(value) : value

    if (numericValue === null || numericValue === undefined || Number.isNaN(numericValue)) {
      return '₱0.00'
    }

    return formatter.format(numericValue)
  }

  return {
    formatCurrency
  }
}
