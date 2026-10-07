import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { sendBookingMessageAction } from "../../actions/bookings";
import { formatBookingDate } from "../../../lib/bookings";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ booking_id?: string; ok?: string; error?: string }>;

export default async function StaffMessagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ supabase, user }, params] = await Promise.all([
    requireRole(["staff"]),
    searchParams,
  ]);

  // Fetch only bookings assigned to this staff member
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
        customer:profiles!bookings_customer_id_fkey (name, phone)
      )
    `)
    .eq("staff_id", user.id)
    .neq("status", "cancelled")
    .order("scheduled_date", { ascending: false });

  const assignedBookings = (staffSchedules ?? []) as unknown as Array<{
    booking_id: string;
    scheduled_date: string;
    start_time: string;
    status: string;
    booking: {
      id: string;
      address: string;
      status: string;
      customer_phone: string | null;
      services: { name: string } | { name: string }[] | null;
      customer: { name: string; phone: string | null } | null;
    } | null;
  }>;

  const bookingIds = assignedBookings.map((b) => b.booking_id);

  // Fetch messages belonging only to these assigned bookings
  let messagesData: Array<{
    id: string;
    booking_id: string;
    sender_id: string;
    message: string;
    created_at: string;
    sender: { name: string; role: string } | null;
  }> = [];

  if (bookingIds.length > 0) {
    const { data: msgs } = await supabase
      .from("booking_messages")
      .select(`
        id,
        booking_id,
        sender_id,
        message,
        created_at,
        sender:profiles!booking_messages_sender_id_fkey (name, role)
      `)
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: true });
    messagesData = (msgs ?? []) as unknown as typeof messagesData;
  }

  // Determine active selected booking
  const selectedBookingId =
    params.booking_id ||
    (bookingIds.length > 0 ? bookingIds[0] : null);

  const selectedItem = assignedBookings.find((b) => b.booking_id === selectedBookingId);
  const activeThreadMessages = messagesData.filter((m) => m.booking_id === selectedBookingId);

  const getService = (item: typeof assignedBookings[0] | undefined) => {
    const s = item?.booking?.services;
    return Array.isArray(s) ? s[0]?.name : s?.name;
  };

  return (
    <main className="role-page staff-dashboard">
      <div className="role-page-inner">
        <header className="role-page-heading">
          <p className="role-kicker">Komunikasi Lapangan</p>
          <h1>Pesan & Koordinasi Pelanggan</h1>
          <p>
            Koordinasi langsung dengan pelanggan mengenai alamat, instruksi khusus, atau perkiraan waktu tiba di lokasi.
          </p>
        </header>

        {params.error && (
          <p className="customer-notice customer-notice-error">{params.error}</p>
        )}

        {assignedBookings.length === 0 ? (
          <div className="customer-empty">
            <h2>Belum Ada Tugas Aktif</h2>
            <p>Pesan akan tersedia setelah Anda menerima penugasan pekerjaan dari admin.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[34rem]">
            {/* Left Column: Assigned Booking Chat List */}
            <aside className="lg:col-span-4 admin-card p-0 flex flex-col h-[36rem] overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-bold text-gray-800">Daftar Kontak Tugas Anda</h2>
                <span className="text-xs text-gray-500">{assignedBookings.length} pekerjaan ditugaskan</span>
              </div>

              <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                {assignedBookings.map((item) => {
                  const isSelected = item.booking_id === selectedBookingId;
                  const itemMsgs = messagesData.filter((m) => m.booking_id === item.booking_id);
                  const lastMsg = itemMsgs[itemMsgs.length - 1];

                  return (
                    <Link
                      key={item.booking_id}
                      href={`/staff/messages?booking_id=${item.booking_id}`}
                      className={`block p-3 text-left transition-colors ${
                        isSelected
                          ? "bg-teal-50 border-l-4 border-teal-600"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <strong className="text-xs text-gray-900 block truncate">
                          {item.booking?.customer?.name || "Customer"}
                        </strong>
                        <span className="text-[10px] text-teal-800 font-semibold bg-teal-100 px-1.5 py-0.5 rounded">
                          {item.status}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 block truncate">
                        {getService(item)} · {formatBookingDate(item.scheduled_date)}
                      </span>
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
                    </Link>
                  );
                })}
              </div>
            </aside>

            {/* Right Column: Chat Conversation Thread */}
            <section className="lg:col-span-8 admin-card p-0 flex flex-col h-[36rem] overflow-hidden">
              {selectedItem ? (
                <>
                  {/* Chat Header */}
                  <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">
                        Chat: {selectedItem.booking?.customer?.name || "Customer"}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {getService(selectedItem)} · {formatBookingDate(selectedItem.scheduled_date)} pukul{" "}
                        {String(selectedItem.start_time).slice(0, 5)} WIB
                      </p>
                    </div>
                    <Link
                      href={`/staff/orders/${selectedItem.booking_id}`}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Lihat Lembar Tugas →
                    </Link>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fdfefd]">
                    {activeThreadMessages.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <span className="text-3xl block mb-2">💬</span>
                        <p className="text-sm font-medium">Belum ada riwayat pesan dengan pelanggan ini.</p>
                        <p className="text-xs">
                          Kirim pesan untuk mengabarkan bahwa Anda sedang bersiap atau menanyakan patokan alamat.
                        </p>
                      </div>
                    ) : (
                      activeThreadMessages.map((msg) => {
                        const isStaff = msg.sender_id === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isStaff ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-lg p-3 text-xs shadow-xs ${
                                isStaff
                                  ? "bg-teal-700 text-white"
                                  : "bg-white text-gray-900 border border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span
                                  className={`font-bold text-[10px] uppercase tracking-wider ${
                                    isStaff ? "text-teal-200" : "text-gray-500"
                                  }`}
                                >
                                  {isStaff ? "Anda (Petugas)" : msg.sender?.name || "Pelanggan"}
                                </span>
                                <span
                                  className={`text-[9px] ${
                                    isStaff ? "text-teal-200" : "text-gray-400"
                                  }`}
                                >
                                  {new Date(msg.created_at).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 bg-white border-t border-gray-200">
                    <form action={sendBookingMessageAction} className="flex gap-2">
                      <input type="hidden" name="booking_id" value={selectedItem.booking_id} />
                      <input
                        name="message"
                        required
                        maxLength={2000}
                        placeholder="Ketik pesan untuk pelanggan..."
                        className="flex-1 text-xs border border-gray-300 rounded px-3 py-2 focus:outline-teal-600"
                      />
                      <button
                        type="submit"
                        className="admin-button admin-button-primary text-xs px-4 py-2"
                      >
                        Kirim Pesan
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-6 text-gray-400 text-sm">
                  Pilih salah satu tugas untuk melihat pesan.
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
