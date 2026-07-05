import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { adminBookingSchema, type AdminBooking, type BookingStatus } from "../types";

export function useBookings(status?: BookingStatus) {
  return useQuery({
    queryKey: ["admin-bookings", status ?? "all"],
    queryFn: async (): Promise<AdminBooking[]> => {
      const res = await api.get("/admin/bookings", {
        params: { status_filter: status, limit: 200 },
      });
      return adminBookingSchema.array().parse(res.data);
    },
  });
}
