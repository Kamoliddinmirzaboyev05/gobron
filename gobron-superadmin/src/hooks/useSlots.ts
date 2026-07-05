import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { slotSchema, type Slot } from "../types";

export function useFieldSlots(fieldId: number) {
  return useQuery({
    queryKey: ["fields", fieldId, "slots"],
    queryFn: async (): Promise<Slot[]> => {
      const res = await api.get(`/fields/${fieldId}/slots`);
      return slotSchema.array().parse(res.data);
    },
  });
}

export function useAddManualSlot(fieldId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { slot_date: string; start_time: string; end_time: string; price?: number }) => {
      const res = await api.post(`/fields/${fieldId}/slots`, data);
      return slotSchema.parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fields", fieldId, "slots"] }),
  });
}

export function useToggleSlotBlock(fieldId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slot: Slot) => api.post(`/slots/${slot.id}/${slot.status === "blocked" ? "unblock" : "block"}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fields", fieldId, "slots"] }),
  });
}
