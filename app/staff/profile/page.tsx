import { requireRole } from "../../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function StaffProfilePage() {
  const { supabase, user, profile } = await requireRole(["staff"]);

  // Fetch staff stats and ratings
  const [schedulesRes, reviewsRes] = await Promise.all([
    supabase.from("staff_schedules").select("status").eq("staff_id", user.id),
    supabase.from("booking_reviews").select("rating, comment, created_at").eq("staff_id", user.id),
  ]);

  const schedules = schedulesRes.data ?? [];
  const reviews = reviewsRes.data ?? [];

  const completedCount = schedules.filter((s) => s.status === "completed").length;
  const activeCount = schedules.filter((s) => !["completed", "cancelled"].includes(s.status)).length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "5.0";

  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "ST";

  return (
    <main className="role-page staff-profile-page">
      <div className="role-page-inner">
        <header className="role-page-heading">
          <p className="role-kicker">Profil Petugas</p>
          <h1>Informasi Akun & Performa</h1>
          <p>Data profil kerja Anda dan penilaian dari pelanggan JoCleanCare.</p>
        </header>

        <section className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>
          <span className="profile-role">Staff Cleaner</span>
        </section>

        {/* Staff Performance Metrics */}
        <div className="staff-metrics-bar">
          <div className="staff-metric-box">
            <span>Rating Rata-rata</span>
            <strong>★ {avgRating}</strong>
            <small>dari {reviews.length} ulasan</small>
          </div>
          <div className="staff-metric-box">
            <span>Tugas Selesai</span>
            <strong>{completedCount}</strong>
            <small>Pekerjaan tuntas</small>
          </div>
          <div className="staff-metric-box">
            <span>Tugas Aktif</span>
            <strong>{activeCount}</strong>
            <small>Sedang berjalan</small>
          </div>
        </div>

        {/* Account Details */}
        <section className="admin-card staff-info-card">
          <h2>Data Diri & Kontak</h2>
          <dl className="admin-detail-list">
            <div>
              <dt>Nama Lengkap</dt>
              <dd>{profile.name}</dd>
            </div>
            <div>
              <dt>Email Akun</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Nomor Telepon Operasional</dt>
              <dd>{profile.phone || "Belum ditambahkan"}</dd>
            </div>
            <div>
              <dt>Peran Akun</dt>
              <dd>Petugas Kebersihan Resmi JoCleanCare</dd>
            </div>
          </dl>
        </section>

        {/* Recent Reviews received */}
        <section className="admin-card staff-reviews-section">
          <h2>Ulasan Terbaru dari Pelanggan</h2>
          {reviews.length === 0 ? (
            <p className="admin-muted">Belum ada ulasan yang masuk untuk pekerjaan Anda.</p>
          ) : (
            <div className="staff-reviews-list">
              {reviews.slice(0, 5).map((r, idx) => (
                <div key={idx} className="staff-review-item">
                  <div className="review-stars-display">
                    {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                    <span>({r.rating}/5)</span>
                  </div>
                  {r.comment && <p>&ldquo;{r.comment}&rdquo;</p>}
                  <small>{new Date(r.created_at).toLocaleDateString("id-ID")}</small>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
