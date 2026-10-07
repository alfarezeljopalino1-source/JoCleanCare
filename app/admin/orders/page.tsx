import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { EmptyState, Feedback, formatDate, formatMoney, formatTime, PageHeading, StatusBadge, statusLabels } from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ q?: string; status?: string; date?: string; ok?: string; error?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase } = await requireRole(["admin"]);
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 120);
  const status = Object.hasOwn(statusLabels, params.status ?? "") ? params.status : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date : "";
  let query = supabase.from("bookings").select("id, booking_date, start_time, address, total_price, status, customer:profiles!bookings_customer_id_fkey(name), service:services(name), staff_schedules(staff:profiles!staff_schedules_staff_id_fkey(name), status)").order("created_at", { ascending: false }).limit(300);
  if (status) query = query.eq("status", status);
  if (date) query = query.eq("booking_date", date);
  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Array<{ id: string; booking_date: string; start_time: string; address: string; total_price: number; status: string; customer: { name: string } | null; service: { name: string } | null; staff_schedules: Array<{ staff: { name: string } | null; status: string }> }>;
  const filtered = q ? rows.filter((row) => [row.id, row.customer?.name, row.service?.name, row.address, ...row.staff_schedules.map((s) => s.staff?.name)].some((value) => value?.toLocaleLowerCase("id-ID").includes(q.toLocaleLowerCase("id-ID")))) : rows;

  return <>
    <PageHeading eyebrow="Operasional" title="Pesanan" description="Cari booking, periksa kebutuhan customer, dan buka detail untuk mengatur alur pekerjaan." />
    <Feedback success={params.ok} error={params.error} />
    <form method="get" className="admin-filter-bar">
      <label className="admin-filter-search">Cari booking<input type="search" name="q" defaultValue={q} placeholder="ID, customer, layanan, alamat…" /></label>
      <label> Status<select name="status" defaultValue={status}><option value="">Semua status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label> Tanggal<input type="date" name="date" defaultValue={date} /></label>
      <button type="submit" className="admin-button admin-button-primary">Terapkan</button>
      {(q || status || date) && <Link className="admin-button admin-button-quiet" href="/admin/orders">Reset</Link>}
    </form>
    {error ? <Feedback error="Daftar booking belum dapat dimuat. Muat ulang halaman atau coba lagi nanti." /> : filtered.length === 0 ? <EmptyState title="Tidak ada booking yang cocok" description="Ubah kata pencarian atau filter untuk melihat booking lain." /> : <div className="admin-card admin-table-wrap"><table className="admin-table admin-orders-table"><thead><tr><th>Booking / customer</th><th>Layanan</th><th>Tanggal & jam</th><th>Alamat</th><th>Total</th><th>Status</th><th>Petugas</th><th></th></tr></thead><tbody>{filtered.map((row) => { const activeStaff = row.staff_schedules.filter((s) => s.status !== "cancelled").map((s) => s.staff?.name).filter(Boolean); return <tr key={row.id}><td><code className="admin-id">{row.id.slice(0, 8)}</code><span className="admin-cell-sub">{row.customer?.name ?? "Customer"}</span></td><td>{row.service?.name ?? "Layanan"}</td><td>{formatDate(row.booking_date)}<span className="admin-cell-sub">{formatTime(row.start_time)}</span></td><td className="admin-address-cell">{row.address}</td><td>{formatMoney(row.total_price)}</td><td><StatusBadge status={row.status} /></td><td>{activeStaff.length ? activeStaff.join(", ") : "—"}</td><td><Link className="admin-row-link" href={`/admin/orders/${row.id}`}>Detail</Link></td></tr>; })}</tbody></table></div>}
    <p className="admin-result-count">{filtered.length} booking ditampilkan{rows.length === 300 ? " · hasil dibatasi ke 300 terbaru" : ""}</p>
  </>;
}
