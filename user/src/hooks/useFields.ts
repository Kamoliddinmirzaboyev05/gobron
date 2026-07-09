import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { fieldSchema, type Field } from "../types";

export type FieldSort = "rating" | "cheapest" | "popular";

export interface FieldFilters {
  search?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  available_today?: boolean;
  sort?: FieldSort;
}

export function useFields(filters: FieldFilters = {}) {
  return useQuery({
    queryKey: ["fields", filters],
    queryFn: async (): Promise<Field[]> => {
      const res = await api.get("/fields", { params: filters });
      return fieldSchema.array().parse(res.data);
    },
  });
}

export function useField(id: number) {
  return useQuery({
    queryKey: ["field", id],
    queryFn: async (): Promise<Field> => {
      const res = await api.get(`/fields/${id}`);
      return fieldSchema.parse(res.data);
    },
  });
}
