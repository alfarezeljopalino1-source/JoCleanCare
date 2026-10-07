import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { assignStaffAction } from "../actions";
import { EmptyState, Feedback, formatDate, formatTime, PageHeading, StatusBadge } from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function AdminSchedulesPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase }, params] = await Promise.all([requireRole(["admin"]), searchParams]);
  const [{ data: bookings, error: bookingError }, { data: staffData, error: staffError }, { data: scheduleData, error: scheduleError }] = await Promise.all([
    supabase.from("bookings").select("id, booking_date, start_time, status, customer:profiles!bookings_customer_id_fkey(name), service:services(name)").in("status", ["confirmed", "assigned"]).order("booking_date"),
    supabase.from("profiles").select("id, name").eq("role", "staff").order("name"),
    supabase.from("staff_schedules").select("id, booking_id, staff_id, scheduled_date, start_time, end_time, status, notes, staff:profiles!staff_schedules_staff_id_fkey(name), booking:bookings(status, customer:profiles!bookings_customer_id_fkey(name), service:services(name))").order("scheduled_date", { ascending: false }).limit(200),
  ]);
  const scheduleRows = (scheduleData ?? []) as unknown as Array<{ id: string; booking_id: string; staff_id: string; scheduled_date: string; start_time: string; end_time: string | null; status: string; notes: string | null; staff: { name: string } | null; booking: { status: string; customer: { name: string } | { name: string }[] | null; service: { name: string } | { name: string }[] | null } | { status: string; customer: { name: string } | { name: string }[] | null; service: { name: string } | { name: string }[] | null }[] | null }>;
  const bookingRows = (bookings ?? []) as unknown as Array<{ id: string; booking_date: string; start_time: string; status: string; customer: { name: string } | { name: string }[] | null; service: { name: string } | { name: string }[] | null }>;
  const one = <T,>(value: T | T[] | null | undefined): T | null => Array.isArray(value) ? value[0] ?? null : value ?? null;
  const activeRows = scheduleRows.filter((row) => row.status !== "cancelled");
  return <>
    <PageHeading eyebrow="Kapasitas tim" title="Jadwal petugas" description="Tugaskan pekerjaan ke petugas. Database memeriksa role, status booking, tanggal, dan bentrok jadwal ketika menyimpan." />
    <Feedback success={params.ok} error={params.error} />
    <section className="admin-card admin-form-card"><div><p className="admin-eyebrow">Penugasan baru</p><h2>Jadwalkan pekerjaan</h2></div>
      {bookingError || staffError ? <Feedback error="Pilihan booking atau petugas belum dapat dimuat." /> : bookingRows.length && staffData?.length ? <form action={assignStaffAction} className="admin-service-form admin-schedule-form">
        <label className="admin-span-all">Booking<select name="booking_id" required defaultValue=""><option value="" disabled>Pilih booking yang dikonfirmasi</option>{bookingRows.map((booking) => <option value={booking.id} key={booking.id}>{booking.id.slice(0, 8)} · {one(booking.customer)?.name ?? "Customer"} · {one(booking.service)?.name ?? "Layanan"} · {formatDate(booking.booking_date)} · {booking.status}</option>)}</select></label>
        <label>Petugas<select name="staff_id" required defaultValue=""><option value="" disabled>Pilih petugas</option>{staffData.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
        <label>Tanggal layanan<input name="scheduled_date" type="date" required /></label><label>Waktu mulai<input name="start_time" type="time" required /></label><label>Waktu selesai<input name="end_time" type="time" /></label>
        <label className="admin-span-all">Catatan<textarea name="notes" rows={2} maxLength={1000} placeholder="Instruksi untuk petugas" /></label><button className="admin-button admin-button-primary" type="submit">Simpan jadwal</button>
      </form> : <p className="admin-inline-note">Penjadwalan memerlukan setidaknya satu petugas dan booking berstatus dikonfirmasi atau ditugaskan.</p>}
    </section>
    <section className="admin-section"><div className="admin-section-heading"><div><p className="admin-eyebrow">Agenda</p><h2>Penugasan terbaru</h2></div></div>
      {scheduleError ? <Feedback error="Jadwal belum dapat dimuat. Coba lagi nanti." /> : activeRows.length === 0 ? <EmptyState title="Belum ada jadwal petugas" description="Penugasan yang dibuat admin akan tercatat di sini." /> : <div className="admin-card admin-table-wrap"><table className="admin-table admin-schedules-table"><thead><tr><th>Tanggal / waktu</th><th>Booking</th><th>Layanan / customer</th><th>Petugas</th><th>Status jadwal</th><th>Status booking</th><th></th></tr></thead><tbody>{activeRows.map((row) => { const booking = one(row.booking); const service = one(booking?.service); const customer = one(booking?.customer); return <tr key={row.id}><td>{formatDate(row.scheduled_date)}<span className="admin-cell-sub">{formatTime(row.start_time)}{row.end_time ? `–${formatTime(row.end_time)}` : "–akhir hari"}</span></td><td><code className="admin-id">{row.booking_id.slice(0, 8)}</code></td><td>{service?.name ?? "Layanan"}<span className="admin-cell-sub">{customer?.name ?? "Customer"}</span></td><td>{row.staff?.name ?? "Petugas"}</td><td><span className="admin-status admin-status-neutral">{row.status}</span></td><td>{booking?.status && <StatusBadge status={booking.status} />}</td><td><Link className="admin-row-link" href={`/admin/orders/${row.booking_id}`}>Detail</Link></td></tr>; })}</tbody></table></div>}
    </section>
  </>;
}
