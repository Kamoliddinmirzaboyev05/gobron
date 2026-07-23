import api from './client'

export interface PaymentIntent {
  id: number
  owner_id: number
  base_amount: number
  unique_amount: number
  status: 'pending' | 'paid' | 'expired' | 'expired_paid'
  expires_at: string
  paid_at: string | null
  created_at: string
}

export interface PaymentIntentStart {
  intent: PaymentIntent
  card_number: string
  card_holder: string
  bank_name: string | null
  ttl_seconds: number
}

export async function startPaymentIntent(baseAmount?: number): Promise<PaymentIntentStart> {
  const { data } = await api.post<PaymentIntentStart>('/owner/payment-intents', {
    base_amount: baseAmount ?? null,
  })
  return data
}

export async function fetchActivePaymentIntent(): Promise<PaymentIntentStart | null> {
  const { data } = await api.get<PaymentIntentStart | null>('/owner/payment-intents/active')
  return data
}

export async function fetchPaymentIntents(): Promise<PaymentIntent[]> {
  const { data } = await api.get<PaymentIntent[]>('/owner/payment-intents')
  return data
}
