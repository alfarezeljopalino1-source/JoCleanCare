import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { formatDate, PageHeading } from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ rating?: string }>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase }, params] = await Promise.all([
    requireRole(["admin"]),
    searchParams,
  ]);

  const targetRating = Number(params.rating);

  let query = supabase
    .from("booking_reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      booking_id,
      customer:profiles!booking_reviews_customer_id_fkey(name, email),
      staff:profiles!booking_reviews_staff_id_fkey(name),
      booking:bookings(service:services(name))
    `)
    .order("created_at", { ascending: false });

  if (targetRating >= 1 && targetRating <= 5) {
    query = query.eq("rating", targetRating);
  }

  const { data: reviewsData, error } = await query;
  const reviews = (reviewsData ?? []) as unknown as Array<{
    id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    booking_id: string;
    customer: { name: string; email: string | null } | null;
    staff: { name: string } | null;
    booking: { service: { name: string } | null } | null;
  }>;

  // Calculate stats from all reviews
  const { data: allReviewsData } = await supabase
    .from("booking_reviews")
    .select("rating");
  const allReviews = allReviewsData ?? [];

  const totalCount = allReviews.length;
  const avgScore =
    totalCount > 0
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount).toFixed(1)
      : "5.0";

  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const r of allReviews) {
    starCounts[r.rating] = (starCounts[r.rating] || 0) + 1;
  }

  return (
    <>
      <PageHeading
        eyebrow="Kepuasan Pelanggan"
        title="Ulasan & Penilaian (Reviews)"
        description="Pantau testimoni, kritik, dan tingkat kepuasan pelanggan terhadap kualitas kerja petugas dan layanan JoCleanCare."
      />

      {/* KPI & Star Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="admin-card text-center flex flex-col justify-center items-center py-6">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-bold mb-1">
            Skor Kepuasan Rata-rata
          </span>
          <div className="text-4xl font-extrabold text-amber-500 my-1">
            ★ {avgScore}
          </div>
          <span className="text-xs text-gray-400">
            Berdasarkan <strong>{totalCount}</strong> ulasan pelanggan
          </span>
        </div>

        <div className="md:col-span-2 admin-card">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
            Distribusi Bintang
          </h2>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = starCounts[star] || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-medium text-gray-600">{star} Bintang</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-2.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-gray-500 font-mono">
                    {count} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rating Filter Tabs */}
      <nav className="orders-filter mb-6" aria-label="Filter Rating">
        <Link href="/admin/reviews" aria-current={!targetRating ? "page" : undefined}>
          Semua ({totalCount})
        </Link>
        {[5, 4, 3, 2, 1].map((star) => (
          <Link
            key={star}
            href={`/admin/reviews?rating=${star}`}
            aria-current={targetRating === star ? "page" : undefined}
          >
            ★ {star} ({starCounts[star] || 0})
          </Link>
        ))}
      </nav>

      {/* Reviews Table */}
      <section className="admin-section">
        {error ? (
          <p className="customer-notice customer-notice-error">Gagal memuat ulasan pelanggan.</p>
        ) : reviews.length === 0 ? (
          <div className="admin-empty">
            <p>Belum ada ulasan yang sesuai dengan filter ini.</p>
          </div>
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th>Rating</th>
                  <th>Komentar / Ulasan</th>
                  <th>Layanan & Order</th>
                  <th>Petugas Lapangan</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => (
                  <tr key={rev.id}>
                    <td>
                      <strong>{rev.customer?.name || "Customer"}</strong>
                      <span className="admin-cell-sub">{rev.customer?.email || "—"}</span>
                    </td>
                    <td>
                      <span className="text-amber-500 font-bold text-sm tracking-widest">
                        {"★".repeat(rev.rating)}
                        {"☆".repeat(5 - rev.rating)}
                      </span>
                      <span className="admin-cell-sub">{rev.rating} / 5</span>
                    </td>
                    <td style={{ maxWidth: "22rem" }}>
                      {rev.comment ? (
                        <p className="text-xs text-gray-800 leading-relaxed italic">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Tanpa catatan tertulis</span>
                      )}
                    </td>
                    <td>
                      <strong>{rev.booking?.service?.name || "Layanan"}</strong>
                      <Link
                        href={`/admin/orders/${rev.booking_id}`}
                        className="admin-row-link block text-[11px] mt-0.5"
                      >
                        Order #{rev.booking_id.slice(0, 8)} →
                      </Link>
                    </td>
                    <td>
                      <strong>{rev.staff?.name || "—"}</strong>
                      <span className="admin-cell-sub">Cleaner Bertugas</span>
                    </td>
                    <td>{formatDate(rev.created_at.slice(0, 10))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
