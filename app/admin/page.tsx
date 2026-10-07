import Link from "next/link";

import { requireRole } from "../../lib/auth/session";
import { EmptyState, Feedback, formatDate, formatMoney, formatTime, PageHeading, StatusBadge } from "./_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminDashboard({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireRole(["admin"]);
  const bookingCounts = await Promise.all([
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "assigned"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "cancelled"),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "staff"),
  ]);
  const failedMetrics = bookingCounts.map((item, index) => item.error ? index : -1).filter((index) => index >= 0);
  const counts = bookingCounts.map((item) => item.count ?? 0);
  const { data: recent, error: recentError } = await supabase.from("bookings")
    .select("id, booking_date, start_time, total_price, status, customer:profiles!bookings_customer_id_fkey(name), service:services(name)")
    .order("created_at", { ascending: false }).limit(6);
  const [params] = await Promise.all([searchParams]);
  const recentRows = (recent ?? []) as unknown as Array<{ id: string; booking_date: string; start_time: string; total_price: number; status: string; customer: { name: string } | null; service: { name: string } | null }>;
  const priorityMetrics = [
    ["Perlu tindakan", counts[1] + counts[2], "Menunggu konfirmasi atau penjadwalan", [1, 2]],
    ["Pekerjaan berjalan", counts[3] + counts[4], "Ditugaskan atau sedang dikerjakan", [3, 4]],
  ] as const;
  const supportingMetrics = [
    ["Total booking", counts[0], "Seluruh riwayat", 0], ["Layanan aktif", counts[7], "Tersedia untuk customer", 7], ["Petugas", counts[8], "Profil dengan role staff", 8],
  ] as const;

  return <>
    <PageHeading eyebrow="Ikhtisar operasional" title="Dashboard admin" description="Mulai dari booking yang perlu diproses, lalu pantau pekerjaan yang sedang berjalan." />
    <Feedback success={params.ok} error={params.error} />
    {failedMetrics.length > 0 && <Feedback error="Sebagian statistik belum dapat dimuat. Angka yang gagal dimuat ditandai dengan tanda pisah." />}
    <section aria-label="Prioritas operasional" className="admin-priority-metrics">
      {priorityMetrics.map(([label, value, helper, sources]) => <article key={label} className="admin-priority-metric"><p>{label}</p><strong>{sources.some((source) => failedMetrics.includes(source)) ? "—" : value}</strong><span>{helper}</span><Link href="/admin/orders">Buka pesanan <span aria-hidden="true">→</span></Link></article>)}
    </section>
    <section aria-label="Ringkasan operasional" className="admin-supporting-metrics">
      {supportingMetrics.map(([label, value, helper, source]) => <article key={label}><p>{label}</p><strong>{failedMetrics.includes(source) ? "—" : value}</strong><span>{helper}</span></article>)}
    </section>
    <section className="admin-section">
      <div className="admin-section-heading"><div><p className="admin-eyebrow">Terbaru</p><h2>Booking terbaru</h2></div><Link href="/admin/orders" className="admin-text-link">Lihat semua pesanan <span aria-hidden="true">→</span></Link></div>
      {recentError ? <Feedback error="Data booking belum dapat dimuat. Coba muat ulang halaman." /> : recentRows.length === 0 ? <EmptyState title="Belum ada booking" description="Booking pelanggan akan muncul di sini setelah dibuat." href="/admin/orders" linkLabel="Buka pesanan" /> : <div className="admin-card admin-table-wrap"><table className="admin-table admin-recent-table"><thead><tr><th>Customer / layanan</th><th>Tanggal & jam</th><th>Total</th><th>Status</th><th><span className="sr-only">Detail</span></th></tr></thead><tbody>{recentRows.map((row) => <tr key={row.id}><td><strong>{row.customer?.name ?? "Customer"}</strong><span className="admin-cell-sub">{row.service?.name ?? "Layanan"}</span></td><td>{formatDate(row.booking_date)}<span className="admin-cell-sub">{formatTime(row.start_time)}</span></td><td>{formatMoney(row.total_price)}</td><td><StatusBadge status={row.status} /></td><td><Link className="admin-row-link" href={`/admin/orders/${row.id}`}>Detail</Link></td></tr>)}</tbody></table></div>}
    </section>
    <section className="admin-shortcuts" aria-label="Navigasi operasional">
      {[["/admin/orders", "Pesanan", "Periksa booking dan alur status"], ["/admin/services", "Layanan", "Kelola katalog yang tersedia"], ["/admin/staff", "Petugas", "Lihat tim dan pekerjaan aktif"], ["/admin/schedules", "Jadwal", "Atur penugasan petugas"]].map(([href, title, desc]) => <Link href={href} className="admin-shortcut" key={href}><span>{title}</span><small>{desc}</small><b aria-hidden="true">→</b></Link>)}
    </section>
  </>;
}
