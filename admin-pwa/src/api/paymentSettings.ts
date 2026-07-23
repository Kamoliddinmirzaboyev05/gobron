import api from './client'

export interface PaymentSettings {
  card_number: string
  card_holder: string
  bank_name: string | null
  subscription_amount?: number | string
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const { data } = await api.get<PaymentSettings>('/payment-settings')
  return data
}
