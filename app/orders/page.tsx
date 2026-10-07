import Link from "next/link";

import { bookingStatuses, formatBookingDate, formatRupiah } from "../../lib/bookings";
import { requireRole } from "../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const params = await searchParams;
  const selectedStatus = params.status === "active" || params.status === "completed" ? params.status : "all";
  const { supabase, user } = await requireRole(["customer"]);
  let query = supabase.from("bookings")
    .select("id, booking_date, start_time, address, total_price, status, services(name)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });
  if (selectedStatus === "completed") query = query.eq("status", "completed");
  if (selectedStatus === "active") query = query.not("status", "in", "(completed,cancelled)");
  const { data, error } = await query;
  const orders = (data ?? []) as unknown as Array<{
    id: string; booking_date: string; start_time: string; address: string; total_price: number; status: string;
    services: { name: string } | { name: string }[] | null;
  }>;

  return <main className="customer-page"><div className="customer-container customer-narrow">
    <div className="customer-page-heading"><p className="customer-overline">Riwayat akun</p><h1>Pesanan saya</h1><p>Jadwal dan perkembangan layanan yang pernah kamu pesan.</p></div>
    <nav className="orders-filter" aria-label="Filter pesanan"><Link href="/orders" aria-current={selectedStatus === "all" ? "page" : undefined}>Semua</Link><Link href="/orders?status=active" aria-current={selectedStatus === "active" ? "page" : undefined}>Aktif</Link><Link href="/orders?status=completed" aria-current={selectedStatus === "completed" ? "page" : undefined}>Selesai</Link></nav>
    {error ? <p className="customer-notice customer-notice-error" role="alert">Pesanan belum dapat dimuat. Silakan coba lagi nanti.</p> : orders.length ? <ul className="customer-order-list customer-order-list-page">{orders.map((order) => {
      const service = Array.isArray(order.services) ? order.services[0] : order.services;
      return <li key={order.id}><Link href={`/orders/${order.id}`}><div className="customer-order-main"><strong>{service?.name ?? "Layanan JoCleanCare"}</strong><span>{formatBookingDate(order.booking_date)} · {String(order.start_time).slice(0, 5)} WIB</span><span className="customer-order-address">{order.address}</span></div><div className="customer-order-end"><span className={`customer-status customer-status-${order.status}`}>{bookingStatuses[order.status] ?? order.status}</span><strong>{formatRupiah(Number(order.total_price))}</strong><span className="customer-order-detail">Detail <span aria-hidden="true">→</span></span></div></Link></li>;
    })}</ul> : <section className="customer-empty"><h2>Belum ada pesanan</h2><p>Pesanan layanan kamu akan muncul di sini setelah melakukan booking.</p><Link href="/layanan" className="customer-inline-link">Lihat layanan <span aria-hidden="true">→</span></Link></section>}
  </div></main>;
}
