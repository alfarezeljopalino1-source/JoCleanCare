import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "../../../../lib/auth/session";
import { formatBookingDate } from "../../../../lib/bookings";
import { updateStaffJobStatusAction } from "../../../actions/staff";
import { sendBookingMessageAction } from "../../../actions/bookings";

export const dynamic = "force-dynamic";

export default async function StaffJobDetailPage({
  params,
  searchParams,
}: PageProps<"/staff/orders/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const current = await requireRole(["staff"]);

  // Fetch job via authorized RPC
  const { data: jobList, error: jobError } = await current.supabase.rpc("get_staff_assigned_job", {
    p_booking_id: id,
  });

  if (jobError || !jobList || jobList.length === 0) {
    notFound();
  }

  const job = jobList[0] as {
    booking_id: string;
    schedule_id: string;
    service_name: string;
    booking_date: string;
    scheduled_date: string;
    start_time: string;
    end_time: string | null;
    booking_status: string;
    assignment_status: string;
    address: string;
    booking_notes: string | null;
    customer_name: string;
    customer_phone: string | null;
  };

  // Fetch add-ons for this booking
  const { data: bookingAddOns } = await current.supabase
    .from("booking_add_ons")
    .select("id, unit_price, quantity, add_ons(name, description)")
    .eq("booking_id", job.booking_id);

  // Fetch chat messages
  const { data: messages } = await current.supabase
    .from("booking_messages")
    .select(`
      id,
      message,
      created_at,
      sender_id,
      sender:profiles!booking_messages_sender_id_fkey(name, role)
    `)
    .eq("booking_id", job.booking_id)
    .order("created_at", { ascending: true });

  const schedStatus = job.assignment_status;

  return (
    <main className="role-page staff-job-detail-page">
      <div className="role-page-inner">
        <div className="staff-breadcrumb">
          <Link href="/staff">← Kembali ke dashboard tugas</Link>
        </div>

        <header className="role-page-heading">
          <p className="role-kicker">Lembar Kerja Petugas</p>
          <h1>{job.service_name}</h1>
          <p>
            {formatBookingDate(job.scheduled_date)} · {String(job.start_time).slice(0, 5)} WIB · Status Tugas:{" "}
            <span className={`customer-status customer-status-${schedStatus}`}>{schedStatus}</span>
          </p>
        </header>

        {sp.ok && (
          <div className="customer-notice" role="status">
            {sp.ok}
          </div>
        )}
        {sp.error && (
          <div className="customer-notice customer-notice-error" role="alert">
            {sp.error}
          </div>
        )}

        <div className="staff-detail-grid">
          {/* Main Job Information */}
          <section className="admin-card staff-info-card">
            <h2>Informasi Pelanggan & Lokasi</h2>
            <dl className="admin-detail-list">
              <div>
                <dt>Nama Pelanggan</dt>
                <dd><strong>{job.customer_name}</strong></dd>
              </div>
              <div>
                <dt>Nomor Telepon Pelanggan</dt>
                <dd>
                  {job.customer_phone ? (
                    <a href={`tel:${job.customer_phone}`} className="staff-tel-link">
                      {job.customer_phone} 📞
                    </a>
                  ) : (
                    "Tidak ada nomor"
                  )}
                </dd>
              </div>
              <div className="admin-span-all">
                <dt>Alamat Lengkap Kunjungan</dt>
                <dd className="staff-address-highlight">{job.address}</dd>
              </div>
              <div className="admin-span-all">
                <dt>Instruksi Khusus dari Pelanggan</dt>
                <dd>{job.booking_notes || "Tidak ada instruksi khusus."}</dd>
              </div>
            </dl>
          </section>

          {/* Work Status Transition Control */}
          <section className="admin-card staff-status-action-card">
            <h2>Perbarui Status Tugas</h2>
            <p className="admin-muted">
              Perbarui status ini secara bertahap agar pelanggan dan admin dapat memantau progres Anda.
            </p>

            {schedStatus === "scheduled" && (
              <form action={updateStaffJobStatusAction} noValidate className="staff-action-form">
                <input type="hidden" name="schedule_id" value={job.schedule_id} />
                <input type="hidden" name="booking_id" value={job.booking_id} />
                <input type="hidden" name="status" value="accepted" />
                <p>Status saat ini: <strong>Dijadwalkan Admin</strong></p>
                <button type="submit" className="customer-button customer-button-primary full-width">
                  ✓ Terima Penugasan & Siap Berangkat
                </button>
              </form>
            )}

            {schedStatus === "accepted" && (
              <form action={updateStaffJobStatusAction} noValidate className="staff-action-form">
                <input type="hidden" name="schedule_id" value={job.schedule_id} />
                <input type="hidden" name="booking_id" value={job.booking_id} />
                <input type="hidden" name="status" value="in_progress" />
                <p>Status saat ini: <strong>Tugas Diterima</strong></p>
                <button type="submit" className="customer-button customer-button-primary full-width">
                  ▶ Tiba di Lokasi & Mulai Bekerja
                </button>
              </form>
            )}

            {schedStatus === "in_progress" && (
              <form action={updateStaffJobStatusAction} noValidate className="staff-action-form">
                <input type="hidden" name="schedule_id" value={job.schedule_id} />
                <input type="hidden" name="booking_id" value={job.booking_id} />
                <input type="hidden" name="status" value="completed" />
                <p>Status saat ini: <strong>Sedang Dikerjakan</strong></p>

                <label className="customer-field-label">
                  Catatan Hasil Pengerjaan (Opsional)
                  <textarea
                    name="notes"
                    rows={2}
                    maxLength={500}
                    placeholder="Contoh: Seluruh area ruang tamu dan kamar telah bersih disinfektan."
                    className="customer-field customer-textarea"
                  />
                </label>

                <button type="submit" className="customer-button customer-button-primary full-width">
                  ✓ Selesaikan Pekerjaan
                </button>
              </form>
            )}

            {schedStatus === "completed" && (
              <div className="staff-completed-badge-card">
                <span className="trust-check">✓</span>
                <strong>Pekerjaan Telah Selesai</strong>
                <p>Terima kasih atas dedikasi dan kerapian kerja Anda!</p>
              </div>
            )}
          </section>
        </div>

        {/* Task Checklist / Add-ons */}
        {bookingAddOns && bookingAddOns.length > 0 && (
          <section className="admin-card staff-checklist-section">
            <h2>Layanan Tambahan yang Wajib Dikerjakan (Add-ons)</h2>
            <ul className="staff-checklist">
              {bookingAddOns.map((item) => {
                const addOn = Array.isArray(item.add_ons) ? item.add_ons[0] : item.add_ons;
                return (
                  <li key={item.id}>
                    <input type="checkbox" id={item.id} />
                    <label htmlFor={item.id}>
                      <strong>{addOn?.name || "Layanan Tambahan"}</strong>
                      <p>{addOn?.description}</p>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* In-Job Chat with Customer */}
        <section className="admin-card staff-chat-section">
          <h2>Komunikasi dengan Pelanggan</h2>
          <div className="chat-messages-container">
            {messages && messages.length > 0 ? (
              messages.map((m) => {
                const isMe = m.sender_id === current.user.id;
                const senderName = (m.sender as unknown as { name: string } | null)?.name || "Pengguna";
                return (
                  <div key={m.id} className={`chat-bubble-row ${isMe ? "is-mine" : "is-theirs"}`}>
                    <div className="chat-bubble">
                      <div className="chat-bubble-author">
                        <strong>{isMe ? "Anda (Petugas)" : senderName}</strong>
                      </div>
                      <p>{m.message}</p>
                      <small className="chat-time">
                        {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </small>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="chat-empty">
                <p>Belum ada pesan. Anda dapat memberi kabar perkiraan tiba di sini.</p>
              </div>
            )}
          </div>

          <form action={sendBookingMessageAction} className="chat-input-form">
            <input type="hidden" name="booking_id" value={job.booking_id} />
            <input
              type="text"
              name="message"
              required
              maxLength={1000}
              placeholder="Kirim pesan ke pelanggan (misal: 'Halo, saya sudah di depan lokasi')..."
              className="customer-field chat-field"
            />
            <button type="submit" className="customer-button customer-button-primary chat-send-btn">
              Kirim Pesan
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
