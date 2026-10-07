import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { formatBookingDate, jakartaToday } from "../../../lib/bookings";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ tab?: string }>;

export default async function StaffTasksPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase, user }, params] = await Promise.all([
    requireRole(["staff"]),
    searchParams,
  ]);
  const activeTab = params.tab || "all";
  const today = jakartaToday();

  // Fetch only this staff's assigned schedules
  const { data: schedulesData, error } = await supabase
    .from("staff_schedules")
    .select(`
      id,
      booking_id,
      scheduled_date,
      start_time,
      end_time,
      status,
      notes,
      booking:bookings (
        id,
        address,
        housing_type,
        room_count,
        notes,
        status,
        customer_phone,
        services (name),
        customer:profiles!bookings_customer_id_fkey (name, phone)
      )
    `)
    .eq("staff_id", user.id)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  const rows = (schedulesData ?? []) as unknown as Array<{
    id: string;
    booking_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string | null;
    status: string;
    notes: string | null;
    booking: {
      id: string;
      address: string;
      housing_type: string | null;
      room_count: string | null;
      notes: string | null;
      status: string;
      customer_phone: string | null;
      services: { name: string } | { name: string }[] | null;
      customer: { name: string; phone: string | null } | null;
    } | null;
  }>;

  const filtered = rows.filter((item) => {
    if (activeTab === "today") return item.scheduled_date === today && item.status !== "cancelled";
    if (activeTab === "in_progress") return item.status === "in_progress" || item.status === "accepted";
    if (activeTab === "completed") return item.status === "completed";
    return item.status !== "cancelled";
  });

  const getServiceName = (item: typeof rows[0]) => {
    const s = item.booking?.services;
    return Array.isArray(s) ? s[0]?.name : s?.name;
  };

  return (
    <main className="role-page staff-dashboard">
      <div className="role-page-inner">
        <header className="role-page-heading">
          <p className="role-kicker">Daftar Pekerjaan Petugas</p>
          <h1>Tugas Kebersihan Saya</h1>
          <p>
            Daftar seluruh tugas kebersihan yang ditugaskan kepada Anda oleh admin. Buka lembar kerja untuk melihat lokasi dan memperbarui status saat bertugas.
          </p>
        </header>

        {/* Tab Filter */}
        <nav className="orders-filter mb-6" aria-label="Filter Pekerjaan">
          <Link href="/staff/tasks" aria-current={activeTab === "all" ? "page" : undefined}>
            Semua Tugas ({rows.filter((r) => r.status !== "cancelled").length})
          </Link>
          <Link
            href="/staff/tasks?tab=today"
            aria-current={activeTab === "today" ? "page" : undefined}
          >
            Hari Ini ({rows.filter((r) => r.scheduled_date === today && r.status !== "cancelled").length})
          </Link>
          <Link
            href="/staff/tasks?tab=in_progress"
            aria-current={activeTab === "in_progress" ? "page" : undefined}
          >
            Sedang Berjalan ({rows.filter((r) => ["accepted", "in_progress"].includes(r.status)).length})
          </Link>
          <Link
            href="/staff/tasks?tab=completed"
            aria-current={activeTab === "completed" ? "page" : undefined}
          >
            Selesai ({rows.filter((r) => r.status === "completed").length})
          </Link>
        </nav>

        {error ? (
          <p className="customer-notice customer-notice-error">Gagal memuat tugas kebersihan.</p>
        ) : filtered.length === 0 ? (
          <div className="customer-empty">
            <h2>Tidak Ada Tugas dalam Kategori Ini</h2>
            <p>Tugas yang ditugaskan oleh admin JoCleanCare akan muncul di halaman ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <article key={item.id} className="admin-card">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
                  <div>
                    <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block">
                      {formatBookingDate(item.scheduled_date)} · Pukul {String(item.start_time).slice(0, 5)} WIB
                    </span>
                    <h2 className="text-base font-bold text-gray-900 mt-0.5">
                      {getServiceName(item) || "Layanan Kebersihan"}
                    </h2>
                  </div>
                  <span className={`customer-status customer-status-${item.status}`}>
                    {item.status === "scheduled"
                      ? "Dijadwalkan"
                      : item.status === "accepted"
                      ? "Menuju Lokasi"
                      : item.status === "in_progress"
                      ? "Sedang Dikerjakan"
                      : "Selesai"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
                  <div>
                    <span className="font-semibold text-gray-800 block">Nama Pelanggan:</span>
                    <p>{item.booking?.customer?.name || "Customer"}</p>
                    {item.booking?.customer_phone && (
                      <p className="font-mono text-teal-700 mt-0.5">{item.booking.customer_phone}</p>
                    )}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800 block">Alamat Kunjungan:</span>
                    <p>{item.booking?.address}</p>
                  </div>
                  {item.booking?.housing_type && (
                    <div>
                      <span className="font-semibold text-gray-800 block">Tipe Properti:</span>
                      <p className="capitalize">{item.booking.housing_type} ({item.booking.room_count || "Semua ruangan"})</p>
                    </div>
                  )}
                  {item.notes && (
                    <div>
                      <span className="font-semibold text-gray-800 block">Catatan Penugasan:</span>
                      <p className="italic text-gray-500">{item.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end pt-2 border-t border-gray-100">
                  <Link
                    href={`/staff/orders/${item.booking_id}`}
                    className="admin-button admin-button-primary text-xs"
                  >
                    Buka Lembar Kerja & Update Status →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
