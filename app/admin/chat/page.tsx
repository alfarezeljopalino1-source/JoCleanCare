import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { getRoomMessages, markRoomMessagesAsRead, type ChatMessage } from "../../../lib/chat";
import {
  Feedback,
  formatDate,
  PageHeading,
} from "../_components/admin-ui";
import { ChatBox } from "../../chat/chat-box";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  room_id?: string;
  type?: "admin" | "staff";
  ok?: string;
  error?: string;
}>;

type RoomListItem = {
  id: string;
  room_type: "admin" | "staff";
  updated_at: string;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  staff: { id: string; name: string; phone: string | null } | null;
  booking: {
    id: string;
    booking_date: string;
    start_time: string;
    status: string;
    service: { name: string } | null;
  } | null;
  unreadCount: number;
  lastMessage: ChatMessage | null;
};

function formatRoomDate(value?: string | null): string {
  if (!value || typeof value !== "string" || !value.trim()) return "—";
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default async function AdminChatPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase, user }, params] = await Promise.all([
    requireRole(["admin"]),
    searchParams,
  ]);

  const activeTab = params.type === "staff" ? "staff" : "admin";

  // 1. Fetch all chat rooms
  const { data: roomsRaw } = await supabase
    .from("chat_rooms")
    .select(`
      id,
      room_type,
      updated_at,
      customer:profiles!chat_rooms_customer_id_fkey (id, name, phone, email),
      staff:profiles!chat_rooms_staff_id_fkey (id, name, phone),
      booking:bookings (
        id,
        booking_date,
        start_time,
        status,
        service:services (name)
      )
    `)
    .order("updated_at", { ascending: false });

  // 2. Fetch recent messages across rooms to determine lastMessage & unread count
  const roomIds = (roomsRaw ?? []).map((r) => r.id);
  const roomMessagesMap: Record<string, ChatMessage[]> = {};
  const unreadCountMap: Record<string, number> = {};

  if (roomIds.length > 0) {
    const { data: messagesRaw } = await supabase
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

    if (messagesRaw) {
      for (const msg of messagesRaw as unknown as ChatMessage[]) {
        if (!roomMessagesMap[msg.room_id]) roomMessagesMap[msg.room_id] = [];
        roomMessagesMap[msg.room_id].push(msg);

        // If not sent by admin and unread
        if (msg.sender?.role !== "admin" && !msg.is_read) {
          unreadCountMap[msg.room_id] = (unreadCountMap[msg.room_id] || 0) + 1;
        }
      }
    }
  }

  // 3. Format rooms into structured lists
  const allRooms: RoomListItem[] = (roomsRaw ?? []).map((r) => {
    const msgs = roomMessagesMap[r.id] || [];
    const bookingObj = r.booking as unknown as RoomListItem["booking"];
    const serviceObj = Array.isArray(bookingObj?.service)
      ? bookingObj.service[0]
      : bookingObj?.service;

    return {
      id: r.id,
      room_type: r.room_type as "admin" | "staff",
      updated_at: r.updated_at,
      customer: r.customer as unknown as RoomListItem["customer"],
      staff: r.staff as unknown as RoomListItem["staff"],
      booking: bookingObj
        ? {
            ...bookingObj,
            service: serviceObj || null,
          }
        : null,
      unreadCount: unreadCountMap[r.id] || 0,
      lastMessage: msgs.length > 0 ? msgs[msgs.length - 1] : null,
    };
  });

  const adminSupportRooms = allRooms.filter((r) => r.room_type === "admin");
  const staffOperationalRooms = allRooms.filter((r) => r.room_type === "staff");

  const displayedRooms = activeTab === "admin" ? adminSupportRooms : staffOperationalRooms;

  // Determine active selected room
  const selectedRoomId =
    params.room_id ||
    (displayedRooms.length > 0 ? displayedRooms[0].id : null);

  const selectedRoom = allRooms.find((r) => r.id === selectedRoomId);

  if (selectedRoomId) {
    await markRoomMessagesAsRead(supabase, selectedRoomId);
  }

  const activeMessages = selectedRoomId
    ? await getRoomMessages(supabase, selectedRoomId)
    : [];

  const partnerName =
    selectedRoom?.room_type === "admin"
      ? selectedRoom.customer?.name || "Customer"
      : `${selectedRoom?.customer?.name || "Customer"} ↔ ${selectedRoom?.staff?.name || "Petugas"}`;

  const partnerSubtitle =
    selectedRoom?.room_type === "admin"
      ? `Email: ${selectedRoom.customer?.email || "-"} · No. Telp: ${selectedRoom.customer?.phone || "-"}`
      : `Booking #${selectedRoom?.booking?.id ? selectedRoom.booking.id.slice(0, 8).toUpperCase() : "-"} · ${
          selectedRoom?.booking?.service?.name || "Layanan"
        } (${formatDate(selectedRoom?.booking?.booking_date, "Tanggal tidak tersedia")})`;

  const bookingCode = selectedRoom?.booking?.id
    ? `JC-${selectedRoom.booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`
    : undefined;

  const totalAdminUnread = adminSupportRooms.reduce((acc, r) => acc + r.unreadCount, 0);
  const totalStaffUnread = staffOperationalRooms.reduce((acc, r) => acc + r.unreadCount, 0);

  return (
    <>
      <PageHeading
        eyebrow="Operasional Komunikasi"
        title="Pusat Chat & Bantuan"
        description="Kelola Customer Support Chat langsung dengan pelanggan, serta pantau koordinasi operasional antara Pelanggan dan Petugas Kebersihan secara terpisah."
      />
      <Feedback success={params.ok} error={params.error} />

      {/* Mode Switch Tabs: Admin Support vs Staff Operational */}
      <div className="flex border-b border-gray-200 mb-6 gap-2">
        <Link
          href="/admin/chat?type=admin"
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "admin"
              ? "border-teal-700 text-teal-800 bg-teal-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>🏢 Admin Support Chat</span>
          {totalAdminUnread > 0 && (
            <span className="bg-teal-700 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {totalAdminUnread}
            </span>
          )}
        </Link>
        <Link
          href="/admin/chat?type=staff"
          className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "staff"
              ? "border-amber-600 text-amber-800 bg-amber-50/50"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <span>🧹 Monitoring Chat Operasional Petugas</span>
          {totalStaffUnread > 0 && (
            <span className="bg-amber-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
              {totalStaffUnread}
            </span>
          )}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[36rem]">
        {/* Left Column: Room Threads List */}
        <aside className="lg:col-span-4 admin-card p-0 overflow-hidden flex flex-col h-[38rem]">
          <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              {activeTab === "admin" ? "Daftar Percakapan Support" : "Daftar Chat Booking Petugas"}
            </h2>
            <span className="text-xs text-gray-500">
              {displayedRooms.length} ruang
            </span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
            {displayedRooms.length === 0 ? (
              <p className="p-6 text-xs text-center text-gray-400">
                {activeTab === "admin"
                  ? "Belum ada tiket support dari pelanggan."
                  : "Belum ada ruang chat koordinasi petugas yang aktif."}
              </p>
            ) : (
              displayedRooms.map((room) => {
                const isSelected = room.id === selectedRoomId;
                const lastMsg = room.lastMessage;

                return (
                  <Link
                    key={room.id}
                    href={`/admin/chat?type=${activeTab}&room_id=${room.id}`}
                    className={`block p-3.5 transition-colors text-left ${
                      isSelected
                        ? "bg-teal-50 border-l-4 border-teal-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div className="min-w-0">
                        <strong className="text-xs text-gray-900 block truncate font-semibold">
                          {room.customer?.name || "Customer"}
                        </strong>
                        <span className="text-[11px] text-gray-500 block truncate">
                          {room.room_type === "admin"
                            ? room.customer?.phone || room.customer?.email || "Pertanyaan Layanan"
                            : `Petugas: ${room.staff?.name || "-"} · #${room.booking?.id ? room.booking.id.slice(0, 8) : "-"}`}
                        </span>
                      </div>
                      {room.unreadCount > 0 && (
                        <span className="bg-red-500 text-white font-bold text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0">
                          {room.unreadCount} baru
                        </span>
                      )}
                    </div>

                    {lastMsg ? (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        <span className="font-semibold text-gray-700">
                          {lastMsg.sender?.role === "admin"
                            ? "Admin: "
                            : lastMsg.sender?.role === "staff"
                            ? "Petugas: "
                            : "Cust: "}
                        </span>
                        {lastMsg.message}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic mt-1">Belum ada riwayat pesan</p>
                    )}

                    <div className="mt-1 text-[10px] text-gray-400 text-right">
                      {formatRoomDate(room.updated_at)}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Column: Chat Box Area */}
        <section className="lg:col-span-8 flex flex-col h-[38rem]">
          {selectedRoom ? (
            <ChatBox
              roomId={selectedRoom.id}
              initialMessages={activeMessages}
              currentUserId={user.id}
              partnerName={partnerName}
              partnerRoleTitle={selectedRoom.room_type === "admin" ? "Customer" : "Monitoring Koordinasi"}
              partnerSubtitle={partnerSubtitle}
              bookingCode={bookingCode}
              returnUrl={`/admin/chat?type=${activeTab}&room_id=${selectedRoom.id}`}
            />
          ) : (
            <div className="flex-1 bg-white rounded-xl border border-gray-200 flex items-center justify-center p-8 text-center text-gray-400">
              <div>
                <span className="text-4xl block mb-2">💬</span>
                <p className="text-sm font-medium text-gray-700">Pilih salah satu percakapan di sebelah kiri.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Pesan yang dikirim oleh Admin akan tersinkronisasi langsung ke pelanggan.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
