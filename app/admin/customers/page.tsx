import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { formatDate, PageHeading } from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ q?: string }>;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ supabase }, params] = await Promise.all([requireRole(["admin"]), searchParams]);
  const q = (params.q ?? "").trim().toLowerCase();

  const { data: customerData, error } = await supabase
    .from("profiles")
    .select(`
      id,
      name,
      email,
      phone,
      created_at,
      bookings (id, status, total_price)
    `)
    .eq("role", "customer")
    .order("created_at", { ascending: false });

  const rows = (customerData ?? []) as unknown as Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
    bookings: Array<{ id: string; status: string; total_price: number }>;
  }>;

  const filtered = q
    ? rows.filter((r) =>
        [r.name, r.email, r.phone].some((val) => val?.toLowerCase().includes(q))
      )
    : rows;

  return (
    <>
      <PageHeading
        eyebrow="Basis Pengguna"
        title="Daftar Pelanggan"
        description="Kelola akun pelanggan, riwayat pemesanan yang pernah dilakukan, serta informasi kontak."
      />

      <form method="get" className="admin-filter-bar">
        <label className="admin-filter-search">
          Cari Pelanggan
          <input
            type="search"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Cari nama, email, atau nomor telepon pelanggan..."
          />
        </label>
        <button type="submit" className="admin-button admin-button-primary">
          Cari
        </button>
        {q && (
          <Link href="/admin/customers" className="admin-button admin-button-quiet">
            Reset
          </Link>
        )}
      </form>

      {error ? (
        <div className="customer-notice customer-notice-error" role="alert">
          Gagal memuat data pelanggan. Silakan coba lagi.
        </div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">
          <span className="admin-empty-mark">0</span>
          <h2>Tidak Ada Pelanggan Ditemukan</h2>
          <p>Ubah kata kunci pencarian Anda untuk melihat pelanggan lainnya.</p>
        </div>
      ) : (
        <div className="admin-card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama Pelanggan</th>
                <th>Kontak</th>
                <th>Terdaftar Sejak</th>
                <th>Total Booking</th>
                <th>Total Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const totalSpent = customer.bookings.reduce(
                  (sum, b) => (b.status === "completed" ? sum + Number(b.total_price) : sum),
                  0
                );
                return (
                  <tr key={customer.id}>
                    <td>
                      <strong>{customer.name}</strong>
                      <span className="admin-cell-sub">ID: {customer.id.slice(0, 8)}</span>
                    </td>
                    <td>
                      <div>{customer.email ?? "—"}</div>
                      <span className="admin-cell-sub">{customer.phone ?? "Belum ada telepon"}</span>
                    </td>
                    <td>{formatDate(customer.created_at.slice(0, 10))}</td>
                    <td>
                      <strong>{customer.bookings.length}</strong> booking
                      <span className="admin-cell-sub">
                        {customer.bookings.filter((b) => b.status === "completed").length} selesai
                      </span>
                    </td>
                    <td>
                      <strong className="text-teal-800">
                        Rp {totalSpent.toLocaleString("id-ID")}
                      </strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="admin-result-count">{filtered.length} pelanggan terdaftar</p>
    </>
  );
}
