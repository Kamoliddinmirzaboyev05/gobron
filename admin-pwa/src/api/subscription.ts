import api from './client'

export interface SubscriptionPayment {
  id: number
  owner_id: number
  amount: string
  receipt_image: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export async function createSubscriptionPayment(amount: number, receipt_image: string): Promise<SubscriptionPayment> {
  const { data } = await api.post<SubscriptionPayment>('/owner/subscription-payments', { amount, receipt_image })
  return data
}

export async function fetchSubscriptionPayments(): Promise<SubscriptionPayment[]> {
  const { data } = await api.get<SubscriptionPayment[]>('/owner/subscription-payments')
  return data
}
