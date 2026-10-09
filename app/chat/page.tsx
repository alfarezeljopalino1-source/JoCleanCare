import Link from "next/link";
import { requireRole } from "../../lib/auth/session";
import {
  getOrCreateAdminRoom,
  getOrCreateStaffRoom,
  getRoomMessages,
  markRoomMessagesAsRead,
} from "../../lib/chat";
import { formatBookingDate } from "../../lib/bookings";
import { ChatBox } from "./chat-box";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  room_id?: string;
  booking_id?: string;
  tab?: string;
  error?: string;
  ok?: string;
}>;

type StaffChatOption = {
  bookingId: string;
  bookingCode: string;
  serviceName: string;
  scheduledDate: string;
  startTime: string;
  staffName: string;
  staffPhone?: string | null;
  roomId: string | null;
  unreadCount: number;
};

export default async function CustomerChatPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ supabase, user }, params] = await Promise.all([
    requireRole(["customer"]),
    searchParams,
  ]);

  // 1. Get or create Admin Support Room
  const adminRoomId = await getOrCreateAdminRoom(supabase, user.id);

  // 2. Fetch customer bookings with assigned staff
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_date,
      start_time,
      status,
      services(name),
      staff_schedules(
        status,
        staff:profiles!staff_schedules_staff_id_fkey(id, name, phone)
      )
    `)
    .eq("customer_id", user.id)
    .not("status", "in", "(cancelled)")
    .order("created_at", { ascending: false });

  // 3. Process staff chat rooms per booking
  const staffChatOptions: StaffChatOption[] = [];
  const unassignedBookings: Array<{ id: string; bookingCode: string; serviceName: string }> = [];

  if (bookingsRaw && bookingsRaw.length > 0) {
    for (const b of bookingsRaw) {
      const bookingCode = `JC-${b.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      const serviceObj = Array.isArray(b.services) ? b.services[0] : b.services;
      const serviceName = serviceObj?.name || "Layanan Kebersihan";

      // Check assigned staff
      const activeSchedule = b.staff_schedules?.find(
        (s) => {
          const st = (Array.isArray(s.staff) ? s.staff[0] : s.staff) as { name?: string; phone?: string | null } | null;
          return s.status !== "cancelled" && Boolean(st?.name);
        },
      );

      const staffMember = activeSchedule
        ? (Array.isArray(activeSchedule.staff) ? activeSchedule.staff[0] : activeSchedule.staff)
        : null;

      if (staffMember) {
        // Staff assigned -> initialize/get staff room
        const staffRoomId = await getOrCreateStaffRoom(supabase, b.id);
        let unread = 0;
        if (staffRoomId) {
          const { count } = await supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("room_id", staffRoomId)
            .neq("sender_id", user.id)
            .eq("is_read", false);
          unread = count ?? 0;
        }

        staffChatOptions.push({
          bookingId: b.id,
          bookingCode,
          serviceName,
          scheduledDate: b.booking_date,
          startTime: String(b.start_time).slice(0, 5),
          staffName: staffMember.name,
          staffPhone: staffMember.phone,
          roomId: staffRoomId,
          unreadCount: unread,
        });
      } else {
        unassignedBookings.push({
          id: b.id,
          bookingCode,
          serviceName,
        });
      }
    }
  }

  // 4. Fetch Admin room unread count
  let adminUnreadCount = 0;
  if (adminRoomId) {
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("room_id", adminRoomId)
      .neq("sender_id", user.id)
      .eq("is_read", false);
    adminUnreadCount = count ?? 0;
  }

  // 5. Total staff unread count
  const totalStaffUnread = staffChatOptions.reduce((acc, opt) => acc + opt.unreadCount, 0);

  // 6. Determine selected room
  let selectedRoomId = adminRoomId;
  let currentRoomType: "admin" | "staff" = "admin";
  let partnerName = "Admin JoCleanCare";
  let partnerRoleTitle = "Customer Support";
  let partnerSubtitle = "Bantuan umum, info layanan, pembayaran, dan komplain.";
  let bookingCode: string | undefined = undefined;

  // Check if booking_id was requested
  if (params.booking_id) {
    const matched = staffChatOptions.find((opt) => opt.bookingId === params.booking_id);
    if (matched && matched.roomId) {
      selectedRoomId = matched.roomId;
      currentRoomType = "staff";
      partnerName = matched.staffName;
      partnerRoleTitle = "Petugas Kebersihan";
      partnerSubtitle = `Koordinasi langsung untuk ${matched.serviceName} (${matched.scheduledDate})`;
      bookingCode = matched.bookingCode;
    }
  } else if (params.room_id) {
    const matchedStaff = staffChatOptions.find((opt) => opt.roomId === params.room_id);
    if (matchedStaff && matchedStaff.roomId) {
      selectedRoomId = matchedStaff.roomId;
      currentRoomType = "staff";
      partnerName = matchedStaff.staffName;
      partnerRoleTitle = "Petugas Kebersihan";
      partnerSubtitle = `Koordinasi langsung untuk ${matchedStaff.serviceName} (${matchedStaff.scheduledDate})`;
      bookingCode = matchedStaff.bookingCode;
    } else if (params.room_id === adminRoomId) {
      selectedRoomId = adminRoomId;
      currentRoomType = "admin";
    }
  }

  // Mark room messages as read on server load if roomId exists
  if (selectedRoomId) {
    await markRoomMessagesAsRead(supabase, selectedRoomId);
  }

  // Fetch initial messages for active room
  const initialMessages = selectedRoomId
    ? await getRoomMessages(supabase, selectedRoomId)
    : [];

  return (
    <main className="customer-page chat-page py-6">
      <div className="customer-container max-w-6xl">
        {/* Page Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="customer-overline">Pusat Komunikasi</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                Pesan & Bantuan
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Pilih ruang percakapan untuk menghubungi tim Customer Support atau Petugas di lapangan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard" className="customer-back-link">
                <span aria-hidden="true">←</span> Dashboard
              </Link>
              <Link href="/orders" className="customer-button customer-button-secondary text-xs">
                Pesanan
              </Link>
            </div>
          </div>
        </header>

        {params.error && (
          <div className="customer-notice customer-notice-error mb-4" role="alert">
            ✕ {params.error}
          </div>
        )}

        {/* Chat Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[36rem]">
          {/* Left Sidebar: Room List */}
          <aside className="lg:col-span-4 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs flex flex-col h-[36rem]">
            {/* Header / Tabs */}
            <div className="p-3.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Daftar Ruang Chat
              </span>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span className="text-teal-700">
                  Admin ({adminUnreadCount})
                </span>
                <span className="text-gray-300">|</span>
                <span className="text-amber-700">
                  Petugas ({totalStaffUnread})
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {/* SECTION 1: ADMIN CHAT ROOM */}
              <div className="p-2">
                <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  🏢 Bantuan Resmi
                </div>
                <Link
                  href={`/chat?room_id=${adminRoomId}`}
                  className={`flex items-start justify-between p-3 rounded-lg transition-colors text-left ${
                    currentRoomType === "admin"
                      ? "bg-teal-50 border border-teal-200"
                      : "hover:bg-gray-50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                      JC
                    </span>
                    <div className="min-w-0">
                      <strong className="text-xs text-gray-900 block truncate font-semibold">
                        Admin JoCleanCare
                      </strong>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        Bantuan, booking, layanan & komplain
                      </p>
                    </div>
                  </div>
                  {adminUnreadCount > 0 && (
                    <span className="bg-teal-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full ml-2">
                      {adminUnreadCount}
                    </span>
                  )}
                </Link>
              </div>

              {/* SECTION 2: STAFF CHAT ROOMS */}
              <div className="p-2">
                <div className="px-2 py-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                  <span>🧹 Chat Petugas Lapangan</span>
                  {staffChatOptions.length > 0 && (
                    <span className="text-[10px] font-semibold text-gray-500">
                      {staffChatOptions.length} tugas
                    </span>
                  )}
                </div>

                {staffChatOptions.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500 font-medium">
                      Belum ada petugas yang ditugaskan.
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Ruang chat petugas akan aktif otomatis setelah admin menugaskan staf pada booking Anda.
                    </p>
                  </div>
                ) : (
                  staffChatOptions.map((opt) => {
                    const isSelected = currentRoomType === "staff" && selectedRoomId === opt.roomId;

                    return (
                      <Link
                        key={opt.bookingId}
                        href={`/chat?booking_id=${opt.bookingId}`}
                        className={`flex items-start justify-between p-3 rounded-lg transition-colors text-left mb-1 ${
                          isSelected
                            ? "bg-amber-50 border border-amber-300"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {opt.staffName.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <strong className="text-xs text-gray-900 block truncate font-semibold">
                                {opt.staffName}
                              </strong>
                              <span className="text-[10px] bg-gray-100 text-gray-600 px-1 rounded font-mono">
                                {opt.bookingCode}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {opt.serviceName} · {formatBookingDate(opt.scheduledDate)}
                            </p>
                          </div>
                        </div>

                        {opt.unreadCount > 0 && (
                          <span className="bg-amber-600 text-white font-bold text-[10px] px-2 py-0.5 rounded-full ml-2">
                            {opt.unreadCount}
                          </span>
                        )}
                      </Link>
                    );
                  })
                )}

                {/* Unassigned Bookings Note */}
                {unassignedBookings.length > 0 && (
                  <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <p className="text-[11px] text-gray-500 font-medium">
                      Pesanan dalam proses penjadwalan ({unassignedBookings.length}):
                    </p>
                    <ul className="mt-1 space-y-1">
                      {unassignedBookings.map((ub) => (
                        <li key={ub.id} className="text-[10px] text-gray-400 flex justify-between">
                          <span>{ub.bookingCode} · {ub.serviceName}</span>
                          <span className="italic">Menunggu Petugas</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right Main Chat Area */}
          <section className="lg:col-span-8 flex flex-col h-[36rem]">
            {selectedRoomId ? (
              <ChatBox
                roomId={selectedRoomId}
                initialMessages={initialMessages}
                currentUserId={user.id}
                partnerName={partnerName}
                partnerRoleTitle={partnerRoleTitle}
                partnerSubtitle={partnerSubtitle}
                bookingCode={bookingCode}
                returnUrl={`/chat?room_id=${selectedRoomId}`}
              />
            ) : (
              <div className="flex-1 bg-white rounded-xl border border-gray-200 flex items-center justify-center p-8 text-center text-gray-400">
                <div>
                  <span className="text-4xl block mb-2">💬</span>
                  <p className="text-sm font-medium text-gray-700">Pilih salah satu ruang chat di sebelah kiri</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Hubungi Admin JoCleanCare untuk pertanyaan umum, atau Petugas terkait pesanan Anda.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
