"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "../../lib/auth/session";

function resultUrl(path: string, message: string, kind: "ok" | "error" = "ok"): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

function readText(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

export async function saveServiceAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = readText(data, "id");
  const name = readText(data, "name");
  const description = readText(data, "description");
  const badge = readText(data, "badge");
  const serviceTier = readText(data, "service_tier") || "standard";
  const whatsIncludedRaw = readText(data, "whats_included");
  const whatsExcludedRaw = readText(data, "whats_excluded");
  const price = Number(data.get("price"));
  const duration = Number(data.get("duration_minutes"));
  const isActive = data.get("is_active") === "on";

  if (name.length < 2 || name.length > 120 || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration <= 0) {
    resultUrl("/admin/services", "Periksa nama, harga, dan durasi layanan.", "error");
  }
  if (description.length > 2000) resultUrl("/admin/services", "Deskripsi maksimal 2.000 karakter.", "error");

  const whatsIncluded = whatsIncludedRaw
    ? whatsIncludedRaw.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];
  const whatsExcluded = whatsExcludedRaw
    ? whatsExcludedRaw.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];

  const payload = {
    name,
    description: description || null,
    price,
    duration_minutes: duration,
    is_active: id ? isActive : true,
    badge: badge || null,
    service_tier: serviceTier,
    whats_included: whatsIncluded,
    whats_excluded: whatsExcluded,
  };

  const response = id
    ? await supabase.from("services").update(payload).eq("id", id)
    : await supabase.from("services").insert(payload);

  if (response.error) resultUrl("/admin/services", `Layanan belum dapat disimpan: ${response.error.message}`, "error");
  revalidatePath("/admin/services");
  revalidatePath("/layanan");
  revalidatePath("/booking");
  resultUrl("/admin/services", id ? "Perubahan layanan tersimpan." : "Layanan baru berhasil ditambahkan.");
}

export async function setServiceActiveAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = readText(data, "id");
  const isActive = data.get("is_active") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) resultUrl("/admin/services", "Layanan tidak valid.", "error");
  const { error } = await supabase.from("services").update({ is_active: isActive }).eq("id", id);
  if (error) resultUrl("/admin/services", "Status layanan belum dapat diperbarui.", "error");
  revalidatePath("/admin/services");
  revalidatePath("/layanan");
  revalidatePath("/booking");
  resultUrl("/admin/services", isActive ? "Layanan diaktifkan." : "Layanan dinonaktifkan.");
}

export async function saveAddOnAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = readText(data, "id");
  const name = readText(data, "name");
  const description = readText(data, "description");
  const price = Number(data.get("price"));
  const duration = Number(data.get("duration_minutes") || 30);
  const iconKey = readText(data, "icon_key") || "custom";
  const isActive = data.get("is_active") === "on";

  if (!name || name.length < 2 || !Number.isFinite(price) || price < 0) {
    resultUrl("/admin/services", "Periksa nama dan harga add-on.", "error");
  }

  const payload = {
    name,
    description: description || null,
    price,
    duration_minutes: duration,
    icon_key: iconKey,
    is_active: id ? isActive : true,
  };

  const response = id
    ? await supabase.from("add_ons").update(payload).eq("id", id)
    : await supabase.from("add_ons").insert(payload);

  if (response.error) resultUrl("/admin/services", `Add-on belum dapat disimpan: ${response.error.message}`, "error");
  revalidatePath("/admin/services");
  revalidatePath("/booking");
  resultUrl("/admin/services", id ? "Perubahan add-on tersimpan." : "Add-on baru berhasil ditambahkan.");
}

export async function setAddOnActiveAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = readText(data, "id");
  const isActive = data.get("is_active") === "true";
  if (!/^[0-9a-f-]{36}$/i.test(id)) resultUrl("/admin/services", "Add-on tidak valid.", "error");
  const { error } = await supabase.from("add_ons").update({ is_active: isActive }).eq("id", id);
  if (error) resultUrl("/admin/services", "Status add-on belum dapat diperbarui.", "error");
  revalidatePath("/admin/services");
  revalidatePath("/booking");
  resultUrl("/admin/services", isActive ? "Add-on diaktifkan." : "Add-on dinonaktifkan.");
}

