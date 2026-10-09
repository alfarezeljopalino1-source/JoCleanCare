import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { assignStaffAction } from "../actions";
import {
  EmptyState,
  Feedback,
  formatDate,
  formatTime,
  PageHeading,
  StatusBadge,
} from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ ok?: string; error?: string; staff_id?: string; date?: string }>;

export default async function AdminSchedulesPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase }, params] = await Promise.all([requireRole(["admin"]), searchParams]);
  const filterStaffId = params.staff_id || "";
  const filterDate = params.date || "";

  const [
    { data: bookings, error: bookingError },
    { data: staffData, error: staffError },
    { data: scheduleData, error: scheduleError },
  ] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, booking_date, start_time, status, customer:profiles!bookings_customer_id_fkey(name), service:services(name)")
      .in("status", ["confirmed", "assigned"])
      .order("booking_date"),
    supabase.from("profiles").select("id, name, is_active").eq("role", "staff").order("name"),
    supabase
      .from("staff_schedules")
      .select(`
        id,
        booking_id,
        staff_id,
        scheduled_date,
        start_time,
        end_time,
        status,
        notes,
        staff:profiles!staff_schedules_staff_id_fkey(name),
        booking:bookings(status, customer:profiles!bookings_customer_id_fkey(name), service:services(name))
      `)
      .order("scheduled_date", { ascending: false })
      .limit(300),
  ]);

  const scheduleRows = (scheduleData ?? []) as unknown as Array<{
    id: string;
    booking_id: string;
    staff_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string | null;
    status: string;
    notes: string | null;
    staff: { name: string } | null;
    booking: {
      status: string;
      customer: { name: string } | { name: string }[] | null;
      service: { name: string } | { name: string }[] | null;
    } | null;
  }>;

  const bookingRows = (bookings ?? []) as unknown as Array<{
    id: string;
    booking_date: string;
    start_time: string;
    status: string;
    customer: { name: string } | { name: string }[] | null;
    service: { name: string } | { name: string }[] | null;
  }>;

  const one = <T,>(value: T | T[] | null | undefined): T | null =>
    Array.isArray(value) ? value[0] ?? null : value ?? null;

  const activeRows = scheduleRows.filter((row) => row.status !== "cancelled");

  // Conflict Detection Algorithm
  // Find if any staff has overlapping schedules on the same day
  const conflicts: Array<{ staffName: string; date: string; time: string; bookingIds: string[] }> = [];
  const staffDaySlots: Record<string, typeof activeRows> = {};

  for (const row of activeRows) {
    if (row.status === "completed") continue;
    const key = `${row.staff_id}_${row.scheduled_date}`;
    if (!staffDaySlots[key]) staffDaySlots[key] = [];
    staffDaySlots[key].push(row);
  }

  for (const group of Object.values(staffDaySlots)) {
    if (group.length > 1) {
      // Check if time overlaps
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          if (a.start_time === b.start_time) {
            conflicts.push({
              staffName: a.staff?.name || "Petugas",
              date: a.scheduled_date,
              time: formatTime(a.start_time),
              bookingIds: [a.booking_id.slice(0, 8), b.booking_id.slice(0, 8)],
            });
          }
        }
      }
    }
  }

  // Filtered rows for calendar view
  let displayedRows = activeRows;
  if (filterStaffId) {
    displayedRows = displayedRows.filter((r) => r.staff_id === filterStaffId);
  }
  if (filterDate) {
    displayedRows = displayedRows.filter((r) => r.scheduled_date === filterDate);
  }

  return (
    <>
      <PageHeading
        eyebrow="Kalender Operasional"
        title="Jadwal & Penugasan Petugas"
        description="Kelola penugasan staf kebersihan ke setiap pesanan, pantau kalender kerja harian, dan deteksi potensi konflik jadwal bentrok."
      />
      <Feedback success={params.ok} error={params.error} />

      {/* Conflict Alert Banner */}
      {conflicts.length > 0 && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-xs text-red-900">
          <strong className="block text-sm font-bold text-red-800 mb-1">
            ⚠️ Terdeteksi {conflicts.length} Konflik Jadwal Bentrok!
          </strong>
          <ul className="list-disc list-inside space-y-1">
            {conflicts.map((c, idx) => (
              <li key={idx}>
                <strong>{c.staffName}</strong> memiliki jadwal ganda pada tanggal{" "}
                <strong>{formatDate(c.date)}</strong> pukul <strong>{c.time} WIB</strong> (Booking:{" "}
                {c.bookingIds.join(" & ")}). Segera sesuaikan petugas pengganti.
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Assignment Form Card */}
      <section className="admin-card admin-form-card mb-6">
        <div>
          <p className="admin-eyebrow">Penugasan Baru</p>
          <h2>Jadwalkan Petugas ke Booking</h2>
          <p className="text-xs text-gray-500 mt-1">
            Penugasan akan otomatis memperbarui status booking menjadi &quot;assigned&quot; dan mengirim notifikasi in-app ke petugas terkait.
          </p>
        </div>

        {bookingError || staffError ? (
          <Feedback error="Pilihan booking atau petugas belum dapat dimuat." />
        ) : bookingRows.length && staffData?.length ? (
          <form action={assignStaffAction} noValidate className="admin-service-form admin-schedule-form">
            <label className="admin-span-all">
              Pilih Booking yang Siap Ditugaskan
              <select name="booking_id" required defaultValue="">
                <option value="" disabled>
                  Pilih booking (status confirmed atau assigned)
                </option>
                {bookingRows.map((booking) => (
                  <option value={booking.id} key={booking.id}>
                    #{booking.id.slice(0, 8)} · {one(booking.customer)?.name ?? "Customer"} ·{" "}
                    {one(booking.service)?.name ?? "Layanan"} · {formatDate(booking.booking_date)} (
                    {booking.status})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Pilih Petugas Kebersihan
              <select name="staff_id" required defaultValue="">
                <option value="" disabled>
                  Pilih Petugas Aktif
                </option>
                {staffData.map((person) => (
                  <option value={person.id} key={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tanggal Layanan
              <input name="scheduled_date" type="date" required />
            </label>
            <label>
              Waktu Mulai
              <input name="start_time" type="time" required />
            </label>
            <label>
              Waktu Selesai (Opsional)
              <input name="end_time" type="time" />
            </label>
            <label className="admin-span-all">
              Catatan Khusus untuk Petugas
              <textarea
                name="notes"
                rows={2}
                maxLength={1000}
                placeholder="Instruksi perlengkapan khusus, kontak darurat, atau akses kunci hunian..."
              />
            </label>
            <button className="admin-button admin-button-primary admin-span-all" type="submit">
              Simpan Jadwal & Kirim Tugas
            </button>
          </form>
        ) : (
          <p className="admin-inline-note">
            Penjadwalan memerlukan setidaknya satu petugas aktif dan booking berstatus dikonfirmasi atau ditugaskan.
          </p>
        )}
      </section>

      {/* Calendar Filter Bar */}
      <form method="get" className="admin-filter-bar mb-6">
        <label>
          Filter Petugas:
          <select name="staff_id" defaultValue={filterStaffId}>
            <option value="">Semua Petugas</option>
            {(staffData ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Filter Tanggal:
          <input type="date" name="date" defaultValue={filterDate} />
        </label>
        <button type="submit" className="admin-button admin-button-primary">
          Terapkan Filter
        </button>
        {(filterStaffId || filterDate) && (
          <Link href="/admin/schedules" className="admin-button admin-button-quiet">
            Reset
          </Link>
        )}
      </form>

      {/* Schedule Agenda Table */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Agenda Kalender</p>
            <h2>{displayedRows.length} Penugasan Aktif</h2>
          </div>
        </div>

        {scheduleError ? (
          <Feedback error="Jadwal belum dapat dimuat. Coba lagi nanti." />
        ) : displayedRows.length === 0 ? (
          <EmptyState
            title="Tidak ada jadwal yang cocok"
            description="Penugasan yang dibuat admin akan tercatat di sini."
          />
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table admin-schedules-table">
              <thead>
                <tr>
                  <th>Tanggal & Waktu</th>
                  <th>ID Booking</th>
                  <th>Layanan & Customer</th>
                  <th>Petugas Lapangan</th>
                  <th>Status Tugas</th>
                  <th>Status Booking</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {displayedRows.map((row) => {
                  const booking = one(row.booking);
                  const service = one(booking?.service);
                  const customer = one(booking?.customer);
                  return (
                    <tr key={row.id}>
                      <td>
                        {formatDate(row.scheduled_date)}
                        <span className="admin-cell-sub">
                          {formatTime(row.start_time)}
                          {row.end_time ? `–${formatTime(row.end_time)}` : "–selesai"} WIB
                        </span>
                      </td>
                      <td>
                        <code className="admin-id">#{row.booking_id.slice(0, 8)}</code>
                      </td>
                      <td>
                        <strong>{service?.name ?? "Layanan"}</strong>
                        <span className="admin-cell-sub">{customer?.name ?? "Customer"}</span>
                      </td>
                      <td>
                        <strong>{row.staff?.name ?? "Petugas"}</strong>
                      </td>
                      <td>
                        <span className="admin-status admin-status-neutral">{row.status}</span>
                      </td>
                      <td>{booking?.status && <StatusBadge status={booking.status} />}</td>
                      <td>
                        <Link className="admin-row-link" href={`/admin/orders/${row.booking_id}`}>
                          Buka Detail
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
