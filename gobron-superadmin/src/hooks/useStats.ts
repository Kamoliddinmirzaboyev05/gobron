import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { dashboardSchema, type Dashboard } from "../types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<Dashboard> => {
      const res = await api.get("/stats/dashboard");
      return dashboardSchema.parse(res.data);
    },
  });
}
