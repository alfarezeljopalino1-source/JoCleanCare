import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatRoomType = "admin" | "staff";

export type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    name: string;
    role: string;
  } | null;
};

export type ChatRoom = {
  id: string;
  customer_id: string;
  room_type: ChatRoomType;
  booking_id: string | null;
  staff_id: string | null;
  created_at: string;
  updated_at: string;
  customer?: {
    name: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  staff?: {
    name: string;
    phone?: string | null;
  } | null;
  booking?: {
    id: string;
    booking_date: string;
    start_time: string;
    status: string;
    services?: { name: string } | { name: string }[] | null;
  } | null;
  unread_count?: number;
  last_message?: ChatMessage | null;
};

export type UnreadChatCounts = {
  adminUnread: number;
  staffUnread: number;
};

/**
 * Get or initialize Admin Support chat room for a customer
 */
export async function getOrCreateAdminRoom(
  supabase: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_admin_chat_room", {
    p_customer_id: customerId,
  });
  if (error || !data) {
    // Fallback query if RPC had issues
    const { data: existing } = await supabase
      .from("chat_rooms")
      .select("id")
      .eq("customer_id", customerId)
      .eq("room_type", "admin")
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created } = await supabase
      .from("chat_rooms")
      .insert({ customer_id: customerId, room_type: "admin" })
      .select("id")
      .maybeSingle();

    return created?.id ?? null;
  }
  return data as string;
}

/**
 * Get or initialize Staff chat room for a booking (only if staff is assigned)
 */
export async function getOrCreateStaffRoom(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_or_create_staff_chat_room", {
    p_booking_id: bookingId,
  });
  if (error) {
    // If no staff assigned, function returns null
    return null;
  }
  return (data as string) || null;
}

/**
 * Fetch messages for a specific room
 */
export async function getRoomMessages(
  supabase: SupabaseClient,
  roomId: string,
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id,
      room_id,
      sender_id,
      message,
      is_read,
      created_at,
      sender:profiles!chat_messages_sender_id_fkey (name, role)
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data as unknown as ChatMessage[];
}

/**
 * Mark messages in a room as read
 */
export async function markRoomMessagesAsRead(
  supabase: SupabaseClient,
  roomId: string,
): Promise<void> {
  await supabase.rpc("mark_chat_room_messages_read", { p_room_id: roomId });
}

/**
 * Get separated unread counts for customer
 */
export async function getCustomerUnreadCounts(
  supabase: SupabaseClient,
  customerId: string,
): Promise<UnreadChatCounts> {
  // 1. Get customer rooms
  const { data: rooms } = await supabase
    .from("chat_rooms")
    .select("id, room_type")
    .eq("customer_id", customerId);

  if (!rooms || rooms.length === 0) {
    return { adminUnread: 0, staffUnread: 0 };
  }

  const adminRoomIds = rooms.filter((r) => r.room_type === "admin").map((r) => r.id);
  const staffRoomIds = rooms.filter((r) => r.room_type === "staff").map((r) => r.id);

  let adminUnread = 0;
  let staffUnread = 0;

  if (adminRoomIds.length > 0) {
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .in("room_id", adminRoomIds)
      .neq("sender_id", customerId)
      .eq("is_read", false);
    adminUnread = count ?? 0;
  }

  if (staffRoomIds.length > 0) {
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .in("room_id", staffRoomIds)
      .neq("sender_id", customerId)
      .eq("is_read", false);
    staffUnread = count ?? 0;
  }

  return { adminUnread, staffUnread };
}
