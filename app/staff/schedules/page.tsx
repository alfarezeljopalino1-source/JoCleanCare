import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { bookingStatuses, formatBookingDate } from "../../../lib/bookings";

export const dynamic = "force-dynamic";

export default async function StaffSchedulesPage({
  searchParams,
}: PageProps<"/staff/schedules">) {
  const { supabase, user } = await requireRole(["staff"]);
  const params = await searchParams;
  const filter = params.filter === "completed" || params.filter === "active" ? params.filter : "all";

  let query = supabase
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
        status,
        services (name),
        customer:profiles!bookings_customer_id_fkey (name, phone)
      )
    `)
    .eq("staff_id", user.id)
    .order("scheduled_date", { ascending: false })
    .order("start_time", { ascending: true });

  if (filter === "completed") {
    query = query.eq("status", "completed");
  } else if (filter === "active") {
    query = query.not("status", "in", "(completed,cancelled)");
  }

  const { data: schedules, error } = await query;
  const rows = (schedules ?? []) as unknown as Array<{
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
      status: string;
      services: { name: string } | { name: string }[] | null;
      customer: { name: string; phone: string | null } | null;
    } | null;
  }>;

  const getServiceName = (item: typeof rows[0]) => {
    const s = item.booking?.services;
    return Array.isArray(s) ? s[0]?.name : s?.name;
  };

  return (
    <main className="role-page staff-schedules-page">
      <div className="role-page-inner">
        <header className="role-page-heading">
          <p className="role-kicker">Agenda Penugasan</p>
          <h1>Jadwal Kerja Petugas</h1>
          <p>Daftar seluruh jadwal kunjungan kebersihan yang ditugaskan kepada Anda.</p>
        </header>

        {/* Filter Bar */}
        <nav className="orders-filter" aria-label="Filter Jadwal">
          <Link href="/staff/schedules" aria-current={filter === "all" ? "page" : undefined}>
            Semua ({rows.length})
          </Link>
          <Link href="/staff/schedules?filter=active" aria-current={filter === "active" ? "page" : undefined}>
            Tugas Aktif
          </Link>
          <Link href="/staff/schedules?filter=completed" aria-current={filter === "completed" ? "page" : undefined}>
            Selesai
          </Link>
        </nav>

        {error ? (
          <p className="customer-notice customer-notice-error" role="alert">
            Gagal memuat jadwal kerja. Silakan coba lagi.
          </p>
        ) : rows.length === 0 ? (
          <div className="staff-empty-card">
            <p>Tidak ada jadwal kerja yang sesuai filter.</p>
            <Link href="/staff" className="customer-inline-link">
              ← Kembali ke dashboard petugas
            </Link>
          </div>
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tanggal & Jam</th>
                  <th>Layanan</th>
                  <th>Pelanggan</th>
                  <th>Alamat Kunjungan</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{formatBookingDate(row.scheduled_date)}</strong>
                      <span className="admin-cell-sub">
                        {String(row.start_time).slice(0, 5)} WIB {row.end_time ? `– ${String(row.end_time).slice(0, 5)} WIB` : ""}
                      </span>
                    </td>
                    <td><strong>{getServiceName(row) || "Layanan"}</strong></td>
                    <td>
                      {row.booking?.customer?.name || "Pelanggan"}
                      {row.booking?.customer?.phone && (
                        <span className="admin-cell-sub">{row.booking.customer.phone}</span>
                      )}
                    </td>
                    <td className="admin-address-cell">{row.booking?.address}</td>
                    <td>
                      <span className={`customer-status customer-status-${row.status}`}>
                        {bookingStatuses[row.status] ?? (row.status === "scheduled" ? "Terjadwal" : row.status)}
                      </span>
                    </td>
                    <td>
                      <Link href={`/staff/orders/${row.booking_id}`} className="admin-row-link">
                        Lembar Kerja →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
