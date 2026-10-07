import Link from "next/link";
import { notFound } from "next/navigation";

import { bookingStatuses, formatBookingDate, formatRupiah } from "../../../lib/bookings";
import { requireRole } from "../../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireRole(["customer"]);
  const { data: booking, error } = await supabase.from("bookings")
    .select("id, booking_date, start_time, address, notes, total_price, status, service_id, services(name, description, duration_minutes)")
    .eq("id", id).eq("customer_id", user.id).maybeSingle();
  if (error || !booking) notFound();

  const { data: schedules, error: scheduleError } = await supabase.from("staff_schedules")
    .select("id, scheduled_date, start_time, end_time, status")
    .eq("booking_id", booking.id).order("scheduled_date", { ascending: true });
  const serviceValue = (booking as unknown as { services: { name: string; description: string | null; duration_minutes: number } | { name: string; description: string | null; duration_minutes: number }[] | null }).services;
  const service = Array.isArray(serviceValue) ? serviceValue[0] : serviceValue;

  return <main className="customer-page"><div className="customer-container customer-narrow">
    <Link href="/orders" className="customer-back-link"><span aria-hidden="true">←</span> Kembali ke pesanan</Link>
    <header className="order-detail-header"><div><p className="customer-overline">Detail pesanan</p><h1>{service?.name ?? "Layanan JoCleanCare"}</h1><p>{formatBookingDate(booking.booking_date)} · {String(booking.start_time).slice(0, 5)} WIB <span aria-hidden="true">·</span> #{booking.id.slice(0, 8)}</p></div><span className={`customer-status customer-status-${booking.status}`}>{bookingStatuses[booking.status] ?? booking.status}</span></header>

    <section className="order-detail-section"><h2>Layanan</h2><dl className="order-facts"><div><dt>Jenis layanan</dt><dd>{service?.name ?? "Layanan JoCleanCare"}</dd></div>{service?.duration_minutes != null && <div><dt>Estimasi durasi</dt><dd>{service.duration_minutes} menit</dd></div>}<div><dt>Total saat booking</dt><dd>{formatRupiah(Number(booking.total_price))}</dd></div></dl>{service?.description && <p className="order-description">{service.description}</p>}</section>
    <section className="order-detail-section"><h2>Jadwal dan alamat</h2><dl className="order-facts"><div><dt>Tanggal dan waktu</dt><dd>{formatBookingDate(booking.booking_date)} · {String(booking.start_time).slice(0, 5)} WIB</dd></div><div><dt>Alamat layanan</dt><dd>{booking.address}</dd></div><div><dt>Catatan tambahan</dt><dd>{booking.notes || "Tidak ada catatan tambahan."}</dd></div></dl></section>
    <section className="order-detail-section"><h2>Penugasan petugas</h2>{scheduleError ? <p className="customer-notice customer-notice-error" role="status">Informasi jadwal belum dapat dimuat.</p> : schedules?.length ? <ul className="order-schedule-list">{schedules.map((schedule) => <li key={schedule.id}><div><strong>{formatBookingDate(schedule.scheduled_date)}</strong><span>{String(schedule.start_time).slice(0, 5)} WIB{schedule.end_time ? `–${String(schedule.end_time).slice(0, 5)} WIB` : "– akhir hari"}</span></div><span className={`customer-status customer-status-${schedule.status === "completed" ? "completed" : schedule.status === "cancelled" ? "cancelled" : "assigned"}`}>{bookingStatuses[schedule.status] ?? (schedule.status === "scheduled" ? "Terjadwal" : schedule.status)}</span></li>)}</ul> : <p className="customer-muted">Petugas dan jadwal kunjungan akan tampil setelah pesanan dijadwalkan.</p>}</section>
  </div></main>;
}
