"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "../../lib/auth/session";
import {
  calculateServerPriceBreakdown,
  getActiveAddOns,
  getActiveServices,
  jakartaToday,
  standardTimeSlots,
  type HousingType,
  type RecurringFrequency,
} from "../../lib/bookings";

export type BookingFormState = {
  error?: string;
  booking?: {
    id: string;
    serviceName: string;
    bookingDate: string;
    startTime: string;
    durationHours?: number;
    address?: string;
    totalPrice: number;
    status: string;
  };
};

export async function createBooking(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const current = await requireRole(["customer"]);

  const serviceId = String(formData.get("service_id") ?? "").trim();
  const housingType = String(formData.get("housing_type") ?? "").trim() as HousingType;
  const rawRooms = formData.getAll("rooms").map(String).filter(Boolean);
  const roomCount = rawRooms.length > 0 ? rawRooms.join(", ") : String(formData.get("room_count") ?? "").trim();
  const durationHours = Number(formData.get("duration_hours") ?? 2);
  const bookingDate = String(formData.get("booking_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const addressLabel = String(formData.get("address_label") ?? "Alamat Utama").trim();
  const customerPhone = String(formData.get("customer_phone") ?? current.profile.phone ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const recurring = (String(formData.get("recurring_frequency") ?? "one_time").trim()) as RecurringFrequency;
  const preferredStaffId = String(formData.get("preferred_staff_id") ?? "").trim();
  const saveAddress = formData.get("save_address") === "on";

  // Raw add_on IDs parsed from form data (multiple entries or comma-separated)
  const rawAddOnIds = formData.getAll("add_ons").map(String).filter(Boolean);

  // 1. Validations
  if (!serviceId) return { error: "Silakan pilih layanan terlebih dahulu." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || bookingDate < jakartaToday()) {
    return { error: "Pilih tanggal layanan hari ini atau setelahnya." };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { error: "Pilih waktu mulai yang valid." };
  }

  // Business check: Operating hours 08:00 - 17:00 WIB
  const [hour] = startTime.split(":").map(Number);
  if (hour < 8 || hour > 17) {
    return { error: "Jam operasional layanan JoCleanCare adalah pukul 08:00 hingga 17:00 WIB." };
  }

  if (address.length < 8 || address.length > 500) {
    return { error: "Alamat wajib diisi lengkap (8–500 karakter)." };
  }
  if (notes.length > 1000) return { error: "Catatan maksimal 1.000 karakter." };
  if (!customerPhone || customerPhone.length < 8) {
    return { error: "Nomor telepon aktif wajib diisi untuk konfirmasi kunjungan." };
  }

  // 2. Fetch active service details from DB
  const { data: services, error: serviceError } = await getActiveServices(current.supabase);
  if (serviceError) return { error: "Layanan belum dapat dimuat. Coba beberapa saat lagi." };
  const service = (services as Array<{ id: string; name: string; price: number }> | null)?.find(
    (item) => item.id === serviceId,
  );
  if (!service) return { error: "Layanan tidak tersedia. Silakan pilih layanan aktif." };

  // 3. Fetch active add-ons from DB and calculate verified server-side price
  const { data: dbAddOns } = await getActiveAddOns(current.supabase);
  const validAddOns = (dbAddOns ?? []).filter((item) => rawAddOnIds.includes(item.id));

  const pricing = calculateServerPriceBreakdown({
    baseCatalogPrice: Number(service.price),
    durationHours: durationHours >= 2 && durationHours <= 6 ? durationHours : 2,
    selectedAddOns: validAddOns.map((item) => ({ id: item.id, price: Number(item.price), name: item.name })),
    recurring,
  });

  // 4. Smart availability check (prevent double booking / full slot)
  const { count: staffCount } = await current.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "staff");

  const totalStaff = staffCount ?? 0;
  if (totalStaff > 0) {
    const { count: busyCount } = await current.supabase
      .from("staff_schedules")
      .select("id", { count: "exact", head: true })
      .eq("scheduled_date", bookingDate)
      .eq("start_time", startTime)
      .neq("status", "cancelled");

    if (busyCount != null && busyCount >= totalStaff) {
      return {
        error: "Jadwal pada jam tersebut sudah penuh. Silakan pilih alternatif waktu lain (misal: 09:00, 11:00, atau 14:00 WIB).",
      };
    }
  }

  // 5. Insert booking with calculated server-side prices
  const { data: booking, error: insertError } = await current.supabase
    .from("bookings")
    .insert({
      customer_id: current.user.id,
      service_id: service.id,
      booking_date: bookingDate,
      start_time: startTime,
      address,
      notes: notes || null,
      total_price: pricing.totalPrice,
      base_price: pricing.basePrice,
      add_ons_price: pricing.addOnsPrice,
      duration_hours: pricing.durationHours,
      housing_type: ["rumah", "apartemen", "kantor", "kos", "lainnya"].includes(housingType) ? housingType : "rumah",
      room_count: roomCount || null,
      recurring_frequency: recurring,
      address_label: addressLabel || "Alamat",
      customer_phone: customerPhone,
      preferred_staff_id: /^[0-9a-f-]{36}$/i.test(preferredStaffId) ? preferredStaffId : null,
      status: "pending",
    })
    .select("id, booking_date, start_time, total_price, status")
    .single();

  if (insertError || !booking) {
    return { error: `Booking belum berhasil dibuat: ${insertError?.message || "Periksa data lalu coba lagi."}` };
  }

  // 6. Insert booking add-ons if any
  if (validAddOns.length > 0) {
    const addOnRows = validAddOns.map((item) => ({
      booking_id: booking.id,
      add_on_id: item.id,
      unit_price: Number(item.price),
      quantity: 1,
    }));
    await current.supabase.from("booking_add_ons").insert(addOnRows);
  }

  // 7. Optionally save address to customer address book
  if (saveAddress) {
    await current.supabase.from("customer_addresses").insert({
      customer_id: current.user.id,
      label: addressLabel || "Alamat Utama",
      full_address: address,
      phone: customerPhone,
      notes: notes || null,
      is_default: false,
    });
  }

  // 8. Create In-App Notification for customer
  await current.supabase.from("notifications").insert({
    user_id: current.user.id,
    title: "Booking Berhasil Dibuat",
    message: `Permintaan ${service.name} untuk tanggal ${bookingDate} pukul ${startTime} WIB telah kami terima dan menunggu konfirmasi.`,
    link: `/orders/${booking.id}`,
    type: "booking",
  });

  revalidatePath("/dashboard");
  revalidatePath("/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  return {
    booking: {
      id: booking.id,
      serviceName: service.name,
      bookingDate: booking.booking_date,
      startTime: String(booking.start_time).slice(0, 5),
      durationHours: pricing.durationHours,
      address,
      totalPrice: Number(booking.total_price),
      status: booking.status,
    },
  };
}

export async function cancelBookingAction(formData: FormData) {
  const current = await requireRole(["customer", "admin"]);
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const reason = String(formData.get("cancellation_reason") ?? "").trim();
  const backUrl = `/orders/${bookingId}`;

  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    redirect(`/orders?error=${encodeURIComponent("ID pesanan tidak valid.")}`);
  }

  let query = current.supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "Dibatalkan oleh pelanggan.",
    })
    .eq("id", bookingId);

  // If customer, only allow cancelling their own pending or confirmed bookings
  if (current.profile.role === "customer") {
    query = query.eq("customer_id", current.user.id).in("status", ["pending", "confirmed"]);
  }

  const { error } = await query;
  if (error) {
    redirect(`${backUrl}?error=${encodeURIComponent(`Pembatalan gagal: ${error.message}`)}`);
  }

  // Create notification
  await current.supabase.from("notifications").insert({
    user_id: current.user.id,
    title: "Pesanan Dibatalkan",
    message: `Pesanan #${bookingId.slice(0, 8)} telah berhasil dibatalkan.`,
    link: `/orders/${bookingId}`,
    type: "status",
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${bookingId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin/orders");
  redirect(`${backUrl}?ok=${encodeURIComponent("Pesanan berhasil dibatalkan.")}`);
}

export async function submitReviewAction(formData: FormData) {
  const current = await requireRole(["customer"]);
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const staffId = String(formData.get("staff_id") ?? "").trim() || null;
  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim();
  const backUrl = `/orders/${bookingId}`;

  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    redirect(`/orders?error=${encodeURIComponent("Pesanan tidak valid.")}`);
  }
  if (!rating || rating < 1 || rating > 5) {
    redirect(`${backUrl}?error=${encodeURIComponent("Beri rating 1 sampai 5 bintang.")}`);
  }
  if (comment.length > 1000) {
    redirect(`${backUrl}?error=${encodeURIComponent("Ulasan maksimal 1.000 karakter.")}`);
  }

  const { error } = await current.supabase.from("booking_reviews").insert({
    booking_id: bookingId,
    customer_id: current.user.id,
    staff_id: staffId && /^[0-9a-f-]{36}$/i.test(staffId) ? staffId : null,
    rating,
    comment: comment || null,
  });

  if (error) {
    redirect(`${backUrl}?error=${encodeURIComponent("Gagal menyimpan ulasan. Pastikan pesanan sudah selesai dan belum diulas sebelumnya.")}`);
  }

  revalidatePath(`/orders/${bookingId}`);
  redirect(`${backUrl}?ok=${encodeURIComponent("Ulasan berhasil disimpan. Terima kasih!")}`);
}

export async function sendBookingMessageAction(formData: FormData) {
  const current = await requireRole(["customer", "staff", "admin"]);
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const backUrl =
    current.profile.role === "staff"
      ? `/staff/orders/${bookingId}`
      : current.profile.role === "admin"
      ? `/admin/orders/${bookingId}`
      : `/orders/${bookingId}`;

  if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !message || message.length > 2000) {
    redirect(`${backUrl}?error=${encodeURIComponent("Pesan tidak valid atau terlalu panjang.")}`);
  }

  const { error } = await current.supabase.from("booking_messages").insert({
    booking_id: bookingId,
    sender_id: current.user.id,
    message,
  });

  if (error) {
    redirect(`${backUrl}?error=${encodeURIComponent("Gagal mengirim pesan.")}`);
  }

  revalidatePath(`/orders/${bookingId}`);
  revalidatePath(`/staff/orders/${bookingId}`);
  redirect(backUrl);
}

