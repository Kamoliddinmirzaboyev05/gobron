import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { slotSchema, type Slot } from "../types";

/**
 * Available slots for a field on a given date. Polls every 15s so availability
 * stays fresh while the user is choosing (real-time-ish without WebSockets).
 */
export function useSlots(fieldId: number, date: string) {
  return useQuery({
    queryKey: ["slots", fieldId, date],
    queryFn: async (): Promise<Slot[]> => {
      const res = await api.get(`/fields/${fieldId}/slots`, {
        params: { on_date: date, available_only: true },
      });
      return slotSchema.array().parse(res.data);
    },
    refetchInterval: 15_000,
    enabled: !!fieldId && !!date,
    // Switching field/date keeps the old grid on screen until the new one
    // lands, instead of collapsing to a skeleton and snapping the sheet's
    // height around. isLoading then only fires on the very first fetch.
    placeholderData: keepPreviousData,
  });
}
