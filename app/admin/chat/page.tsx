import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { sendBookingMessageAction } from "../../actions/bookings";
import {
  Feedback,
  formatDate,
  PageHeading,
  StatusBadge,
} from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ booking_id?: string; ok?: string; error?: string }>;

type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  status: string;
  customer: { name: string; phone: string } | null;
  service: { name: string } | null;
  staff_schedules: Array<{
    status: string;
    staff: { name: string } | null;
  }>;
};

type MessageRow = {
  id: string;
  booking_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender: { name: string; role: string } | null;
};

export default async function AdminChatPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase }, params] = await Promise.all([
    requireRole(["admin"]),
    searchParams,
  ]);

  // 1. Fetch all bookings that have messages or are currently active
  const { data: bookingsRaw } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_date,
      start_time,
      status,
      customer:profiles!bookings_customer_id_fkey(name, phone),
      service:services(name),
      staff_schedules(
        staff:profiles!staff_schedules_staff_id_fkey(name),
        status
      )
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  // 2. Fetch all recent booking messages
  const { data: messagesRaw } = await supabase
    .from("booking_messages")
    .select(`
      id,
      booking_id,
      sender_id,
      message,
      created_at,
      sender:profiles!booking_messages_sender_id_fkey(name, role)
    `)
    .order("created_at", { ascending: true });

  // Supabase returns join results as objects but TS infers them as arrays — cast explicitly
  const allMessages = (messagesRaw ?? []) as unknown as MessageRow[];
  const bookings = (bookingsRaw ?? []) as unknown as BookingRow[];

  // Group messages count by booking
  const messageCounts: Record<string, number> = {};
  const lastMessages: Record<string, MessageRow> = {};
  for (const msg of allMessages) {
    messageCounts[msg.booking_id] = (messageCounts[msg.booking_id] || 0) + 1;
    lastMessages[msg.booking_id] = msg;
  }

  // Determine active selected booking
  const activeBookingId =
    params.booking_id ||
    (allMessages.length > 0 ? allMessages[allMessages.length - 1].booking_id : bookings[0]?.id);

  const selectedBooking = bookings.find((b) => b.id === activeBookingId);
  const activeThreadMessages = allMessages.filter((m) => m.booking_id === activeBookingId);

  const activeStaff = selectedBooking?.staff_schedules
    ?.filter((s) => s.status !== "cancelled")
    ?.map((s) => s.staff?.name)
    ?.filter(Boolean)
    ?.join(", ");

  return (
    <>
      <PageHeading
        eyebrow="Operasional Komunikasi"
        title="Chat Operasional Booking"
        description="Pantau percakapan langsung antara Pelanggan dan Petugas Kebersihan. Administrator dapat memantau koordinasi lapangan dan mengirim arahan bila dibutuhkan."
      />
      <Feedback success={params.ok} error={params.error} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-144">
        {/* Left column: Booking Threads List */}
        <aside className="lg:col-span-4 admin-card p-0 overflow-hidden flex flex-col h-152">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-bold text-gray-800">Daftar Percakapan Booking</h2>
            <span className="text-xs text-gray-500">
              {bookings.filter((b) => messageCounts[b.id]).length} percakapan dengan pesan
            </span>
          </div>

          <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
            {bookings.length === 0 ? (
              <p className="p-4 text-xs text-gray-400">Belum ada booking tersedia.</p>
            ) : (
              bookings.map((b) => {
                const count = messageCounts[b.id] || 0;
                const lastMsg = lastMessages[b.id];
                const isSelected = b.id === activeBookingId;

                return (
                  <Link
                    key={b.id}
                    href={`/admin/chat?booking_id=${b.id}`}
                    className={`block p-3 transition-colors text-left ${
                      isSelected
                        ? "bg-teal-50 border-l-4 border-teal-600"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <div>
                        <strong className="text-xs text-gray-900 block truncate max-w-40">
                          {b.customer?.name || "Customer"}
                        </strong>
                        <span className="text-[11px] text-gray-500 block truncate">
                          {b.service?.name} · #{b.id.slice(0, 8)}
                        </span>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>

                    {lastMsg ? (
                      <p className="text-xs text-gray-600 truncate mt-1">
                        <span className="font-semibold text-gray-700">
                          {lastMsg.sender?.role === "admin"
                            ? "Admin: "
                            : lastMsg.sender?.role === "staff"
                            ? "Staff: "
                            : "Cust: "}
                        </span>
                        {lastMsg.message}
                      </p>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic mt-1">Belum ada pesan</p>
                    )}

                    <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400">
                      <span>{formatDate(b.booking_date)}</span>
                      {count > 0 && (
                        <span className="bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded-full">
                          {count} pesan
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        {/* Right column: Active Chat Thread */}
        <section className="lg:col-span-8 admin-card p-0 flex flex-col h-152 overflow-hidden">
          {selectedBooking ? (
            <>
              {/* Thread Header */}
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-gray-900">
                      Booking #{selectedBooking.id.slice(0, 8)} · {selectedBooking.service?.name}
                    </h2>
                    <StatusBadge status={selectedBooking.status} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Customer: <strong>{selectedBooking.customer?.name}</strong>{" "}
                    {selectedBooking.customer?.phone && `(${selectedBooking.customer.phone})`} · Petugas:{" "}
                    <strong>{activeStaff || "Belum ditugaskan"}</strong>
                  </p>
                </div>
                <Link
                  href={`/admin/orders/${selectedBooking.id}`}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  Buka Order →
                </Link>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbfdfc]">
                {activeThreadMessages.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <span className="text-3xl block mb-2">💬</span>
                    <p className="text-sm font-medium">Belum ada pesan untuk booking ini.</p>
                    <p className="text-xs">Kirim pesan pembuka di bawah ini jika diperlukan.</p>
                  </div>
                ) : (
                  activeThreadMessages.map((msg) => {
                    const isSenderAdmin = msg.sender?.role === "admin";
                    const isSenderStaff = msg.sender?.role === "staff";

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${
                          isSenderAdmin ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-3 text-xs shadow-xs ${
                            isSenderAdmin
                              ? "bg-teal-700 text-white"
                              : isSenderStaff
                              ? "bg-amber-50 text-gray-900 border border-amber-200"
                              : "bg-white text-gray-900 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <span
                              className={`font-bold text-[10px] uppercase tracking-wider ${
                                isSenderAdmin
                                  ? "text-teal-200"
                                  : isSenderStaff
                                  ? "text-amber-800"
                                  : "text-gray-500"
                              }`}
                            >
                              {msg.sender?.name || "Pengguna"}{" "}
                              {isSenderAdmin ? "(Admin)" : isSenderStaff ? "(Petugas)" : "(Pelanggan)"}
                            </span>
                            <span
                              className={`text-[9px] ${
                                isSenderAdmin ? "text-teal-200" : "text-gray-400"
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

              {/* Chat Input Form */}
              <div className="p-3 bg-white border-t border-gray-200">
                <form action={sendBookingMessageAction} className="flex gap-2">
                  <input type="hidden" name="booking_id" value={selectedBooking.id} />
                  <input
                    name="message"
                    required
                    maxLength={2000}
                    placeholder="Tulis pesan instruksi atau balasan sebagai Admin JoCleanCare..."
                    className="flex-1 text-xs border border-gray-300 rounded px-3 py-2 focus:outline-teal-600"
                  />
                  <button
                    type="submit"
                    className="admin-button admin-button-primary text-xs px-4 py-2"
                  >
                    Kirim Arahan
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-gray-400 text-sm">
              Pilih salah satu booking di sebelah kiri untuk melihat pesan.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
