import type { SupabaseClient } from "@supabase/supabase-js";

export type HousingType = "rumah" | "apartemen" | "kantor" | "kos" | "lainnya";

export type RecurringFrequency = "one_time" | "weekly" | "biweekly" | "monthly";

export type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  whats_included?: string[] | null;
  whats_excluded?: string[] | null;
  badge?: string | null;
  service_tier?: string | null;
};

export type AddOn = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  icon_key: string | null;
};

export type CustomerAddress = {
  id: string;
  customer_id: string;
  label: string;
  full_address: string;
  phone: string;
  notes: string | null;
  is_default: boolean;
  created_at?: string;
};

export type BookingReview = {
  id: string;
  booking_id: string;
  customer_id: string;
  staff_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  customer?: { name: string } | null;
};

export type NotificationItem = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type BookingMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender?: { name: string; role: string } | null;
};

export const bookingStatuses: Record<string, string> = {
  pending: "Menunggu Konfirmasi",
  confirmed: "Dikonfirmasi",
  assigned: "Petugas Ditugaskan",
  in_progress: "Sedang Dikerjakan",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export const housingTypes: Record<HousingType, { label: string; desc: string }> = {
  rumah: { label: "Rumah Tapak", desc: "Lantai 1-2, ruang tamu, kamar tidur, dapur" },
  apartemen: { label: "Apartemen", desc: "Studio, 1BR, 2BR, atau penthouse" },
  kos: { label: "Kos / Studio", desc: "Kamar kos pribadi dan kamar mandi dalam" },
  kantor: { label: "Kantor / Ruko", desc: "Ruang kerja, meja, meeting room, pantry" },
  lainnya: { label: "Lainnya", desc: "Hunian atau properti khusus lainnya" },
};

export const roomOptions = [
  { value: "studio", label: "Studio / 1 Ruangan", estimate: "Cocok untuk ruangan hingga 35 m²" },
  { value: "2_rooms", label: "2 Kamar / Ruangan", estimate: "Cocok untuk hunian 35–65 m²" },
  { value: "3_rooms", label: "3 Kamar / Ruangan", estimate: "Cocok untuk hunian 65–100 m²" },
  { value: "4_plus_rooms", label: "4+ Kamar / Ruangan", estimate: "Cocok untuk hunian > 100 m²" },
];

export const durationOptions = [
  { hours: 2, label: "2 Jam", desc: "Pembersihan rutin standar (1-2 ruangan)" },
  { hours: 3, label: "3 Jam", desc: "Pembersihan lebih detail & dapur (2-3 ruangan)" },
  { hours: 4, label: "4 Jam", desc: "Pembersihan menyeluruh rumah (3-4 ruangan)" },
  { hours: 5, label: "5 Jam", desc: "Pembersihan komprehensif seluruh ruangan" },
];

export const recurringOptions: Record<RecurringFrequency, { label: string; desc: string; discountRate: number; discountBadge?: string }> = {
  one_time: { label: "Sekali Pesan", desc: "Pembersihan sekali kunjungan tanpa komitmen rutin", discountRate: 0 },
  weekly: { label: "Setiap Minggu", desc: "Rutin 1x setiap minggu di hari yang sama", discountRate: 0.1, discountBadge: "Hemat 10%" },
  biweekly: { label: "2 Minggu Sekali", desc: "Rutin setiap 2 minggu untuk kebersihan terjaga", discountRate: 0.05, discountBadge: "Hemat 5%" },
  monthly: { label: "Setiap Bulan", desc: "Kunjungan rutin sebulan sekali untuk deep refresh", discountRate: 0.03, discountBadge: "Hemat 3%" },
};

export const standardTimeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
];

export function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function jakartaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export async function getActiveServices(supabase: SupabaseClient) {
  return supabase
    .from("services")
    .select("id, name, description, price, duration_minutes, whats_included, whats_excluded, badge, service_tier")
    .eq("is_active", true)
    .order("price", { ascending: true });
}

export async function getServiceById(supabase: SupabaseClient, id: string) {
  return supabase
    .from("services")
    .select("id, name, description, price, duration_minutes, whats_included, whats_excluded, badge, service_tier, is_active")
    .eq("id", id)
    .maybeSingle();
}

export async function getActiveAddOns(supabase: SupabaseClient) {
  return supabase
    .from("add_ons")
    .select("id, name, description, price, duration_minutes, is_active, icon_key")
    .eq("is_active", true)
    .order("price", { ascending: true });
}

export async function getCustomerAddresses(supabase: SupabaseClient, customerId: string) {
  return supabase
    .from("customer_addresses")
    .select("id, customer_id, label, full_address, phone, notes, is_default")
    .eq("customer_id", customerId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function getCustomerFavoriteCleaners(supabase: SupabaseClient, customerId: string) {
  return supabase
    .from("favorite_cleaners")
    .select("staff_id, profiles!favorite_cleaners_staff_id_fkey(id, name, phone)")
    .eq("customer_id", customerId);
}

export async function getNotifications(supabase: SupabaseClient, userId: string) {
  return supabase
    .from("notifications")
    .select("id, user_id, title, message, link, type, is_read, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
}

export async function getUnreadNotificationsCount(supabase: SupabaseClient, userId: string) {
  const result = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return result.count ?? 0;
}

/**
 * Server-side calculation of booking price breakdown.
 * Formula mirrors database trigger for complete consistency.
 */
export function calculateServerPriceBreakdown({
  baseCatalogPrice,
  durationHours = 2,
  selectedAddOns = [],
  recurring = "one_time",
}: {
  baseCatalogPrice: number;
  durationHours?: number;
  selectedAddOns?: Array<{ id: string; price: number; name?: string }>;
  recurring?: RecurringFrequency;
}) {
  let hoursFactor = 1.0;
  if (durationHours > 2) {
    hoursFactor = 1.0 + (durationHours - 2) * 0.35;
  }
  const basePrice = Math.round(baseCatalogPrice * hoursFactor);
  const addOnsPrice = selectedAddOns.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const subtotal = basePrice + addOnsPrice;

  const recurringConfig = recurringOptions[recurring] || recurringOptions.one_time;
  const discountAmount = Math.round(subtotal * recurringConfig.discountRate);
  const totalPrice = Math.max(0, subtotal - discountAmount);

  return {
    baseCatalogPrice,
    durationHours,
    basePrice,
    addOnsPrice,
    subtotal,
    discountAmount,
    discountLabel: recurringConfig.discountBadge,
    totalPrice,
  };
}
