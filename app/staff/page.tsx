import Link from "next/link";
import { requireRole } from "../../lib/auth/session";
import { bookingStatuses, formatBookingDate, jakartaToday } from "../../lib/bookings";

export const dynamic = "force-dynamic";

export default async function StaffDashboard() {
  const { supabase, user, profile } = await requireRole(["staff"]);
  const today = jakartaToday();

  // Query schedules assigned to this staff member
  const { data: schedules, error } = await supabase
    .from("staff_schedules")
    .select(`
      id,
      booking_id,
      scheduled_date,
      start_time,
      end_time,
      status,
      notes,
      booking:bookings (
        id,
        address,
        notes,
        status,
        customer_phone,
        services (name),
        customer:profiles!bookings_customer_id_fkey (name, phone)
      )
    `)
    .eq("staff_id", user.id)
    .order("scheduled_date", { ascending: true })
    .order("start_time", { ascending: true });

  const rows = (schedules ?? []) as unknown as Array<{
    id: string;
    booking_id: string;
    scheduled_date: string;
    start_time: string;
    end_time: string | null;
    status: string;
    notes: string | null;
    booking: {
      id: string;
      address: string;
      notes: string | null;
      status: string;
      customer_phone: string | null;
      services: { name: string } | { name: string }[] | null;
      customer: { name: string; phone: string | null } | null;
    } | null;
  }>;

  const todayJobs = rows.filter(
    (item) => item.scheduled_date === today && item.status !== "cancelled"
  );
  const upcomingJobs = rows.filter(
    (item) => item.scheduled_date > today && !["completed", "cancelled"].includes(item.status)
  );
  const completedJobs = rows.filter((item) => item.status === "completed");

  const getService = (item: typeof rows[0]) => {
    const s = item.booking?.services;
    return Array.isArray(s) ? s[0]?.name : s?.name;
  };

  return (
    <main className="role-page staff-dashboard">
      <div className="role-page-inner">
        <header className="role-page-heading staff-dashboard-heading">
          <p className="role-kicker">Portal Petugas Kebersihan</p>
          <h1>Halo, {profile.name || "Petugas"}</h1>
          <p>
            Pantau dan perbarui tugas kebersihan Anda hari ini. Pastikan untuk memperbarui status pekerjaan saat tiba dan selesai.
          </p>
        </header>

        {error && (
          <p className="customer-notice customer-notice-error" role="alert">
            Gagal memuat jadwal tugas. Silakan muat ulang halaman.
          </p>
        )}

        {/* Quick KPI stats */}
        <div className="staff-metrics-bar">
          <div className="staff-metric-box">
            <span>Tugas Hari Ini</span>
            <strong>{todayJobs.length}</strong>
          </div>
          <div className="staff-metric-box">
            <span>Tugas Mendatang</span>
            <strong>{upcomingJobs.length}</strong>
          </div>
          <div className="staff-metric-box">
            <span>Tugas Selesai</span>
            <strong>{completedJobs.length}</strong>
          </div>
        </div>

        {/* 1. TODAY'S JOBS */}
        <section className="staff-section" aria-labelledby="today-jobs-title">
          <div className="staff-section-head">
            <h2 id="today-jobs-title">Pekerjaan Hari Ini ({formatBookingDate(today)})</h2>
            <span className="staff-section-badge">{todayJobs.length} Tugas</span>
          </div>

          {todayJobs.length === 0 ? (
            <div className="staff-empty-card">
              <p>Tidak ada tugas pembersihan terjadwal untuk hari ini.</p>
              <small>Admin akan menugaskan pekerjaan baru sesuai ketersediaan jadwal Anda.</small>
            </div>
          ) : (
            <div className="staff-jobs-list">
              {todayJobs.map((job) => (
                <article key={job.id} className="staff-job-card">
                  <div className="job-card-top">
                    <div>
                      <span className="job-time">
                        {String(job.start_time).slice(0, 5)} WIB {job.end_time ? `– ${String(job.end_time).slice(0, 5)} WIB` : ""}
                      </span>
                      <h3>{getService(job) ?? "Layanan JoCleanCare"}</h3>
                    </div>
                    <span className={`customer-status customer-status-${job.status}`}>
                      {bookingStatuses[job.status] ?? (job.status === "scheduled" ? "Terjadwal" : job.status)}
                    </span>
                  </div>

                  <div className="job-card-details">
                    <div>
                      <dt>Pelanggan</dt>
                      <dd>
                        <strong>{job.booking?.customer?.name || "Pelanggan"}</strong>
                        <span className="job-phone">
                          Telp: {job.booking?.customer_phone || job.booking?.customer?.phone || "-"}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Alamat Layanan</dt>
                      <dd className="job-address">{job.booking?.address}</dd>
                    </div>
                    {job.booking?.notes && (
                      <div className="job-notes-row">
                        <dt>Catatan Pelanggan</dt>
                        <dd>&ldquo;{job.booking.notes}&rdquo;</dd>
                      </div>
                    )}
                  </div>

                  <div className="job-card-actions">
                    <Link href={`/staff/orders/${job.booking_id}`} className="customer-button customer-button-primary">
                      Buka Lembar Kerja & Update Status <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 2. UPCOMING JOBS */}
        <section className="staff-section" aria-labelledby="upcoming-jobs-title">
          <div className="staff-section-head">
            <h2 id="upcoming-jobs-title">Pekerjaan Mendatang</h2>
            <Link href="/staff/schedules" className="role-action-link">
              Lihat Kalender Lengkap <span aria-hidden="true">→</span>
            </Link>
          </div>

          {upcomingJobs.length === 0 ? (
            <div className="staff-empty-card">
              <p>Belum ada jadwal pekerjaan mendatang.</p>
            </div>
          ) : (
            <div className="staff-jobs-list">
              {upcomingJobs.slice(0, 5).map((job) => (
                <article key={job.id} className="staff-job-card is-upcoming">
                  <div className="job-card-top">
                    <div>
                      <span className="job-date">
                        {formatBookingDate(job.scheduled_date)} · {String(job.start_time).slice(0, 5)} WIB
                      </span>
                      <h3>{getService(job) ?? "Layanan JoCleanCare"}</h3>
                    </div>
                    <span className="customer-status customer-status-confirmed">Terjadwal</span>
                  </div>

                  <div className="job-card-details">
                    <div>
                      <dt>Pelanggan</dt>
                      <dd>{job.booking?.customer?.name}</dd>
                    </div>
                    <div>
                      <dt>Alamat</dt>
                      <dd className="job-address">{job.booking?.address}</dd>
                    </div>
                  </div>

                  <div className="job-card-actions">
                    <Link href={`/staff/orders/${job.booking_id}`} className="customer-button customer-button-link">
                      Detail Tugas <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 3. RECENT COMPLETED JOBS */}
        <section className="staff-section" aria-labelledby="completed-jobs-title">
          <div className="staff-section-head">
            <h2 id="completed-jobs-title">Riwayat Pekerjaan Selesai</h2>
            <span className="staff-section-badge">{completedJobs.length} Selesai</span>
          </div>

          {completedJobs.length === 0 ? (
            <div className="staff-empty-card">
              <p>Belum ada riwayat pekerjaan selesai.</p>
            </div>
          ) : (
            <div className="staff-completed-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Layanan</th>
                    <th>Pelanggan</th>
                    <th>Jam Selesai</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {completedJobs.slice(0, 5).map((job) => (
                    <tr key={job.id}>
                      <td>{formatBookingDate(job.scheduled_date)}</td>
                      <td><strong>{getService(job)}</strong></td>
                      <td>{job.booking?.customer?.name}</td>
                      <td>{job.end_time ? `${String(job.end_time).slice(0, 5)} WIB` : "Selesai"}</td>
                      <td>
                        <Link href={`/staff/orders/${job.booking_id}`} className="admin-row-link">
                          Lihat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
