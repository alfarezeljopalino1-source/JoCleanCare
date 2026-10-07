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

export async function saveStaffAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const id = readText(data, "id");
  const name = readText(data, "name");
  const email = readText(data, "email").toLowerCase();
  const phone = readText(data, "phone");
  const isActive = data.get("is_active") === "on";

  if (!name || name.length < 2) {
    resultUrl("/admin/staff", "Nama petugas wajib diisi.", "error");
  }

  if (id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      resultUrl("/admin/staff", "ID petugas tidak valid.", "error");
    }
    const updatePayload: Record<string, unknown> = {
      name,
      phone: phone || null,
      is_active: isActive,
    };
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .eq("role", "staff");

    if (error) {
      resultUrl("/admin/staff", `Gagal memperbarui data petugas: ${error.message}`, "error");
    }
    revalidatePath("/admin/staff");
    resultUrl("/admin/staff", "Data petugas berhasil diperbarui.");
  }

  // Adding/Promoting new staff by email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    resultUrl("/admin/staff", "Email petugas tidak valid.", "error");
  }

  // Check if profile exists with this email
  const { data: existingUser } = await supabase
    .from("profiles")
    .select("id, role, name")
    .eq("email", email)
    .maybeSingle();

  if (!existingUser) {
    resultUrl(
      "/admin/staff",
      `Akun dengan email ${email} belum terdaftar di JoCleanCare. Petugas baru perlu membuat akun terlebih dahulu melalui halaman pendaftaran, lalu Anda dapat menetapkan perannya sebagai staff.`,
      "error"
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      role: "staff",
      name: name || existingUser.name,
      phone: phone || null,
      is_active: true,
    })
    .eq("id", existingUser.id);

  if (error) {
    resultUrl("/admin/staff", `Gagal menetapkan akun sebagai petugas: ${error.message}`, "error");
  }

  // Send notification to the newly promoted staff
  await supabase.from("notifications").insert({
    user_id: existingUser.id,
    title: "Akun Ditetapkan Sebagai Staff",
    message: "Selamat! Akun Anda telah diaktifkan sebagai Petugas Kebersihan Resmi JoCleanCare oleh Administrator.",
    link: "/staff",
    type: "assignment",
  });

  revalidatePath("/admin/staff");
  revalidatePath("/admin");
  resultUrl("/admin/staff", `Akun ${email} berhasil diaktifkan sebagai staff kebersihan.`);
}

export async function toggleStaffStatusAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const staffId = readText(data, "staff_id");
  const targetActive = data.get("is_active") === "true";

  if (!/^[0-9a-f-]{36}$/i.test(staffId)) {
    resultUrl("/admin/staff", "Petugas tidak valid.", "error");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: targetActive })
    .eq("id", staffId)
    .eq("role", "staff");

  if (error) {
    resultUrl("/admin/staff", `Gagal mengubah status petugas: ${error.message}`, "error");
  }

  revalidatePath("/admin/staff");
  resultUrl(
    "/admin/staff",
    targetActive ? "Petugas telah diaktifkan kembali." : "Petugas telah dinonaktifkan dari penugasan."
  );
}

export async function adminRescheduleBookingAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const bookingId = readText(data, "booking_id");
  const newDate = readText(data, "booking_date");
  const newTime = readText(data, "start_time");
  const back = `/admin/orders/${bookingId}`;

  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    resultUrl("/admin/orders", "ID booking tidak valid.", "error");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(newTime)) {
    resultUrl(back, "Tanggal atau jam baru tidak valid.", "error");
  }

  const { error: bError } = await supabase
    .from("bookings")
    .update({ booking_date: newDate, start_time: newTime })
    .eq("id", bookingId);

  if (bError) {
    resultUrl(back, `Gagal mengubah jadwal: ${bError.message}`, "error");
  }

  // Sync any staff schedule that isn't cancelled
  await supabase
    .from("staff_schedules")
    .update({ scheduled_date: newDate, start_time: newTime })
    .eq("booking_id", bookingId)
    .neq("status", "cancelled");

  // Notify customer
  const { data: booking } = await supabase.from("bookings").select("customer_id, services(name)").eq("id", bookingId).maybeSingle();
  if (booking?.customer_id) {
    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      title: "Jadwal Pesanan Disesuaikan oleh Admin",
      message: `Jadwal pesanan Anda (#${bookingId.slice(0, 8)}) telah dijadwalkan ulang ke ${newDate} pukul ${newTime} WIB.`,
      link: `/orders/${bookingId}`,
      type: "schedule",
    });
  }

  revalidatePath(back);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/schedules");
  revalidatePath(`/orders/${bookingId}`);
  resultUrl(back, "Jadwal booking berhasil disesuaikan.");
}

export async function adminCancelBookingAction(data: FormData) {
  const { supabase } = await requireRole(["admin"]);
  const bookingId = readText(data, "booking_id");
  const reason = readText(data, "cancellation_reason");
  const back = `/admin/orders/${bookingId}`;

  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    resultUrl("/admin/orders", "ID booking tidak valid.", "error");
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancellation_reason: reason || "Dibatalkan oleh administrator.",
    })
    .eq("id", bookingId);

  if (error) {
    resultUrl(back, `Gagal membatalkan booking: ${error.message}`, "error");
  }

  // Notify customer
  const { data: booking } = await supabase.from("bookings").select("customer_id, services(name)").eq("id", bookingId).maybeSingle();
  if (booking?.customer_id) {
    await supabase.from("notifications").insert({
      user_id: booking.customer_id,
      title: "Pesanan Dibatalkan oleh Admin",
      message: `Pesanan #${bookingId.slice(0, 8)} dibatalkan oleh admin dengan alasan: ${reason || "Operasional"}.`,
      link: `/orders/${bookingId}`,
      type: "status",
    });
  }

  revalidatePath(back);
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${bookingId}`);
  resultUrl(back, "Booking berhasil dibatalkan.");
}

