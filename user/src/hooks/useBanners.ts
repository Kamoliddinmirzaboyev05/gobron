import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { bannerSchema, type Banner } from "../types";

export function useBanners() {
  return useQuery({
    queryKey: ["banners"],
    queryFn: async (): Promise<Banner[]> => {
      const res = await api.get("/banners");
      return bannerSchema.array().parse(res.data);
    },
  });
}
