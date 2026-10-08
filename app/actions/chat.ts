"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "../../lib/auth/session";

export async function sendChatMessageAction(formData: FormData) {
  const current = await requireRole(["customer", "staff", "admin"]);
  const roomId = String(formData.get("room_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const returnUrl = String(formData.get("return_url") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(roomId)) {
    redirect(`${returnUrl || "/chat"}?error=${encodeURIComponent("Room chat tidak valid.")}`);
  }

  if (!message || message.length > 2000) {
    redirect(`${returnUrl || "/chat"}?error=${encodeURIComponent("Pesan tidak boleh kosong (maks. 2000 karakter).")}`);
  }

  // 1. Fetch room details to know recipient and room type
  const { data: room, error: roomError } = await current.supabase
    .from("chat_rooms")
    .select(`
      id,
      room_type,
      customer_id,
      staff_id,
      booking_id,
      customer:profiles!chat_rooms_customer_id_fkey(name),
      staff:profiles!chat_rooms_staff_id_fkey(name)
    `)
    .eq("id", roomId)
    .maybeSingle();

  if (roomError || !room) {
    redirect(`${returnUrl || "/chat"}?error=${encodeURIComponent("Room chat tidak ditemukan atau Anda tidak memiliki akses.")}`);
  }

  // 2. Insert message
  const { error: insertError } = await current.supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: current.user.id,
      message,
    });

  if (insertError) {
    redirect(`${returnUrl || "/chat"}?error=${encodeURIComponent(`Gagal mengirim pesan: ${insertError.message}`)}`);
  }

  // 3. Update room updated_at
  await current.supabase
    .from("chat_rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", roomId);

  // 4. Create Notification for the intended recipient
  const senderName = current.profile.name || "Pengguna";

  if (room.room_type === "admin") {
    if (current.profile.role === "customer") {
      // Customer -> Admin: notify admins
      // (Optional: can notify admin or log to notifications)
      await current.supabase.from("notifications").insert({
        user_id: current.user.id, // Notification log
        title: "Pesan Terkirim ke Admin",
        message: `Pesan Anda ke Admin JoCleanCare: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"`,
        link: `/chat?room_id=${roomId}`,
        type: "chat",
      });
    } else {
      // Admin -> Customer: notify Customer
      await current.supabase.from("notifications").insert({
        user_id: room.customer_id,
        title: "Pesan baru dari Admin JoCleanCare",
        message: `${message.slice(0, 80)}${message.length > 80 ? "..." : ""}`,
        link: `/chat?room_id=${roomId}`,
        type: "chat",
      });
    }
  } else if (room.room_type === "staff") {
    if (current.profile.role === "customer" && room.staff_id) {
      // Customer -> Staff: notify Staff
      await current.supabase.from("notifications").insert({
        user_id: room.staff_id,
        title: `Pesan baru dari Pelanggan (${senderName})`,
        message: `${message.slice(0, 80)}${message.length > 80 ? "..." : ""}`,
        link: `/staff/messages?room_id=${roomId}`,
        type: "chat",
      });
    } else if (current.profile.role === "staff") {
      // Staff -> Customer: notify Customer
      const staffName = current.profile.name || "Petugas";
      await current.supabase.from("notifications").insert({
        user_id: room.customer_id,
        title: `Pesan baru dari Petugas (${staffName})`,
        message: `${message.slice(0, 80)}${message.length > 80 ? "..." : ""}`,
        link: `/chat?room_id=${roomId}`,
        type: "chat",
      });
    }
  }

  // Revalidate relevant pages
  revalidatePath("/chat");
  revalidatePath("/admin/chat");
  revalidatePath("/staff/messages");
  if (room.booking_id) {
    revalidatePath(`/orders/${room.booking_id}`);
    revalidatePath(`/staff/orders/${room.booking_id}`);
    revalidatePath(`/admin/orders/${room.booking_id}`);
  }

  const targetUrl = returnUrl ? returnUrl : `/chat?room_id=${roomId}`;
  redirect(targetUrl);
}

export async function markChatRoomReadAction(formData: FormData) {
  const current = await requireRole(["customer", "staff", "admin"]);
  const roomId = String(formData.get("room_id") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) return;

  await current.supabase.rpc("mark_chat_room_messages_read", { p_room_id: roomId });
}
