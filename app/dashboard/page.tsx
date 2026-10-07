import Link from "next/link";
import {
  getActiveServices,
  jakartaToday,
  type Service,
  bookingStatuses,
  formatBookingDate,
  formatRupiah,
  getUnreadNotificationsCount,
} from "../../lib/bookings";
import { requireRole } from "../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CustomerDashboard() {
  const { supabase, user, profile } = await requireRole(["customer"]);
  const columns = "id, booking_date, start_time, total_price, status, services(name)";

  const [activeResult, completedResult, nextBookingResult, latestResult, servicesResult, unreadCount] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id)
        .not("status", "in", "(completed,cancelled)"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("customer_id", user.id)
        .eq("status", "completed"),
      supabase
        .from("bookings")
        .select("id, booking_date, start_time, address, status, services(name)")
        .eq("customer_id", user.id)
        .gte("booking_date", jakartaToday())
        .not("status", "in", "(completed,cancelled)")
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("bookings")
        .select(columns)
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
      getActiveServices(supabase),
      getUnreadNotificationsCount(supabase, user.id),
    ]);

  const bookings = (latestResult.data ?? []) as unknown as Array<{
    id: string;
    booking_date: string;
    start_time: string;
    total_price: number;
    status: string;
    services: { name: string } | { name: string }[] | null;
  }>;

  const services = (servicesResult.data ?? []) as unknown as Service[];
  const nextBooking = nextBookingResult.data as unknown as {
    id: string;
    booking_date: string;
    start_time: string;
    address?: string;
    status: string;
    services: { name: string } | { name: string }[] | null;
  } | null;
  const nextService = Array.isArray(nextBooking?.services) ? nextBooking.services[0] : nextBooking?.services;

  let nextCleanerName: string | null = null;
  if (nextBooking?.id) {
    const { data: staffList } = await supabase.rpc("get_customer_booking_staff", {
      p_booking_id: nextBooking.id,
    });
    if (Array.isArray(staffList) && staffList.length > 0) {
      nextCleanerName = staffList[0].staff_name;
    }
  }

  return (
    <main className="customer-page customer-dashboard-page">
      <div className="customer-container">
        {/* Unread notification alert banner if any */}
        {unreadCount > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
            <span>
              🔔 Anda memiliki <strong>{unreadCount}</strong> pemberitahuan baru terkait jadwal atau pesanan Anda.
            </span>
            <Link href="/profile" className="font-semibold text-teal-800 underline">
              Buka Notifikasi →
            </Link>
          </div>
        )}

        <section className="customer-welcome">
          <div>
            <p className="customer-overline">Dashboard Pelanggan</p>
            <h1>Selamat datang, {profile.name || "Pelanggan"}.</h1>
            <p className="customer-lead">
              Kelola jadwal kebersihan rumah, langganan rutin, dan pantau status petugas Anda.
            </p>
          </div>
          <div className="dashboard-quick-actions-bar mt-4 flex flex-wrap gap-2.5">
            <Link href="/booking" className="customer-button customer-button-primary">
              Pesan Layanan <span aria-hidden="true">→</span>
            </Link>
            <Link href="/orders" className="customer-button customer-button-secondary">
              Lihat Pesanan
            </Link>
            <Link href="/profile" className="customer-button customer-button-secondary">
              Alamat Saya
            </Link>
            <Link href="/paket" className="customer-button customer-button-secondary">
              Paket Rutin
            </Link>
          </div>
        </section>

        <section className="customer-active-bookings" aria-label="Ringkasan booking aktif">
          <span>Booking Aktif</span>
          {activeResult.error ? (
            <strong className="customer-data-error">Belum tersedia</strong>
          ) : (
            <strong>{activeResult.count ?? 0}</strong>
          )}
          <Link href="/orders">
            Lihat semua pesanan <span aria-hidden="true">→</span>
          </Link>
        </section>

        {/* Next Visit Banner (Tahap 22 Spec) */}
        <section className="customer-next-visit" aria-labelledby="next-visit-title">
          <div>
            <p className="customer-overline">Agenda Terdekat</p>
            <h2 id="next-visit-title">Jadwal Kunjungan</h2>
          </div>
          {nextBookingResult.error ? (
            <p className="customer-notice customer-notice-error" role="alert">
              Jadwal belum dapat dimuat.
            </p>
          ) : nextBooking ? (
            <Link href={`/orders/${nextBooking.id}`} className="next-booking-card-link">
              <strong>{nextService?.name ?? "Layanan JoCleanCare"}</strong>
              <span className="next-booking-schedule">
                {formatBookingDate(nextBooking.booking_date)} · {String(nextBooking.start_time).slice(0, 5)} WIB
              </span>
              {nextBooking.address && (
                <small className="next-booking-address">📍 {nextBooking.address}</small>
              )}
              <span className="next-booking-cleaner">
                👤 {nextCleanerName ? `Petugas: ${nextCleanerName}` : "Menunggu konfirmasi petugas"}
              </span>
              <span className={`customer-status customer-status-${nextBooking.status}`}>
                {bookingStatuses[nextBooking.status] ?? nextBooking.status}
              </span>
            </Link>
          ) : (
            <div>
              <p>Belum ada jadwal kunjungan mendatang.</p>
              <Link href="/layanan" className="customer-inline-link">
                Reservasi layanan sekarang <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </section>

        {/* Summary Grid */}
        <section className="customer-summary" aria-labelledby="customer-summary-title">
          <h2 id="customer-summary-title">Ringkasan Akun</h2>
          <div className="customer-summary-grid">
            <Link href="/orders?status=active" className="customer-summary-item">
              <span>Pesanan Aktif</span>
              <strong>{activeResult.error ? "-" : activeResult.count ?? 0}</strong>
              <small>{activeResult.error ? "Belum tersedia" : "Lihat pesanan"}</small>
            </Link>
            <Link href="/orders?status=completed" className="customer-summary-item">
              <span>Pesanan Selesai</span>
              <strong>{completedResult.error ? "-" : completedResult.count ?? 0}</strong>
              <small>{completedResult.error ? "Belum tersedia" : "Lihat riwayat"}</small>
            </Link>
            <div className="customer-summary-item customer-summary-next">
              <span>Pesanan Berikutnya</span>
              {nextBookingResult.error ? (
                <strong className="customer-summary-note">Belum tersedia</strong>
              ) : nextBooking ? (
                <>
                  <strong className="customer-summary-date">{formatBookingDate(nextBooking.booking_date)}</strong>
                  <small>{String(nextBooking.start_time).slice(0, 5)} WIB</small>
                </>
              ) : (
                <>
                  <strong className="customer-summary-note">Belum ada jadwal</strong>
                  <small>
                    <Link href="/layanan">Pilih layanan</Link>
                  </small>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Popular Services Catalog */}
        <section className="customer-section customer-popular-services">
          <div className="customer-section-heading">
            <div>
              <p className="customer-overline">Pilihan Layanan</p>
              <h2>Katalog Layanan JoCleanCare</h2>
            </div>
            <Link href="/layanan" className="customer-inline-link">
              Semua katalog <span aria-hidden="true">→</span>
            </Link>
          </div>
          {servicesResult.error ? (
            <p className="customer-notice" role="status">
              Layanan belum dapat dimuat sekarang.
            </p>
          ) : services.length ? (
            <ul className="customer-service-links">
              {services.slice(0, 4).map((service) => (
                <li key={service.id}>
                  <Link href={`/layanan/${encodeURIComponent(service.id)}`}>
                    <span>
                      {service.name}{" "}
                      {service.badge && (
                        <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          {service.badge}
                        </span>
                      )}
                    </span>
                    <span className="customer-service-meta">
                      Mulai {formatRupiah(Number(service.price))} <span aria-hidden="true">→</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="customer-muted">Belum ada layanan aktif saat ini.</p>
          )}
        </section>

        {/* Recent Orders Activity */}
        <section className="customer-section customer-recent-orders">
          <div className="customer-section-heading">
            <div>
              <p className="customer-overline">Aktivitas Akun</p>
              <h2>Pesanan Terbaru</h2>
            </div>
            <Link href="/orders" className="customer-inline-link">
              Riwayat pesanan <span aria-hidden="true">→</span>
            </Link>
          </div>
          {latestResult.error ? (
            <p className="customer-notice" role="alert">
              Pesanan belum dapat dimuat. Coba muat ulang halaman.
            </p>
          ) : bookings.length ? (
            <ul className="customer-order-list">
              {bookings.map((booking) => {
                const service = Array.isArray(booking.services) ? booking.services[0] : booking.services;
                return (
                  <li key={booking.id}>
                    <Link href={`/orders/${booking.id}`}>
                      <div>
                        <strong>{service?.name ?? "Layanan JoCleanCare"}</strong>
                        <span>
                          {formatBookingDate(booking.booking_date)} · {String(booking.start_time).slice(0, 5)} WIB
                        </span>
                      </div>
                      <div className="customer-order-end">
                        <span className={`customer-status customer-status-${booking.status}`}>
                          {bookingStatuses[booking.status] ?? booking.status}
                        </span>
                        <span>{formatRupiah(Number(booking.total_price))}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="customer-empty">
              <h3>Belum ada pesanan</h3>
              <p>Pesanan layanan kamu akan muncul di sini.</p>
              <Link href="/layanan" className="customer-inline-link">
                Pilih layanan pertama <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
