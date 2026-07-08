import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { fieldOwnerSchema, type FieldOwner } from "../types";

export function useFieldOwners() {
  return useQuery({
    queryKey: ["field-owners"],
    queryFn: async (): Promise<FieldOwner[]> => {
      const res = await api.get("/admin/field-owners", { params: { limit: 100 } });
      return fieldOwnerSchema.array().parse(res.data);
    },
  });
}

export type FieldOwnerInput = Partial<Pick<FieldOwner, "business_name" | "contact_phone">> & {
  user_id?: number;
};

export function useSaveFieldOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id?: number; data: FieldOwnerInput }): Promise<FieldOwner> => {
      const res = id
        ? await api.patch(`/admin/field-owners/${id}`, data)
        : await api.post("/admin/field-owners", data);
      return fieldOwnerSchema.parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field-owners"] }),
  });
}

export function useVerifyFieldOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/field-owners/${id}/verify`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field-owners"] }),
  });
}

export function useDeleteFieldOwner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/field-owners/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field-owners"] }),
  });
}

export function useToggleFieldOwnerActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/admin/field-owners/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["field-owners"] }),
  });
}
