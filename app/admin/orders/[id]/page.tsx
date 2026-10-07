import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "../../../../lib/auth/session";
import { assignStaffAction, setBookingStatusAction } from "../../actions";
import { Feedback, formatDate, formatMoney, formatTime, PageHeading, StatusBadge, statusLabels } from "../../_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params, searchParams }: PageProps<"/admin/orders/[id]">) {
  const [{ id }, feedback, current] = await Promise.all([params, searchParams, requireRole(["admin"])]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data: booking, error }, { data: staffData }] = await Promise.all([
    current.supabase.from("bookings").select("id, booking_date, start_time, address, notes, total_price, status, customer:profiles!bookings_customer_id_fkey(id, name, email, phone), service:services(id, name, description, price, duration_minutes), staff_schedules(id, staff_id, scheduled_date, start_time, end_time, status, notes, staff:profiles!staff_schedules_staff_id_fkey(name, phone))").eq("id", id).maybeSingle(),
    current.supabase.from("profiles").select("id, name").eq("role", "staff").order("name"),
  ]);
  if (error || !booking) notFound();
  const row = booking as unknown as { id: string; booking_date: string; start_time: string; address: string; notes: string | null; total_price: number; status: string; customer: { name: string; email: string | null; phone: string | null } | null; service: { name: string; description: string | null; price: number; duration_minutes: number } | null; staff_schedules: Array<{ id: string; staff_id: string; scheduled_date: string; start_time: string; end_time: string | null; status: string; notes: string | null; staff: { name: string; phone: string | null } | null }> };
  const activeSchedules = row.staff_schedules.filter((item) => item.status !== "cancelled");
  const nextStatuses: Record<string, string[]> = { pending: ["confirmed", "cancelled"], confirmed: ["cancelled"], assigned: ["cancelled"], in_progress: [], completed: [], cancelled: [] };
  return <>
    <div className="admin-breadcrumb"><Link href="/admin/orders">← Kembali ke pesanan</Link></div>
    <PageHeading eyebrow="Detail booking" title={`Pesanan ${row.id.slice(0, 8)}`} description="Periksa informasi customer, layanan, jadwal, dan kelola transisi sesuai workflow." />
    <Feedback success={feedback.ok} error={feedback.error} />
    <div className="admin-detail-grid">
      <section className="admin-card admin-detail-card"><div className="admin-detail-title"><h2>Informasi booking</h2><StatusBadge status={row.status} /></div>
        <dl className="admin-detail-list">
          <div><dt>Customer</dt><dd>{row.customer?.name ?? "—"}</dd></div><div><dt>Email</dt><dd>{row.customer?.email ?? "—"}</dd></div><div><dt>Telepon</dt><dd>{row.customer?.phone ?? "—"}</dd></div>
          <div><dt>Layanan</dt><dd>{row.service?.name ?? "—"}<span className="admin-cell-sub">{row.service ? `${row.service.duration_minutes} menit · harga katalog ${formatMoney(row.service.price)}` : ""}</span></dd></div>
          <div><dt>Tanggal / jam booking</dt><dd>{formatDate(row.booking_date)} · {formatTime(row.start_time)}</dd></div><div><dt>Alamat</dt><dd>{row.address}</dd></div><div><dt>Catatan customer</dt><dd>{row.notes || "Tidak ada catatan"}</dd></div><div><dt>Total saat booking</dt><dd className="admin-price-emphasis">{formatMoney(row.total_price)}</dd></div>
        </dl>
      </section>
      <section className="admin-card admin-detail-card"><div className="admin-detail-title"><h2>Ubah status</h2></div><p className="admin-muted">Transisi divalidasi lagi oleh database. Status penugasan akan berubah setelah petugas dijadwalkan.</p>
        {nextStatuses[row.status]?.length ? <form action={setBookingStatusAction} className="admin-inline-form"><input type="hidden" name="booking_id" value={row.id} /><label>Status berikutnya<select name="status" defaultValue={nextStatuses[row.status][0]}>{nextStatuses[row.status].map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><button className="admin-button admin-button-primary" type="submit">Simpan status</button></form> : <p className="admin-inline-note">Tidak ada transisi manual berikutnya untuk status ini.</p>}
      </section>
    </div>
    <section className="admin-section"><div className="admin-section-heading"><div><p className="admin-eyebrow">Penugasan</p><h2>Jadwal petugas</h2></div></div>
      {activeSchedules.length ? <div className="admin-schedule-cards">{activeSchedules.map((schedule) => <article className="admin-card admin-assignment-card" key={schedule.id}><div className="admin-detail-title"><strong>{schedule.staff?.name ?? "Petugas"}</strong><span className="admin-status admin-status-neutral">{schedule.status}</span></div><p>{formatDate(schedule.scheduled_date)} · {formatTime(schedule.start_time)}{schedule.end_time ? `–${formatTime(schedule.end_time)}` : "–akhir hari"}</p>{schedule.staff?.phone && <p>Telepon: {schedule.staff.phone}</p>}{schedule.notes && <p>Catatan: {schedule.notes}</p>}</article>)}</div> : <p className="admin-inline-note">Belum ada petugas yang ditugaskan.</p>}
      {["confirmed", "assigned"].includes(row.status) && <form action={assignStaffAction} className="admin-card admin-assignment-form"><h3>Jadwalkan petugas</h3><input type="hidden" name="booking_id" value={row.id} />
        <label>Petugas<select name="staff_id" required defaultValue=""><option value="" disabled>Pilih petugas</option>{(staffData ?? []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label>
        <label>Tanggal<input name="scheduled_date" type="date" defaultValue={row.booking_date} required /></label><label>Mulai<input name="start_time" type="time" defaultValue={String(row.start_time).slice(0, 5)} required /></label><label>Selesai<input name="end_time" type="time" /></label><label className="admin-span-all">Catatan jadwal<textarea name="notes" rows={2} maxLength={1000} placeholder="Instruksi singkat untuk petugas" /></label><button type="submit" className="admin-button admin-button-primary">Simpan penugasan</button>
      </form>}
    </section>
  </>;
}
