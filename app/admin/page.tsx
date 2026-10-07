import Link from "next/link";
import { requireRole } from "../../lib/auth/session";
import { jakartaToday } from "../../lib/bookings";
import {
  EmptyState,
  Feedback,
  formatDate,
  formatMoney,
  formatTime,
  PageHeading,
  StatusBadge,
} from "./_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireRole(["admin"]);
  const today = jakartaToday();

  const [
    customerCountRes,
    staffCountRes,
    todayBookingsRes,
    pendingRes,
    activeRes,
    completedRes,
    cancelledRes,
    totalBookingsRes,
    completedRevenueRes,
    recentRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "staff"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("booking_date", today),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).in("status", ["confirmed", "assigned", "in_progress"]),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("total_price").eq("status", "completed"),
    supabase
      .from("bookings")
      .select("id, booking_date, start_time, total_price, status, customer:profiles!bookings_customer_id_fkey(name), service:services(name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const totalCustomers = customerCountRes.count ?? 0;
  const totalStaff = staffCountRes.count ?? 0;
  const todayBookings = todayBookingsRes.count ?? 0;
  const pendingBookings = pendingRes.count ?? 0;
  const activeBookings = activeRes.count ?? 0;
  const completedBookings = completedRes.count ?? 0;
  const cancelledBookings = cancelledRes.count ?? 0;
  const totalBookings = totalBookingsRes.count ?? 0;

  // Calculate completed revenue
  const totalRevenue = (completedRevenueRes.data ?? []).reduce(
    (sum, b) => sum + Number(b.total_price || 0),
    0
  );

  const [params] = await Promise.all([searchParams]);
  const recentRows = (recentRes.data ?? []) as unknown as Array<{
    id: string;
    booking_date: string;
    start_time: string;
    total_price: number;
    status: string;
    customer: { name: string } | null;
    service: { name: string } | null;
  }>;

  return (
    <>
      <PageHeading
        eyebrow="Ikhtisar Bisnis JoCleanCare"
        title="Dashboard Utama"
        description="Ringkasan operasional bisnis kebersihan: status booking hari ini, tim petugas aktif, dan volume transaksi."
      />
      <Feedback success={params.ok} error={params.error} />

      {/* Primary KPI Grid */}
      <section aria-label="Prioritas operasional" className="admin-priority-metrics mb-4">
        <article className="admin-priority-metric">
          <p>Booking Menunggu Konfirmasi</p>
          <strong className="text-amber-700">{pendingBookings}</strong>
          <span>Pesanan baru yang membutuhkan verifikasi admin</span>
          <Link href="/admin/orders?status=pending">
            Tinjau booking pending <span aria-hidden="true">→</span>
          </Link>
        </article>
        <article className="admin-priority-metric">
          <p>Booking Aktif Berjalan</p>
          <strong className="text-teal-700">{activeBookings}</strong>
          <span>Dikonfirmasi, ditugaskan, atau sedang dibersihkan</span>
          <Link href="/admin/orders">
            Lihat aktivitas kerja <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>

      {/* Supporting Operational Metrics Grid */}
      <section aria-label="Ringkasan operasional" className="admin-supporting-metrics mb-6">
        <article>
          <p>Booking Hari Ini</p>
          <strong>{todayBookings}</strong>
          <span>Jadwal {today}</span>
        </article>
        <article>
          <p>Booking Selesai</p>
          <strong>{completedBookings}</strong>
          <span>Layanan berhasil tuntas</span>
        </article>
        <article>
          <p>Booking Dibatalkan</p>
          <strong>{cancelledBookings}</strong>
          <span>Batal oleh user/admin</span>
        </article>
        <article>
          <p>Total Customer</p>
          <strong>{totalCustomers}</strong>
          <span>Pelanggan terdaftar</span>
        </article>
        <article>
          <p>Total Staff</p>
          <strong>{totalStaff}</strong>
          <span>Petugas kebersihan</span>
        </article>
        <article>
          <p>Total Pendapatan Selesai</p>
          <strong className="text-teal-800">{formatMoney(totalRevenue)}</strong>
          <span>Dari {completedBookings} order selesai</span>
        </article>
      </section>

      {/* Recent Bookings Table */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Aktivitas Terkini</p>
            <h2>Booking Terbaru ({totalBookings} Total)</h2>
          </div>
          <Link href="/admin/orders" className="admin-text-link">
            Lihat semua pesanan <span aria-hidden="true">→</span>
          </Link>
        </div>

        {recentRes.error ? (
          <Feedback error="Data booking belum dapat dimuat. Coba muat ulang halaman." />
        ) : recentRows.length === 0 ? (
          <EmptyState
            title="Belum ada booking"
            description="Booking pelanggan akan muncul di sini setelah dibuat."
            href="/admin/orders"
            linkLabel="Buka pesanan"
          />
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table admin-recent-table">
              <thead>
                <tr>
                  <th>Customer / Layanan</th>
                  <th>Tanggal & Jam</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.customer?.name ?? "Customer"}</strong>
                      <span className="admin-cell-sub">{row.service?.name ?? "Layanan"}</span>
                    </td>
                    <td>
                      {formatDate(row.booking_date)}
                      <span className="admin-cell-sub">{formatTime(row.start_time)} WIB</span>
                    </td>
                    <td>{formatMoney(row.total_price)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>
                      <Link className="admin-row-link" href={`/admin/orders/${row.id}`}>
                        Buka Detail
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick shortcuts */}
      <section className="admin-shortcuts mt-6" aria-label="Navigasi operasional bisnis">
        {[
          ["/admin/orders", "Kelola Booking", "Periksa pemesanan baru, konfirmasi, dan assignment"],
          ["/admin/schedules", "Kalender Jadwal", "Lihat agenda kerja dan deteksi jadwal bentrok"],
          ["/admin/services", "Katalog Layanan", "Kelola paket kebersihan, harga, dan cakupan kerja"],
          ["/admin/addons", "Add-on Tambahan", "Atur opsi layanan ekstra seperti kulkas, oven, setrika"],
          ["/admin/staff", "Manajemen Staff", "Kelola profil petugas, rating, dan penugasan"],
          ["/admin/reports", "Laporan Bisnis", "Statistik pesanan, omset, dan ranking kepuasan"],
        ].map(([href, title, desc]) => (
          <Link href={href} className="admin-shortcut" key={href}>
            <span>{title}</span>
            <small>{desc}</small>
            <b aria-hidden="true">→</b>
          </Link>
        ))}
      </section>
    </>
  );
}
