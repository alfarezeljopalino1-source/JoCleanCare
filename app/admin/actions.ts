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
  const price = Number(data.get("price"));
  const duration = Number(data.get("duration_minutes"));
  const isActive = data.get("is_active") === "on";
  if (name.length < 2 || name.length > 120 || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration <= 0) {
    resultUrl("/admin/services", "Periksa nama, harga, dan durasi layanan.", "error");
  }
  if (description.length > 2000) resultUrl("/admin/services", "Deskripsi maksimal 2.000 karakter.", "error");

  const payload = { name, description: description || null, price, duration_minutes: duration, is_active: id ? isActive : true };
  const response = id
    ? await supabase.from("services").update(payload).eq("id", id)
    : await supabase.from("services").insert(payload);
  if (response.error) resultUrl("/admin/services", "Layanan belum dapat disimpan. Periksa data dan coba lagi.", "error");
  revalidatePath("/admin/services");
  revalidatePath("/layanan");
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
  resultUrl("/admin/services", isActive ? "Layanan diaktifkan." : "Layanan dinonaktifkan.");
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
  if (!/^[0-9a-f-]{36}$/i.test(bookingId) || !/^[0-9a-f-]{36}$/i.test(staffId)) resultUrl(back, "Pilih booking dan petugas yang valid.", "error");
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
  if (error) resultUrl(back, "Jadwal belum tersimpan. Pastikan booking dikonfirmasi, tanggal sesuai, dan petugas tidak bentrok.", "error");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(back);
  revalidatePath("/admin/schedules");
  revalidatePath("/admin/staff");
  revalidatePath("/orders");
  resultUrl(back, "Petugas berhasil dijadwalkan.");
}
