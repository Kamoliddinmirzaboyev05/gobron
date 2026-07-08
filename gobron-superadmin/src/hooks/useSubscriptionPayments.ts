import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

export interface SubscriptionPayment {
  id: number
  owner_id: number
  owner_phone: string
  owner_name: string
  amount: string
  receipt_image: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export function useSubscriptionPayments() {
  return useQuery({
    queryKey: ['subscription-payments'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionPayment[]>('/admin/subscription-payments')
      return data
    },
  })
}

export function useApproveSubscriptionPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/admin/subscription-payments/${id}/approve`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-payments'] })
    },
  })
}

export function useRejectSubscriptionPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.post(`/admin/subscription-payments/${id}/reject`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-payments'] })
    },
  })
}
