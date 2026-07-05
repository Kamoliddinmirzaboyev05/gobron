import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { userSchema, type Role, type User } from "../types";

export interface UserFilters {
  role?: Role;
  search?: string;
  blocked?: boolean;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ["users", filters],
    queryFn: async (): Promise<User[]> => {
      const res = await api.get("/admin/users", { params: filters });
      return userSchema.array().parse(res.data);
    },
  });
}

export function useUserActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const block = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/block`),
    onSuccess: invalidate,
  });
  const unblock = useMutation({
    mutationFn: (id: number) => api.post(`/admin/users/${id}/unblock`),
    onSuccess: invalidate,
  });
  const setRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: Role }) =>
      api.patch(`/admin/users/${id}/role`, null, { params: { role } }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/admin/users/${id}`),
    onSuccess: invalidate,
  });
  return { block, unblock, setRole, remove };
}
