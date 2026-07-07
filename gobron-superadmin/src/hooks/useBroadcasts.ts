import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { broadcastSchema, type Broadcast, type BroadcastAudience } from "../types";

export function useBroadcasts() {
  return useQuery({
    queryKey: ["broadcasts"],
    refetchInterval: 5000, // reflect delivery progress
    queryFn: async (): Promise<Broadcast[]> => {
      const res = await api.get("/admin/broadcasts");
      return broadcastSchema.array().parse(res.data);
    },
  });
}

export function useCreateBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      text: string;
      image_url?: string | null;
      audience: BroadcastAudience;
    }): Promise<Broadcast> => {
      const res = await api.post("/admin/broadcasts", data);
      return broadcastSchema.parse(res.data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["broadcasts"] }),
  });
}
