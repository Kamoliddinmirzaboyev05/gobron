import { z } from "zod";

export const tokenPairSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.string().default("bearer"),
  expires_in: z.number().optional(),
});

export const userSchema = z.object({
  id: z.number(),
  telegram_id: z.number().nullable(),
  phone: z.string().nullable(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  region: z.string().nullable(),
  city: z.string().nullable(),
  role: z.enum(["player", "field_owner", "superadmin"]),
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
  images: z.array(z.string()).default([]),
  amenities: z.array(z.string()).optional().default([]),
  surface_type: z.string().optional().default("open"),
  size: z.string().nullable().optional().default(null),
  phone: z.string().nullable().optional().default(null),
  rating: z.number(),
  opening_time: z.string(),
  closing_time: z.string(),
  slot_duration: z.number(),
  working_days: z.array(z.number()),
  price_per_slot: z.coerce.number(),
  peak_start_time: z.string().nullable(),
  peak_price_multiplier: z.coerce.number(),
  is_active: z.boolean(),
});

export const slotSchema = z.object({
  id: z.number(),
  field_id: z.number(),
  slot_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.enum(["available", "booked", "blocked"]),
  price: z.coerce.number(),
});

export const bookingStatusEnum = z.enum(["pending", "confirmed", "cancelled", "completed"]);

export const adminBookingSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  slot_id: z.number(),
  status: bookingStatusEnum,
  total_price: z.coerce.number(),
  recurrence_type: z.enum(["once", "daily", "weekly"]),
  recurrence_group_id: z.string().nullable(),
  created_at: z.string(),
  slot: slotSchema.nullable().optional(),
  user: z
    .object({
      id: z.number(),
      phone: z.string().nullable(),
      first_name: z.string().nullable(),
      last_name: z.string().nullable(),
    })
    .nullable()
    .optional(),
});

export const dashboardSchema = z.object({
  total_revenue: z.coerce.number(),
  total_bookings: z.number(),
  active_fields: z.number(),
  occupancy_rate: z.number(),
  revenue_series: z.array(
    z.object({ day: z.string(), revenue: z.coerce.number(), bookings: z.number() }),
  ),
  popular_slots: z.array(z.object({ start_time: z.string(), bookings: z.number() })),
});

export const fieldOwnerSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  business_name: z.string(),
  contact_phone: z.string().nullable(),
  is_verified: z.boolean(),
  created_at: z.string(),
  full_name: z.string().optional().default(""),
  phone: z.string().nullable().optional().default(null),
  is_blocked: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
  fields_count: z.number().optional().default(0),
  active_fields_count: z.number().optional().default(0),
  field_names: z.array(z.string()).optional().default([]),
});

export const broadcastAudienceSchema = z.enum(["bot_users", "field_owners", "all"]);

export const broadcastSchema = z.object({
  id: z.number(),
  text: z.string(),
  image_url: z.string().nullable(),
  audience: broadcastAudienceSchema,
  status: z.enum(["draft", "sending", "sent", "failed"]),
  sent_count: z.number(),
  failed_count: z.number(),
  created_at: z.string(),
  sent_at: z.string().nullable(),
});

export const bannerSchema = z.object({
  id: z.number(),
  image_url: z.string(),
  title: z.string().nullable().optional().default(null),
  description: z.string().nullable().optional().default(null),
  link: z.string().nullable(),
  sort_order: z.number(),
  is_active: z.boolean(),
  created_at: z.string(),
});

export type TokenPair = z.infer<typeof tokenPairSchema>;
export type User = z.infer<typeof userSchema>;
export type Role = User["role"];
export type Field = z.infer<typeof fieldSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type FieldOwner = z.infer<typeof fieldOwnerSchema>;
export type AdminBooking = z.infer<typeof adminBookingSchema>;
export type BookingStatus = z.infer<typeof bookingStatusEnum>;
export type Dashboard = z.infer<typeof dashboardSchema>;
export type Broadcast = z.infer<typeof broadcastSchema>;
export type BroadcastAudience = z.infer<typeof broadcastAudienceSchema>;
export type Banner = z.infer<typeof bannerSchema>;
