import Link from "next/link";

import { getActiveServices, jakartaToday, type Service, bookingStatuses, formatBookingDate, formatRupiah } from "../../lib/bookings";
import { requireRole } from "../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerDashboard() {
  const { supabase, user, profile } = await requireRole(["customer"]);
  const columns = "id, booking_date, start_time, total_price, status, services(name)";
  const [activeResult, completedResult, nextBookingResult, latestResult, servicesResult] = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", user.id).not("status", "in", "(completed,cancelled)"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("customer_id", user.id).eq("status", "completed"),
    supabase.from("bookings").select("id, booking_date, start_time, status, services(name)").eq("customer_id", user.id).gte("booking_date", jakartaToday()).not("status", "in", "(completed,cancelled)").order("booking_date", { ascending: true }).order("start_time", { ascending: true }).limit(1).maybeSingle(),
    supabase.from("bookings").select(columns).eq("customer_id", user.id).order("created_at", { ascending: false }).limit(3),
    getActiveServices(supabase),
  ]);
  const bookings = (latestResult.data ?? []) as unknown as Array<{
    id: string; booking_date: string; start_time: string; total_price: number; status: string;
    services: { name: string } | { name: string }[] | null;
  }>;
  const services = (servicesResult.data ?? []) as unknown as Service[];
  const nextBooking = nextBookingResult.data as unknown as { id: string; booking_date: string; start_time: string; status: string; services: { name: string } | { name: string }[] | null } | null;
  const nextService = Array.isArray(nextBooking?.services) ? nextBooking.services[0] : nextBooking?.services;

  return <main className="customer-page customer-dashboard-page">
    <div className="customer-container">
      <section className="customer-welcome">
        <div><p className="customer-overline">Dashboard</p><h1>Selamat datang kembali, {profile.name || "Pelanggan"}.</h1><p className="customer-lead">Kelola layanan kebersihan rumah Anda dengan mudah.</p></div>
        <Link href="/layanan" className="customer-button customer-button-primary">Pesan layanan <span aria-hidden="true">→</span></Link>
      </section>

      <section className="customer-active-bookings" aria-label="Ringkasan booking aktif">
        <span>Booking aktif</span>
        {activeResult.error ? <strong className="customer-data-error">Belum tersedia</strong> : <strong>{activeResult.count ?? 0}</strong>}
        <Link href="/orders">Lihat pesanan <span aria-hidden="true">→</span></Link>
      </section>

      <section className="customer-next-visit" aria-labelledby="next-visit-title"><div><p className="customer-overline">Agenda</p><h2 id="next-visit-title">Jadwal berikutnya</h2></div>{nextBookingResult.error ? <p className="customer-notice customer-notice-error" role="alert">Jadwal belum dapat dimuat.</p> : nextBooking ? <Link href={`/orders/${nextBooking.id}`}><strong>{nextService?.name ?? "Layanan JoCleanCare"}</strong><span>{formatBookingDate(nextBooking.booking_date)} · {String(nextBooking.start_time).slice(0, 5)} WIB</span><span className={`customer-status customer-status-${nextBooking.status}`}>{bookingStatuses[nextBooking.status] ?? nextBooking.status}</span></Link> : <div><p>Belum ada jadwal mendatang.</p><Link href="/layanan" className="customer-inline-link">Pilih layanan <span aria-hidden="true">→</span></Link></div>}</section>

      <section className="customer-summary" aria-labelledby="customer-summary-title">
        <h2 id="customer-summary-title">Ringkasan</h2>
        <div className="customer-summary-grid">
          <Link href="/orders?status=active" className="customer-summary-item"><span>Pesanan aktif</span><strong>{activeResult.error ? "-" : activeResult.count ?? 0}</strong><small>{activeResult.error ? "Belum tersedia" : "Lihat pesanan"}</small></Link>
          <Link href="/orders?status=completed" className="customer-summary-item"><span>Pesanan selesai</span><strong>{completedResult.error ? "-" : completedResult.count ?? 0}</strong><small>{completedResult.error ? "Belum tersedia" : "Lihat riwayat"}</small></Link>
          <div className="customer-summary-item customer-summary-next"><span>Pesanan berikutnya</span>{nextBookingResult.error ? <strong className="customer-summary-note">Belum tersedia</strong> : nextBooking ? <><strong className="customer-summary-date">{formatBookingDate(nextBooking.booking_date)}</strong><small>{String(nextBooking.start_time).slice(0, 5)} WIB</small></> : <><strong className="customer-summary-note">Belum ada jadwal</strong><small><Link href="/layanan">Pilih layanan</Link></small></>}</div>
        </div>
      </section>

      <section className="customer-section customer-popular-services">
        <div className="customer-section-heading"><div><p className="customer-overline">Mulai dari kebutuhanmu</p><h2>Layanan yang tersedia</h2></div><Link href="/layanan" className="customer-inline-link">Semua layanan <span aria-hidden="true">→</span></Link></div>
        {servicesResult.error ? <p className="customer-notice" role="status">Layanan belum dapat dimuat sekarang.</p> : services.length ? <ul className="customer-service-links">{services.slice(0, 3).map((service) => <li key={service.id}><Link href={`/booking?service=${encodeURIComponent(service.id)}`}><span>{service.name}</span><span className="customer-service-meta">{formatRupiah(Number(service.price))} <span aria-hidden="true">→</span></span></Link></li>)}</ul> : <p className="customer-muted">Belum ada layanan aktif saat ini.</p>}
      </section>

      <section className="customer-section customer-recent-orders">
        <div className="customer-section-heading"><div><p className="customer-overline">Aktivitas akun</p><h2>Pesanan terbaru</h2></div><Link href="/orders" className="customer-inline-link">Riwayat pesanan <span aria-hidden="true">→</span></Link></div>
        {latestResult.error ? <p className="customer-notice" role="alert">Pesanan belum dapat dimuat. Coba muat ulang halaman.</p> : bookings.length ? <ul className="customer-order-list">{bookings.map((booking) => {
          const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
          return <li key={booking.id}><Link href={`/orders/${booking.id}`}><div><strong>{service?.name ?? "Layanan JoCleanCare"}</strong><span>{formatBookingDate(booking.booking_date)} · {String(booking.start_time).slice(0, 5)} WIB</span></div><div className="customer-order-end"><span className={`customer-status customer-status-${booking.status}`}>{bookingStatuses[booking.status] ?? booking.status}</span><span>{formatRupiah(Number(booking.total_price))}</span></div></Link></li>;
        })}</ul> : <div className="customer-empty"><h3>Belum ada pesanan</h3><p>Pesanan layanan kamu akan muncul di sini.</p><Link href="/layanan" className="customer-inline-link">Pilih layanan pertama <span aria-hidden="true">→</span></Link></div>}
      </section>
    </div>
  </main>;
}
