import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { bannerSchema, type Banner } from "../types";

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: async (): Promise<Banner[]> => {
      const res = await api.get("/admin/banners");
      return bannerSchema.array().parse(res.data);
    },
  });
}

export type BannerInput = {
  image_url: string;
  title?: string | null;
  description?: string | null;
  link?: string | null;
  sort_order?: number;
  is_active?: boolean;
};

export function useCreateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: BannerInput): Promise<Banner> => {
      const res = await api.post("/admin/banners", data);
      return bannerSchema.parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
}

export function useUpdateBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<BannerInput>;
    }): Promise<Banner> => {
      const res = await api.patch(`/admin/banners/${id}`, data);
      return bannerSchema.parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
}

export function useDeleteBanner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/admin/banners/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["banners"] }),
  });
}
