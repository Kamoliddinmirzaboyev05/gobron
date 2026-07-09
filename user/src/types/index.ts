import { z } from "zod";

// Schemas mirror the FastAPI response models so we validate at the boundary.

export const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string().default("bearer"),
});

export const userSchema = z.object({
  id: z.number(),
  telegram_id: z.number().nullable(),
  phone: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  role: z.string(),
  is_active: z.boolean(),
  is_blocked: z.boolean(),
  is_onboarded: z.boolean(),
  full_name: z.string(),
  created_at: z.string(),
});

export const fieldSchema = z.object({
  id: z.number(),
  owner_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  images: z.array(z.string()),
  rating: z.number(),
  opening_time: z.string(),
  closing_time: z.string(),
  slot_duration: z.number(),
  working_days: z.array(z.number()),
  price_per_slot: z.coerce.number(),
  peak_start_time: z.string().nullable(),
  peak_price_multiplier: z.coerce.number(),
  is_active: z.boolean(),
  // Bookable days ahead, counting today. 1 = today only.
  booking_window_days: z.number(),
});

export const slotStatus = z.enum(["available", "booked", "blocked"]);

export const slotSchema = z.object({
  id: z.number(),
  field_id: z.number(),
  slot_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: slotStatus,
  price: z.coerce.number(),
});

export const bookingStatus = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "completed",
]);

export const bookingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  slot_id: z.number(),
  status: bookingStatus,
  total_price: z.coerce.number(),
  recurrence_type: z.enum(["once", "daily", "weekly"]),
  recurrence_group_id: z.string().nullable(),
  created_at: z.string(),
  slot: slotSchema.nullable().optional(),
});

export const bookingResultSchema = z.object({
  recurrence_group_id: z.string().nullable(),
  bookings: z.array(bookingSchema),
  total_price: z.coerce.number(),
});

export const bannerSchema = z.object({
  id: z.number(),
  image_url: z.string(),
  link: z.string().nullable(),
  sort_order: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type TokenPair = z.infer<typeof tokenPairSchema>;
export type User = z.infer<typeof userSchema>;
export type Field = z.infer<typeof fieldSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type Booking = z.infer<typeof bookingSchema>;
export type BookingResult = z.infer<typeof bookingResultSchema>;
export type RecurrenceType = Booking["recurrence_type"];
export type Banner = z.infer<typeof bannerSchema>;
