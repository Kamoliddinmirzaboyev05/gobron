const TRIAL_AND_BILLING_PERIOD_DAYS = 30

export interface SubscriptionStatus {
  isTrial: boolean
  daysLeft: number
  totalDays: number
  nextPaymentDate: Date
}

/**
 * First 30 days after signup are free; every following 30-day window is a
 * billing period. ponytail: no stored billing-cycle start, so periods are
 * just createdAt + N*30 days — fine while payment is display-only, revisit
 * once real payment dates need to anchor the cycle.
 */
export function getSubscriptionStatus(createdAt: string): SubscriptionStatus {
  const createdMs = new Date(createdAt).getTime()
  const daysSinceSignup = Math.floor((Date.now() - createdMs) / 86400000)
  const periodIndex = Math.floor(daysSinceSignup / TRIAL_AND_BILLING_PERIOD_DAYS)
  const daysIntoPeriod = daysSinceSignup % TRIAL_AND_BILLING_PERIOD_DAYS
  const periodEndMs = createdMs + (periodIndex + 1) * TRIAL_AND_BILLING_PERIOD_DAYS * 86400000
  return {
    isTrial: periodIndex === 0,
    daysLeft: TRIAL_AND_BILLING_PERIOD_DAYS - daysIntoPeriod,
    totalDays: TRIAL_AND_BILLING_PERIOD_DAYS,
    nextPaymentDate: new Date(periodEndMs),
  }
}
