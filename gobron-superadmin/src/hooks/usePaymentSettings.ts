import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../lib/api";

export const paymentSettingsSchema = z.object({
  card_number: z.string(),
  card_holder: z.string(),
  bank_name: z.string().nullable(),
  subscription_amount: z.coerce.number().default(50000),
  telegram_api_id: z.string().nullable().optional().default(null),
  telegram_api_hash: z.string().nullable().optional().default(null),
  telegram_phone: z.string().nullable().optional().default(null),
  telegram_2fa_password: z.string().nullable().optional().default(null),
  telegram_session: z.string().nullable().optional().default(null),
  humo_bot_username: z.string().nullable().optional().default("HUMOcardbot"),
  has_session: z.boolean().optional().default(false),
});

export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

export function usePaymentSettings() {
  return useQuery({
    queryKey: ["payment-settings"],
    queryFn: async (): Promise<PaymentSettings> => {
      const res = await api.get("/payment-settings");
      return paymentSettingsSchema.parse(res.data);
    },
  });
}

export function useSavePaymentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PaymentSettings> & {
      card_number: string;
      card_holder: string;
      subscription_amount: number;
    }): Promise<PaymentSettings> => {
      const res = await api.put("/payment-settings", data);
      return paymentSettingsSchema.parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payment-settings"] }),
  });
}