export async function setBookingStatusAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = readText(data, "booking_id");
  const status = readText(data, "status");
  const allowed = ["pending", "confirmed", "assigned", "in_progress", "completed", "cancelled"];
  const back = `/admin/orders/${encodeURIComponent(id)}`;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !allowed.includes(status)) resultUrl("/admin/orders", "Pesanan atau status tidak valid.", "error");

  const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
  if (error) resultUrl(back, "Perubahan status ditolak. Pastikan alurnya valid dan assignment sudah sesuai.", "error");

  // Send in-app notification to customer
  const { data: booking } = await supabase.from("bookings").select("customer_id, services(name)").eq("id", id).maybeSingle();
  if (booking?.customer_id) {
    const serviceName = (booking.services as unknown as { name: string } | null)?.name || "Layanan";
    let notifTitle = "Pembaruan Status Booking";
    let notifMsg = `Pesanan ${serviceName} #${id.slice(0, 8)} statusnya kini: ${status}.`;
    if (status === "confirmed") {
      notifTitle = "Booking Dikonfirmasi!";
      notifMsg = `Pesanan ${serviceName} Anda telah dikonfirmasi dan sedang disiapkan penugasan petugas.`;
    } else if (status === "completed") {
      notifTitle = "Pekerjaan Selesai";
      notifMsg = `Pesanan ${serviceName} telah selesai dikerjakan. Terima kasih atas kepercayaan Anda!`;
    } else if (status === "cancelled") {
      notifTitle = "Pesanan Dibatalkan";
      notifMsg = `Pesanan ${serviceName} #${id.slice(0, 8)} telah dibatalkan oleh admin.`;
    }

    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      title: notifTitle,
      message: notifMsg,
      link: `/orders/${id}`,
      type: "status",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(back);
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  resultUrl(back, "Status pesanan berhasil diperbarui.");
}

export async function assignStaffAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const bookingId = readText(data, "booking_id");
  const staffId = readText(data, "staff_id");
  const scheduledDate = readText(data, "scheduled_date");
  const startTime = readText(data, "start_time");
  const endTime = readText(data, "end_time");
  const notes = readText(data, "notes");
  const back = /^[0-9a-f-]{36}$/i.test(bookingId) ? `/admin/orders/${bookingId}` : "/admin/schedules";

  if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !/^[0-9a-f-]{36}$/i.test(staffId)) {
    resultUrl(back, "Pilih booking dan petugas yang valid.", "error");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || (endTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime))) {
    resultUrl(back, "Tanggal atau waktu jadwal tidak valid.", "error");
  }
  if (endTime && endTime <= startTime) resultUrl(back, "Waktu selesai harus setelah waktu mulai.", "error");
  if (notes.length > 1000) resultUrl(back, "Catatan jadwal maksimal 1.000 karakter.", "error");

  const { error } = await supabase.from("staff_schedules").insert({
    booking_id: bookingId,
    staff_id: staffId,
    scheduled_date: scheduledDate,
    start_time: startTime,
    end_time: endTime || null,
    notes: notes || null,
    status: "scheduled",
  });

  if (error) {
    resultUrl(back, `Jadwal belum tersimpan: ${error.message}. Pastikan booking dikonfirmasi, tanggal sesuai, dan petugas tidak bentrok.`, "error");
  }

  // Notify assigned staff
  await supabase.from("notifications").insert({
    user_id: staffId,
    title: "Tugas Kebersihan Baru",
    message: `Anda mendapat penugasan baru pada ${scheduledDate} pukul ${startTime} WIB.`,
    link: `/staff/orders/${bookingId}`,
    type: "assignment",
  });

  // Notify customer
  const { data: booking } = await supabase.from("bookings").select("customer_id, services(name)").eq("id", bookingId).maybeSingle();
  if (booking?.customer_id) {
    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      title: "Petugas Ditugaskan!",
      message: "Petugas kebersihan JoCleanCare telah ditugaskan untuk pesanan Anda.",
      link: `/orders/${bookingId}`,
      type: "assignment",
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(back);
  revalidatePath("/admin/schedules");
  revalidatePath("/admin/staff");
  revalidatePath("/orders");
  revalidatePath(`/orders/${bookingId}`);
  revalidatePath("/staff");
  revalidatePath("/staff/schedules");
  resultUrl(back, "Petugas berhasil dijadwalkan.");
}