export async function toggleFavoriteCleanerAction(formData: FormData) {
  const current = await requireRole(["customer"]);
  const staffId = String(formData.get("staff_id") ?? "").trim();
  const isFavorite = formData.get("is_favorite") === "true";

  if (!/^[0-9a-f-]{36}$/i.test(staffId)) return;

  if (isFavorite) {
    await current.supabase
      .from("favorite_cleaners")
      .delete()
      .eq("customer_id", current.user.id)
      .eq("staff_id", staffId);
  } else {
    await current.supabase
      .from("favorite_cleaners")
      .insert({ customer_id: current.user.id, staff_id: staffId });
  }

  revalidatePath("/dashboard");
  revalidatePath("/profile");
}

export async function markNotificationReadAction(formData: FormData) {
  const current = await requireRole(["customer", "staff", "admin"]);
  const notificationId = String(formData.get("id") ?? "").trim();

  if (notificationId === "all") {
    await current.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", current.user.id);
  } else if (/^[0-9a-f-]{36}$/i.test(notificationId)) {
    await current.supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", current.user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/staff");
  revalidatePath("/admin");
}

export async function saveCustomerAddressAction(formData: FormData) {
  const current = await requireRole(["customer"]);
  const label = String(formData.get("label") ?? "").trim();
  const fullAddress = String(formData.get("full_address") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const isDefault = formData.get("is_default") === "on";

  if (!label || fullAddress.length < 8 || phone.length < 8) {
    redirect(`/profile?error=${encodeURIComponent("Lengkapi nama alamat, alamat lengkap, dan nomor telepon.")}`);
  }

  if (isDefault) {
    await current.supabase
      .from("customer_addresses")
      .update({ is_default: false })
      .eq("customer_id", current.user.id);
  }

  const { error } = await current.supabase.from("customer_addresses").insert({
    customer_id: current.user.id,
    label,
    full_address: fullAddress,
    phone,
    notes: notes || null,
    is_default: isDefault,
  });

  if (error) {
    redirect(`/profile?error=${encodeURIComponent("Gagal menyimpan alamat.")}`);
  }

  revalidatePath("/profile");
  revalidatePath("/booking");
  redirect(`/profile?ok=${encodeURIComponent("Alamat baru berhasil disimpan.")}`);
}

export type SlotAvailabilityResult = {
  date: string;
  totalStaff: number;
  slots: Record<string, { isAvailable: boolean; busyStaff: number }>;
};

export async function checkAvailableSlotsAction(date: string): Promise<SlotAvailabilityResult> {
  const current = await requireRole(["customer", "staff", "admin"]);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { date, totalStaff: 0, slots: {} };
  }

  // 1. Get total active staff count
  const { count: staffCount } = await current.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "staff");

  const totalStaff = staffCount ?? 0;

  // 2. Fetch busy bookings / schedules on that date
  const { data: busyBookings } = await current.supabase
    .from("bookings")
    .select("start_time")
    .eq("booking_date", date)
    .not("status", "in", "(cancelled,completed)");

  const busySlotsMap: Record<string, number> = {};
  if (busyBookings) {
    for (const b of busyBookings) {
      const timeStr = String(b.start_time).slice(0, 5);
      busySlotsMap[timeStr] = (busySlotsMap[timeStr] || 0) + 1;
    }
  }

  const slots: Record<string, { isAvailable: boolean; busyStaff: number }> = {};
  for (const slot of standardTimeSlots) {
    const busy = busySlotsMap[slot] || 0;
    // Slot is available if totalStaff is 0 (unassigned pool) or if busy < totalStaff
    const isAvailable = totalStaff === 0 || busy < totalStaff;
    slots[slot] = {
      isAvailable,
      busyStaff: busy,
    };
  }

  return {
    date,
    totalStaff,
    slots,
  };
}

