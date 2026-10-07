"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "../../lib/auth/session";

function redirectWithFeedback(path: string, message: string, kind: "ok" | "error" = "ok"): never {
  redirect(`${path}?${kind}=${encodeURIComponent(message)}`);
}

export async function updateStaffJobStatusAction(formData: FormData) {
  const current = await requireRole(["staff"]);
  const scheduleId = String(formData.get("schedule_id") ?? "").trim();
  const bookingId = String(formData.get("booking_id") ?? "").trim();
  const nextStatus = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const endTime = String(formData.get("end_time") ?? "").trim();

  const backUrl = bookingId ? `/staff/orders/${bookingId}` : "/staff";

  if (!/^[0-9a-f-]{36}$/i.test(scheduleId)) {
    redirectWithFeedback(backUrl, "ID jadwal tidak valid.", "error");
  }

  const allowedStatuses = ["accepted", "in_progress", "completed"];
  if (!allowedStatuses.includes(nextStatus)) {
    redirectWithFeedback(backUrl, "Status pekerjaan tidak valid.", "error");
  }

  const updatePayload: {
    status: string;
    notes?: string | null;
    end_time?: string | null;
  } = {
    status: nextStatus,
  };

  if (notes) updatePayload.notes = notes;
  if (nextStatus === "completed") {
    // If end_time is provided use it, otherwise use current Jakarta time HH:MM:00
    if (endTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) {
      updatePayload.end_time = endTime;
    } else {
      const now = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());
      updatePayload.end_time = now;
    }
  }

  const { error } = await current.supabase
    .from("staff_schedules")
    .update(updatePayload)
    .eq("id", scheduleId)
    .eq("staff_id", current.user.id);

  if (error) {
    redirectWithFeedback(backUrl, `Gagal memperbarui status: ${error.message}`, "error");
  }

  // Create in-app notification for the customer if bookingId is known
  if (bookingId) {
    const { data: bookingData } = await current.supabase
      .from("bookings")
      .select("customer_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingData?.customer_id) {
      let notifTitle = "Status Layanan Berubah";
      let notifMsg = `Petugas telah memperbarui status pekerjaan Anda menjadi: ${nextStatus}.`;
      if (nextStatus === "accepted") {
        notifTitle = "Petugas Siap Bertugas";
        notifMsg = "Petugas telah mengonfirmasi dan bersiap menuju lokasi Anda.";
      } else if (nextStatus === "in_progress") {
        notifTitle = "Pembersihan Sedang Dikerjakan";
        notifMsg = "Petugas JoCleanCare telah memulai proses pembersihan di lokasi Anda.";
      } else if (nextStatus === "completed") {
        notifTitle = "Pembersihan Selesai";
        notifMsg = "Layanan pembersihan telah selesai dikerjakan! Jangan lupa berikan rating dan ulasan Anda.";
      }

      await current.supabase.from("notifications").insert({
        user_id: bookingData.customer_id,
        title: notifTitle,
        message: notifMsg,
        link: `/orders/${bookingId}`,
        type: "status",
      });
    }
  }

  revalidatePath("/staff");
  revalidatePath("/staff/schedules");
  revalidatePath(`/staff/orders/${bookingId}`);
  revalidatePath(`/orders/${bookingId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");

  redirectWithFeedback(backUrl, `Status pekerjaan berhasil diubah menjadi ${nextStatus}.`);
}
