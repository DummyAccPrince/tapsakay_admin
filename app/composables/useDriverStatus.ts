export const useDriverStatus = () => {
  /**
   * Calculate days until license expiry
   */
  const getDaysUntilExpiry = (expiryDate: string): number => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    expiry.setHours(0, 0, 0, 0)
    
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Get license expiry status with styling information
   */
  const getLicenseExpiryStatus = (expiryDate: string) => {
    const daysRemaining = getDaysUntilExpiry(expiryDate)
    
    if (daysRemaining < 0) {
      return {
        status: 'expired',
        daysRemaining,
        label: 'Expired',
        badgeClass: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
        iconClass: 'text-red-600',
        textClass: 'text-red-700 font-semibold',
        urgent: true,
        message: `Expired ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} ago`
      }
    }
    
    if (daysRemaining === 0) {
      return {
        status: 'expires-today',
        daysRemaining,
        label: 'Expires Today',
        badgeClass: 'bg-red-50 text-red-700 ring-1 ring-red-600/20',
        iconClass: 'text-red-600',
        textClass: 'text-red-700 font-semibold',
        urgent: true,
        message: 'Expires today'
      }
    }
    
    if (daysRemaining <= 7) {
      return {
        status: 'critical',
        daysRemaining,
        label: `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left`,
        badgeClass: 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20',
        iconClass: 'text-orange-600',
        textClass: 'text-orange-700 font-semibold',
        urgent: true,
        message: `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
      }
    }
    
    if (daysRemaining <= 30) {
      return {
        status: 'warning',
        daysRemaining,
        label: `${daysRemaining} days left`,
        badgeClass: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
        iconClass: 'text-amber-600',
        textClass: 'text-amber-700 font-medium',
        urgent: false,
        message: `Expires in ${daysRemaining} days`
      }
    }
    
    return {
      status: 'valid',
      daysRemaining,
      label: 'Valid',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
      iconClass: 'text-emerald-600',
      textClass: 'text-slate-600',
      urgent: false,
      message: `Valid for ${daysRemaining} days`
    }
  }

  /**
   * Get duty status styling
   */
  const getDutyStatusStyle = (isOnDuty: boolean) => {
    if (isOnDuty) {
      return {
        label: 'On Duty',
        badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        showPulse: true,
        pulseClass: 'bg-emerald-400'
      }
    }
    
    return {
      label: 'Off Duty',
      badgeClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-300/50',
      showPulse: false,
      pulseClass: ''
    }
  }

  /**
   * Get bus assignment status
   */
  const getBusAssignmentStatus = (hasAssignment: boolean) => {
    if (hasAssignment) {
      return {
        assigned: true,
        buttonClass: 'text-slate-700 hover:text-slate-900',
        iconClass: 'text-blue-600'
      }
    }
    
    return {
      assigned: false,
      buttonClass: 'border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50',
      iconClass: 'text-slate-400'
    }
  }

  return {
    getDaysUntilExpiry,
    getLicenseExpiryStatus,
    getDutyStatusStyle,
    getBusAssignmentStatus
  }
}
