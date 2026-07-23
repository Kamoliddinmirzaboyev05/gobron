import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../lib/api";

const intentSchema = z.object({
  id: z.number(),
  owner_id: z.number(),
  base_amount: z.number(),
  unique_amount: z.number(),
  status: z.string(),
  expires_at: z.string(),
  paid_at: z.string().nullable(),
  created_at: z.string(),
  owner_phone: z.string().nullable().optional(),
  owner_name: z.string().nullable().optional(),
  matched_message: z.string().nullable().optional(),
});

const unmatchedSchema = z.object({
  id: z.number(),
  amount: z.number().nullable(),
  raw_message: z.string(),
  reason: z.string(),
  created_at: z.string(),
});

export function usePaymentIntents(status?: string) {
  return useQuery({
    queryKey: ["admin-payment-intents", status],
    queryFn: async () => {
      const res = await api.get("/admin/payment-intents", {
        params: status ? { status } : undefined,
      });
      return intentSchema.array().parse(res.data);
    },
    refetchInterval: 10_000,
  });
}

export function useUnmatchedTransactions() {
  return useQuery({
    queryKey: ["admin-unmatched"],
    queryFn: async () => {
      const res = await api.get("/admin/unmatched-transactions");
      return unmatchedSchema.array().parse(res.data);
    },
    refetchInterval: 15_000,
  });
}
