import { requireRole } from "../../../lib/auth/session";
import { formatMoney, PageHeading, StatusBadge } from "../_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const { supabase } = await requireRole(["admin"]);

  // 1. Fetch bookings with service & status
  const [bookingsRes, staffRes, reviewsRes, servicesRes] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        id,
        total_price,
        status,
        service_id,
        booking_date,
        services(id, name, price)
      `),
    supabase
      .from("profiles")
      .select("id, name, role")
      .eq("role", "staff"),
    supabase
      .from("booking_reviews")
      .select("rating, staff_id"),
    supabase
      .from("services")
      .select("id, name, price"),
  ]);

  const bookings = bookingsRes.data ?? [];
  const staff = staffRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const services = servicesRes.data ?? [];

  // Summary Metrics
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const totalRevenue = completedBookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);
  const avgOrderValue = completedBookings.length > 0 ? Math.round(totalRevenue / completedBookings.length) : 0;

  // Status Breakdown Map
  const statusCounts: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    assigned: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
  };
  for (const b of bookings) {
    statusCounts[b.status] = (statusCounts[b.status] || 0) + 1;
  }

  // Service Popularity Map
  const serviceStatsMap: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const s of services) {
    serviceStatsMap[s.id] = { name: s.name, count: 0, revenue: 0 };
  }
  for (const b of bookings) {
    if (b.service_id && serviceStatsMap[b.service_id]) {
      serviceStatsMap[b.service_id].count += 1;
      if (b.status === "completed") {
        serviceStatsMap[b.service_id].revenue += Number(b.total_price || 0);
      }
    }
  }
  const topServices = Object.values(serviceStatsMap).sort((a, b) => b.count - a.count);

  // Staff Performance Leaderboard
  // Fetch completed staff schedules
  const { data: staffSchedulesData } = await supabase
    .from("staff_schedules")
    .select("staff_id, status");
  const staffSchedules = staffSchedulesData ?? [];

  const staffPerformance = staff.map((person) => {
    const jobs = staffSchedules.filter((s) => s.staff_id === person.id && s.status === "completed").length;
    const personReviews = reviews.filter((r) => r.staff_id === person.id);
    const avgScore =
      personReviews.length > 0
        ? (personReviews.reduce((sum, r) => sum + r.rating, 0) / personReviews.length).toFixed(1)
        : "5.0";
    return {
      name: person.name,
      completedJobs: jobs,
      rating: avgScore,
      reviewCount: personReviews.length,
    };
  }).sort((a, b) => b.completedJobs - a.completedJobs);

  // Overall Customer Satisfaction
  const overallAvgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  return (
    <>
      <PageHeading
        eyebrow="Analitik & Kinerja"
        title="Laporan Bisnis & Operasional"
        description="Pantau laporan volume pesanan, pendapatan transaksi, peringkat layanan terlaris, dan kinerja tim kebersihan JoCleanCare."
      />

      {/* Top Level Financial & Volume Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="admin-card">
          <span className="text-xs uppercase font-bold text-gray-400">Total Booking Masuk</span>
          <div className="text-2xl font-bold text-gray-800 mt-1">{totalBookings}</div>
          <span className="text-[11px] text-gray-500">Semua riwayat pemesanan</span>
        </div>
        <div className="admin-card">
          <span className="text-xs uppercase font-bold text-gray-400">Omset Pesanan Selesai</span>
          <div className="text-2xl font-bold text-teal-800 mt-1">{formatMoney(totalRevenue)}</div>
          <span className="text-[11px] text-gray-500">{completedBookings.length} order tuntas dibayar</span>
        </div>
        <div className="admin-card">
          <span className="text-xs uppercase font-bold text-gray-400">Rata-rata Nilai Order (AOV)</span>
          <div className="text-2xl font-bold text-gray-800 mt-1">{formatMoney(avgOrderValue)}</div>
          <span className="text-[11px] text-gray-500">Rerata per kunjungan selesai</span>
        </div>
        <div className="admin-card">
          <span className="text-xs uppercase font-bold text-gray-400">Kepuasan Pelanggan</span>
          <div className="text-2xl font-bold text-amber-500 mt-1">★ {overallAvgRating} / 5.0</div>
          <span className="text-[11px] text-gray-500">Dari {reviews.length} ulasan masuk</span>
        </div>
      </div>

      {/* Breakdown by Status */}
      <section className="admin-card mb-6">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Volume Booking Berdasarkan Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {Object.entries(statusCounts).map(([statusKey, count]) => {
            const pct = totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0;
            return (
              <div key={statusKey} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                <StatusBadge status={statusKey} />
                <div className="text-xl font-extrabold text-gray-900 mt-2">{count}</div>
                <small className="text-[11px] text-gray-500">{pct}% dari total</small>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two columns: Top Services & Staff Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services */}
        <section className="admin-card">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Layanan Paling Banyak Dipesan</h2>
          {topServices.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada data pesanan layanan.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {topServices.map((svc, idx) => (
                <div key={svc.name} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <strong className="text-gray-900 block">{svc.name}</strong>
                      <span className="text-gray-400 text-[11px]">
                        Omset: {formatMoney(svc.revenue)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="text-teal-700 block font-bold">{svc.count} Booking</strong>
                    <span className="text-[10px] text-gray-400">
                      {totalBookings > 0 ? Math.round((svc.count / totalBookings) * 100) : 0}% porsi
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Staff Leaderboard */}
        <section className="admin-card">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Leaderboard Kinerja Petugas (Staff)</h2>
          {staffPerformance.length === 0 ? (
            <p className="text-xs text-gray-400">Belum ada data petugas terdaftar.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {staffPerformance.map((person, idx) => (
                <div key={person.name} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <strong className="text-gray-900 block">{person.name}</strong>
                      <span className="text-amber-600 font-semibold text-[11px]">
                        ★ {person.rating} ({person.reviewCount} ulasan)
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <strong className="text-gray-800 block font-bold">
                      {person.completedJobs} Pekerjaan
                    </strong>
                    <span className="text-[10px] text-gray-400">Tuntas selesai</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
