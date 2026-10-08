import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { formatBookingDate } from "../../../lib/bookings";
import { getRoomMessages, markRoomMessagesAsRead, getOrCreateStaffRoom, type ChatMessage } from "../../../lib/chat";
import { ChatBox } from "../../chat/chat-box";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  room_id?: string;
  booking_id?: string;
  ok?: string;
  error?: string;
}>;

export default async function StaffMessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ supabase, user }, params] = await Promise.all([
    requireRole(["staff"]),
    searchParams,
  ]);

  // 1. Fetch bookings assigned to this staff member
  const { data: staffSchedules } = await supabase
    .from("staff_schedules")
    .select(`
      booking_id,
      scheduled_date,
      start_time,
      status,
      booking:bookings (
        id,
        address,
        status,
        customer_phone,
        services (name),
        customer:profiles!bookings_customer_id_fkey (id, name, phone)
      )
    `)
    .eq("staff_id", user.id)
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: false });

  // Ensure rooms exist for all active assigned bookings
  if (staffSchedules && staffSchedules.length > 0) {
    for (const schedule of staffSchedules) {
      if (schedule.booking_id) {
        await getOrCreateStaffRoom(supabase, schedule.booking_id);
      }
    }
  }

  // 2. Fetch staff chat rooms (strictly assigned to this staff)
  const { data: roomsRaw } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      room_type,
      booking_id,
      customer_id,
      updated_at,
      customer:profiles!chat_rooms_customer_id_fkey (name, phone),
      booking:bookings (
        id,
        booking_date,
        start_time,
        status,
        address,
        services (name)
      )
    `)
    .eq("room_type", "staff")
    .eq("staff_id", user.id)
    .order("updated_at", { ascending: false });

  type RoomType = {
    id: string;
    booking_id: string;
    customer_id: string;
    updated_at: string;
    customer: { name: string; phone: string | null } | null;
    booking: {
      id: string;
      booking_date: string;
      start_time: string;
      status: string;
      address: string;
      services: { name: string } | { name: string }[] | null;
    } | null;
    unreadCount: number;
    lastMessage: ChatMessage | null;
  };

  const rooms: RoomType[] = [];

  if (roomsRaw && roomsRaw.length > 0) {
    const roomIds = roomsRaw.map((r) => r.id);

    // Fetch messages for last message and unread count
    const { data: msgsRaw } = await supabase
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
      .in("room_id", roomIds)
      .order("created_at", { ascending: true });

    const msgsMap: Record<string, ChatMessage[]> = {};
    const unreadMap: Record<string, number> = {};

    if (msgsRaw) {
      for (const m of msgsRaw as unknown as ChatMessage[]) {
        if (!msgsMap[m.room_id]) msgsMap[m.room_id] = [];
        msgsMap[m.room_id].push(m);

        if (m.sender_id !== user.id && !m.is_read) {
          unreadMap[m.room_id] = (unreadMap[m.room_id] || 0) + 1;
        }
      }
    }

    for (const r of roomsRaw) {
      const roomMsgs = msgsMap[r.id] || [];
      rooms.push({
        id: r.id,
        booking_id: r.booking_id ?? "",
        customer_id: r.customer_id,
        updated_at: r.updated_at,
        customer: r.customer as unknown as RoomType["customer"],
        booking: r.booking as unknown as RoomType["booking"],
        unreadCount: unreadMap[r.id] || 0,
        lastMessage: roomMsgs.length > 0 ? roomMsgs[roomMsgs.length - 1] : null,
      });
    }
  }

  // Determine active selected room
  let selectedRoomId = params.room_id || null;
  if (!selectedRoomId && params.booking_id) {
    const match = rooms.find((r) => r.booking_id === params.booking_id);
    if (match) selectedRoomId = match.id;
  }
  if (!selectedRoomId && rooms.length > 0) {
    selectedRoomId = rooms[0].id;
  }

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  if (selectedRoomId) {
    await markRoomMessagesAsRead(supabase, selectedRoomId);
  }

  const activeMessages = selectedRoomId
    ? await getRoomMessages(supabase, selectedRoomId)
    : [];

  const getServiceName = (item: RoomType | undefined) => {
    const s = item?.booking?.services;
    return Array.isArray(s) ? s[0]?.name : s?.name || "Layanan";
  };

  const partnerName = selectedRoom?.customer?.name || "Pelanggan";
  const partnerRoleTitle = "Pelanggan";
  const partnerSubtitle = selectedRoom
    ? `${getServiceName(selectedRoom)} · ${formatBookingDate(selectedRoom.booking?.booking_date ?? "")} pukul ${String(
        selectedRoom.booking?.start_time ?? "",
      ).slice(0, 5)} WIB`
    : "";
  const bookingCode = selectedRoom?.booking_id
    ? `JC-${selectedRoom.booking_id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
    : undefined;

  return (
    <main className="role-page staff-dashboard">
      <div className="role-page-inner">
        <header className="role-page-heading">
          <p className="role-kicker">Komunikasi Lapangan</p>
          <h1>Pesan & Koordinasi Pelanggan</h1>
          <p>
            Koordinasi langsung dengan pelanggan mengenai alamat, instruksi khusus, atau perkiraan waktu tiba di lokasi tugas Anda.
          </p>
        </header>

        {params.error && (
          <p className="customer-notice customer-notice-error">{params.error}</p>
        )}

        {rooms.length === 0 ? (
          <div className="customer-empty">
            <h2>Belum Ada Tugas Aktif</h2>
            <p>Pesan akan tersedia setelah Anda menerima penugasan pekerjaan dari admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[36rem]">
            {/* Left Column: Assigned Booking Chat List */}
            <aside className="lg:col-span-4 admin-card p-0 flex flex-col h-[38rem] overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Kontak Tugas Anda
                </h2>
                <span className="text-xs text-gray-500">{rooms.length} kontak</span>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                {rooms.map((item) => {
                  const isSelected = item.id === selectedRoomId;
                  const lastMsg = item.lastMessage;
                  const itemBookingCode = `JC-${item.booking_id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

                  return (
                    <Link
                      key={item.id}
                      href={`/staff/messages?room_id=${item.id}`}
                      className={`block p-3.5 text-left transition-colors ${
                        isSelected
                          ? "bg-amber-50 border-l-4 border-amber-600"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="min-w-0">
                          <strong className="text-xs text-gray-900 block truncate font-semibold">
                            {item.customer?.name || "Pelanggan"}
                          </strong>
                          <span className="text-[11px] text-gray-500 block truncate">
                            {getServiceName(item)} · {itemBookingCode}
                          </span>
                        </div>
                        {item.unreadCount > 0 && (
                          <span className="text-[10px] bg-amber-600 text-white font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
                            {item.unreadCount} baru
                          </span>
                        )}
                      </div>

                      {lastMsg ? (
                        <p className="text-xs text-gray-600 truncate mt-1">
                          <span className="font-semibold text-gray-700">
                            {lastMsg.sender_id === user.id ? "Anda: " : "Pelanggan: "}
                          </span>
                          {lastMsg.message}
                        </p>
                      ) : (
                        <p className="text-[11px] text-gray-400 italic mt-1">Belum ada obrolan</p>
                      )}

                      <div className="mt-1 text-[10px] text-gray-400 text-right">
                        {formatBookingDate(item.booking?.booking_date ?? "")}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </aside>

            {/* Right Column: Chat Conversation Thread */}
            <section className="lg:col-span-8 flex flex-col h-[38rem]">
              {selectedRoom ? (
                <ChatBox
                  roomId={selectedRoom.id}
                  initialMessages={activeMessages}
                  currentUserId={user.id}
                  partnerName={partnerName}
                  partnerRoleTitle={partnerRoleTitle}
                  partnerSubtitle={partnerSubtitle}
                  bookingCode={bookingCode}
                  returnUrl={`/staff/messages?room_id=${selectedRoom.id}`}
                />
              ) : (
                <div className="flex-1 bg-white rounded-xl border border-gray-200 flex items-center justify-center p-8 text-center text-gray-400">
                  <div>
                    <span className="text-4xl block mb-2">💬</span>
                    <p className="text-sm font-medium text-gray-700">Pilih salah satu tugas untuk koordinasi.</p>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
