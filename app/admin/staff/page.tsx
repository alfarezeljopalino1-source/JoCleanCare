import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import {
  EmptyState,
  Feedback,
  formatDate,
  formatTime,
  PageHeading,
  StatusBadge,
} from "../_components/admin-ui";
import { saveStaffAction, toggleStaffStatusAction } from "../actions";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [{ supabase }, params] = await Promise.all([
    requireRole(["admin"]),
    searchParams,
  ]);

  const [staffRes, schedulesRes, reviewsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, email, phone, is_active, created_at")
      .eq("role", "staff")
      .order("name"),
    supabase
      .from("staff_schedules")
      .select(`
        id,
        staff_id,
        booking_id,
        scheduled_date,
        start_time,
        end_time,
        status,
        booking:bookings(
          status,
          service:services(name),
          customer:profiles!bookings_customer_id_fkey(name)
        )
      `)
      .neq("status", "cancelled")
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("booking_reviews")
      .select("staff_id, rating"),
  ]);

  const staff = (staffRes.data ?? []) as unknown as Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    is_active?: boolean;
    created_at: string;
  }>;

  const schedules = (schedulesRes.data ?? []) as unknown as Array<{
    id: string;
    staff_id: string;
    booking_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string | null;
    status: string;
    booking: {
      status: string;
      service: { name: string } | null;
      customer: { name: string } | null;
    } | null;
  }>;

  const reviews = reviewsRes.data ?? [];

  // Map reviews per staff
  const staffRatingsMap: Record<string, { avg: string; count: number }> = {};
  for (const person of staff) {
    const personReviews = reviews.filter((r) => r.staff_id === person.id);
    const count = personReviews.length;
    const avg =
      count > 0
        ? (personReviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(1)
        : "5.0";
    staffRatingsMap[person.id] = { avg, count };
  }

  return (
    <>
      <PageHeading
        eyebrow="Tim Operasional JoCleanCare"
        title="Manajemen Petugas (Staff)"
        description="Kelola akun petugas kebersihan, tambahkan petugas baru, aktifkan atau nonaktifkan status kerja, serta pantau performa dan rating kepuasan."
      />
      <Feedback success={params.ok} error={params.error} />

      {/* Add / Promote Staff Form */}
      <section className="admin-card admin-form-card mb-6">
        <div>
          <p className="admin-eyebrow">Onboarding Petugas</p>
          <h2>Tambah / Tetapkan Petugas Baru</h2>
          <p className="text-xs text-gray-500 mt-1">
            Masukkan email pengguna yang sudah terdaftar untuk menetapkan perannya sebagai petugas lapangan JoCleanCare.
          </p>
        </div>
        <form action={saveStaffAction} className="admin-service-form">
          <label>
            Email Pengguna Terdaftar
            <input
              name="email"
              type="email"
              required
              placeholder="petugas@jocleancare.com"
            />
          </label>
          <label>
            Nama Lengkap Petugas
            <input
              name="name"
              type="text"
              required
              placeholder="Contoh: Budi Santoso"
            />
          </label>
          <label>
            Nomor Telepon Operasional
            <input
              name="phone"
              type="tel"
              placeholder="081234567890"
            />
          </label>
          <label className="admin-toggle-label flex items-center gap-2 pt-6">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked
            />
            <span>Status Aktif untuk Penugasan</span>
          </label>
          <button type="submit" className="admin-button admin-button-primary admin-span-all">
            Tetapkan Sebagai Staff Petugas
          </button>
        </form>
      </section>

      {/* Staff List Grid */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Daftar Tim</p>
            <h2>{staff.length} Petugas Terdaftar</h2>
          </div>
          <Link href="/admin/schedules" className="admin-text-link">
            Lihat Semua Jadwal Tim <span aria-hidden="true">→</span>
          </Link>
        </div>

        {staffRes.error ? (
          <Feedback error="Data petugas belum dapat dimuat. Coba lagi nanti." />
        ) : staff.length === 0 ? (
          <EmptyState
            title="Belum ada petugas terdaftar"
            description="Tambahkan petugas baru menggunakan form di atas untuk memulai penugasan."
          />
        ) : (
          <div className="admin-staff-grid">
            {staff.map((person) => {
              const activeJobs = schedules.filter(
                (item) => item.staff_id === person.id && !["completed", "cancelled"].includes(item.status)
              );
              const completedJobs = schedules.filter(
                (item) => item.staff_id === person.id && item.status === "completed"
              );
              const recentJobs = schedules
                .filter((item) => item.staff_id === person.id)
                .slice(0, 3);
              const ratingInfo = staffRatingsMap[person.id] || { avg: "5.0", count: 0 };
              const isActive = person.is_active !== false;

              return (
                <article className="admin-card admin-staff-card" key={person.id}>
                  <div className="admin-staff-person">
                    <span className="admin-avatar" aria-hidden="true">
                      {person.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part: string) => part[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold">{person.name}</h2>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{person.email ?? "Email tidak tersedia"}</p>
                      {person.phone && <p className="text-xs text-gray-500 font-mono">{person.phone}</p>}
                    </div>
                  </div>

                  {/* Rating & Workload Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 text-center my-3">
                    <div>
                      <span className="block text-xs text-gray-500">Rating</span>
                      <strong className="text-amber-600 font-bold">★ {ratingInfo.avg}</strong>
                      <small className="block text-[10px] text-gray-400">({ratingInfo.count} review)</small>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Tugas Aktif</span>
                      <strong className="text-teal-700 font-bold">{activeJobs.length}</strong>
                      <small className="block text-[10px] text-gray-400">berjalan</small>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-500">Selesai</span>
                      <strong className="text-gray-800 font-bold">{completedJobs.length}</strong>
                      <small className="block text-[10px] text-gray-400">tuntas</small>
                    </div>
                  </div>

                  {/* Recent Assignments */}
                  {recentJobs.length > 0 && (
                    <div className="admin-staff-jobs mb-3">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Tugas Terakhir:</p>
                      {recentJobs.map((job) => (
                        <div key={job.id} className="flex justify-between items-center p-2 rounded bg-gray-50 text-xs">
                          <div>
                            <strong>{job.booking?.service?.name ?? "Layanan"}</strong>
                            <span className="block text-gray-500">
                              {job.booking?.customer?.name ?? "Customer"} · {formatDate(job.scheduled_date)} ·{" "}
                              {formatTime(job.start_time)}
                            </span>
                          </div>
                          <StatusBadge status={job.status} />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Staff Operational Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
                    <Link
                      href={`/admin/schedules?staff_id=${person.id}`}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      Lihat Jadwal →
                    </Link>

                    {/* Toggle Active Status */}
                    <form action={toggleStaffStatusAction}>
                      <input type="hidden" name="staff_id" value={person.id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={isActive ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className={`text-xs px-2.5 py-1 rounded border font-medium ${
                          isActive
                            ? "border-red-200 text-red-700 hover:bg-red-50"
                            : "border-teal-200 text-teal-700 hover:bg-teal-50"
                        }`}
                      >
                        {isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
