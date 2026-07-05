import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { fieldSchema, slotSchema, type Field, type Slot } from "../types";

export function useFields() {
  return useQuery({
    queryKey: ["fields"],
    queryFn: async (): Promise<Field[]> => {
      const res = await api.get("/fields", { params: { limit: 100 } });
      return fieldSchema.array().parse(res.data);
    },
  });
}

export type FieldInput = Partial<Omit<Field, "id" | "owner_id" | "rating">>;

export function useSaveField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: number; data: FieldInput }): Promise<Field> => {
      const res = id
        ? await api.patch(`/fields/${id}`, data)
        : await api.post("/fields", data);
      return fieldSchema.parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fields"] }),
  });
}

export function useDeleteField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/fields/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fields"] }),
  });
}

export function useGenerateSlots() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fieldId, days }: { fieldId: number; days: number }): Promise<Slot[]> => {
      const res = await api.post(`/fields/${fieldId}/slots/generate`, { days_ahead: days });
      return slotSchema.array().parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fields"] }),
  });
}