export async function rescheduleBookingAction(formData: FormData) {
  const current = await requireRole(["customer"]);
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const newDate = String(formData.get("new_date") ?? "").trim();
  const newTime = String(formData.get("new_time") ?? "").trim();
  const backUrl = `/orders/${bookingId}`;

  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    redirect(`/orders?error=${encodeURIComponent("ID pesanan tidak valid.")}`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || newDate < jakartaToday()) {
    redirect(`${backUrl}?error=${encodeURIComponent("Pilih tanggal baru hari ini atau setelahnya.")}`);
  }

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) {
    redirect(`${backUrl}?error=${encodeURIComponent("Pilih jam baru yang valid.")}`);
  }

  const [hour] = newTime.split(":").map(Number);
  if (hour < 8 || hour > 17) {
    redirect(`${backUrl}?error=${encodeURIComponent("Jam layanan baru harus dalam jam operasional 08:00–17:00 WIB.")}`);
  }

  // 1. Verify booking exists and status is pending or confirmed
  const { data: booking, error: fetchErr } = await current.supabase
    .from("bookings")
    .select("id, status, customer_id, services(name)")
    .eq("id", bookingId)
    .eq("customer_id", current.user.id)
    .maybeSingle();

  if (fetchErr || !booking) {
    redirect(`${backUrl}?error=${encodeURIComponent("Pesanan tidak ditemukan.")}`);
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    redirect(`${backUrl}?error=${encodeURIComponent("Hanya pesanan berstatus Menunggu Konfirmasi atau Dikonfirmasi yang dapat dijadwalkan ulang.")}`);
  }

  // 2. Check staff availability on the new slot
  const { count: staffCount } = await current.supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "staff");

  const totalStaff = staffCount ?? 0;
  if (totalStaff > 0) {
    const { count: busyCount } = await current.supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("booking_date", newDate)
      .eq("start_time", newTime)
      .not("status", "in", "(cancelled,completed)")
      .neq("id", bookingId);

    if (busyCount != null && busyCount >= totalStaff) {
      redirect(`${backUrl}?error=${encodeURIComponent("Slot waktu baru tersebut sudah penuh. Silakan pilih jam lain.")}`);
    }
  }

  // 3. Update booking schedule
  const { error: updateErr } = await current.supabase
    .from("bookings")
    .update({
      booking_date: newDate,
      start_time: newTime,
    })
    .eq("id", bookingId)
    .eq("customer_id", current.user.id);

  if (updateErr) {
    redirect(`${backUrl}?error=${encodeURIComponent(`Gagal mengubah jadwal: ${updateErr.message}`)}`);
  }

  // 4. Update any related staff schedules if scheduled
  await current.supabase
    .from("staff_schedules")
    .update({
      scheduled_date: newDate,
      start_time: newTime,
    })
    .eq("booking_id", bookingId)
    .neq("status", "cancelled");

  // 5. In-app notification
  const serviceObj = Array.isArray(booking.services) ? booking.services[0] : booking.services;
  await current.supabase.from("notifications").insert({
    user_id: current.user.id,
    title: "Jadwal Pesanan Berhasil Diubah",
    message: `Jadwal pesanan ${serviceObj?.name || ""} (#${bookingId.slice(0, 8)}) berhasil digeser ke ${newDate} pukul ${newTime} WIB.`,
    link: `/orders/${bookingId}`,
    type: "schedule",
  });

  revalidatePath(`/orders/${bookingId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/admin/orders");
  redirect(`${backUrl}?ok=${encodeURIComponent("Jadwal kunjungan berhasil diperbarui.")}`);
}

