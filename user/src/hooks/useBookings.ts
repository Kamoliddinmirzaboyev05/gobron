import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  bookingResultSchema,
  bookingSchema,
  type Booking,
  type BookingResult,
  type RecurrenceType,
} from "../types";

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: async (): Promise<Booking[]> => {
      const res = await api.get("/bookings");
      return bookingSchema.array().parse(res.data);
    },
  });
}

export interface CreateBookingInput {
  slot_ids: number[];
  recurrence_type: RecurrenceType;
  occurrences: number;
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBookingInput): Promise<BookingResult> => {
      const res = await api.post("/bookings", input);
      return bookingResultSchema.parse(res.data);
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
      void input;
    },
  });
}

export function useRateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, rating }: { bookingId: number; rating: number }) => {
      await api.post(`/bookings/${bookingId}/rate`, { rating });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["fields"] });
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (bookingId: number): Promise<Booking> => {
      const res = await api.post(`/bookings/${bookingId}/cancel`);
      return bookingSchema.parse(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
