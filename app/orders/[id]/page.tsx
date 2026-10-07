import Link from "next/link";
import { notFound } from "next/navigation";
import {
  bookingStatuses,
  formatBookingDate,
  formatRupiah,
  housingTypes,
  jakartaToday,
  recurringOptions,
  standardTimeSlots,
} from "../../../lib/bookings";
import { requireRole } from "../../../lib/auth/session";
import {
  cancelBookingAction,
  rescheduleBookingAction,
  sendBookingMessageAction,
  submitReviewAction,
  toggleFavoriteCleanerAction,
} from "../../actions/bookings";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
  searchParams,
}: PageProps<"/orders/[id]">) {
  const { id } = await params;
  const sParams = await searchParams;
  const okMessage = typeof sParams.ok === "string" ? sParams.ok : null;
  const errorMessage = typeof sParams.error === "string" ? sParams.error : null;
  const { supabase, user } = await requireRole(["customer"]);

  // 1. Fetch booking with service and add-ons
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      booking_date,
      start_time,
      address,
      notes,
      total_price,
      base_price,
      add_ons_price,
      duration_hours,
      housing_type,
      room_count,
      recurring_frequency,
      address_label,
      customer_phone,
      cancellation_reason,
      status,
      created_at,
      service_id,
      services (id, name, description, duration_minutes),
      booking_add_ons (
        id,
        unit_price,
        quantity,
        add_ons (id, name, description)
      )
    `)
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (error || !booking) notFound();

  // 2. Fetch assigned cleaner details via secure RPC
  const { data: staffList } = await supabase.rpc("get_customer_booking_staff", {
    p_booking_id: booking.id,
  });

  const assignedCleaner = Array.isArray(staffList) && staffList.length > 0 ? staffList[0] : null;

  // 3. Fetch existing review if completed
  const { data: existingReview } = await supabase
    .from("booking_reviews")
    .select("id, rating, comment, created_at")
    .eq("booking_id", booking.id)
    .maybeSingle();

  // 4. Fetch booking messages (chat)
  const { data: chatMessages } = await supabase
    .from("booking_messages")
    .select(`
      id,
      message,
      created_at,
      sender_id,
      sender:profiles!booking_messages_sender_id_fkey (name, role)
    `)
    .eq("booking_id", booking.id)
    .order("created_at", { ascending: true });

  // 5. Check if cleaner is favorited
  let isCleanerFavorite = false;
  if (assignedCleaner?.staff_id) {
    const { data: fav } = await supabase
      .from("favorite_cleaners")
      .select("id")
      .eq("customer_id", user.id)
      .eq("staff_id", assignedCleaner.staff_id)
      .maybeSingle();
    isCleanerFavorite = Boolean(fav);
  }

  const serviceValue = booking.services;
  const service = Array.isArray(serviceValue) ? serviceValue[0] : serviceValue;

  const isCancelled = booking.status === "cancelled";
  const isCompleted = booking.status === "completed";
  const canCancel = ["pending", "confirmed"].includes(booking.status);

  // Timeline Step Statuses
  const timelineSteps = [
    { key: "created", label: "Pesanan Dibuat", done: true },
    { key: "confirmed", label: "Dikonfirmasi", done: ["confirmed", "assigned", "in_progress", "completed"].includes(booking.status) },
    { key: "assigned", label: "Petugas Ditugaskan", done: ["assigned", "in_progress", "completed"].includes(booking.status) },
    { key: "in_progress", label: "Sedang Dikerjakan", done: ["in_progress", "completed"].includes(booking.status) },
    { key: "completed", label: "Selesai", done: booking.status === "completed" },
  ];

  const bookingCode = `JC-${booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  return (
    <main className="customer-page order-tracking-page">
      <div className="customer-container customer-narrow">
        <Link href="/orders" className="customer-back-link">
          <span aria-hidden="true">←</span> Kembali ke daftar pesanan
        </Link>

        {okMessage && (
          <div className="customer-notice customer-notice-success mb-4" role="status">
            ✓ {okMessage}
          </div>
        )}
        {errorMessage && (
          <div className="customer-notice customer-notice-error mb-4" role="alert">
            ✕ {errorMessage}
          </div>
        )}

        {/* Order Header */}
        <header className="order-detail-header">
          <div>
            <p className="customer-overline font-mono font-semibold">Nomor Booking: {bookingCode}</p>
            <h1>{service?.name ?? "Layanan JoCleanCare"}</h1>
            <p className="order-header-meta">
              {formatBookingDate(booking.booking_date)} · {String(booking.start_time).slice(0, 5)} WIB · Dibuat{" "}
              {new Date(booking.created_at).toLocaleDateString("id-ID")}
            </p>
          </div>
          <span className={`customer-status customer-status-${booking.status}`}>
            {bookingStatuses[booking.status] ?? booking.status}
          </span>
        </header>

        {/* ORDER TRACKING TIMELINE */}
        <section className="order-tracking-card" aria-label="Timeline Progres Pesanan">
          <h2>Pelacakan Status Pesanan</h2>

          {isCancelled ? (
            <div className="order-cancelled-banner">
              <strong>Pesanan ini telah dibatalkan.</strong>
              <p>{booking.cancellation_reason || "Dibatalkan oleh pelanggan atau admin."}</p>
            </div>
          ) : (
            <div className="order-stepper-timeline">
              {timelineSteps.map((step, idx) => {
                const isCurrent =
                  (step.key === "created" && booking.status === "pending") ||
                  step.key === booking.status;
                return (
                  <div
                    key={step.key}
                    className={`timeline-step ${step.done ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                  >
                    <div className="timeline-node">
                      <span className="node-icon">{step.done ? "✓" : idx + 1}</span>
                      {idx < timelineSteps.length - 1 && <div className="timeline-line" />}
                    </div>
                    <span className="timeline-text">{step.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ASSIGNED CLEANER CARD (Section 14) */}
        {assignedCleaner && !isCancelled && (
          <section className="order-cleaner-card">
            <div className="cleaner-head">
              <div className="cleaner-avatar">
                {assignedCleaner.staff_name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((p: string) => p[0])
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="cleaner-info">
                <span className="customer-overline">Petugas Kebersihan Anda</span>
                <h3>{assignedCleaner.staff_name}</h3>
                <div className="cleaner-rating-row">
                  <span className="cleaner-star">★</span>
                  <strong>{assignedCleaner.average_rating}</strong>
                  <span className="rating-count">({assignedCleaner.total_reviews} ulasan)</span>
                </div>
              </div>

              {/* Favorite cleaner toggle & Chat cleaner */}
              <div className="cleaner-actions-row">
                <a href="#chat-section" className="cleaner-chat-btn">
                  💬 Chat Petugas
                </a>
                <form action={toggleFavoriteCleanerAction} className="cleaner-fav-form">
                  <input type="hidden" name="staff_id" value={assignedCleaner.staff_id} />
                  <input type="hidden" name="is_favorite" value={String(isCleanerFavorite)} />
                  <button
                    type="submit"
                    className={`cleaner-fav-btn ${isCleanerFavorite ? "is-favorited" : ""}`}
                    title={isCleanerFavorite ? "Hapus dari favorit" : "Jadikan petugas favorit"}
                  >
                    {isCleanerFavorite ? "★ Petugas Favorit" : "☆ Simpan ke Favorit"}
                  </button>
                </form>
              </div>
            </div>

            <div className="cleaner-schedule-details">
              <div>
                <span>Jadwal Tugas</span>
                <strong>
                  {formatBookingDate(assignedCleaner.scheduled_date)} pukul{" "}
                  {String(assignedCleaner.start_time).slice(0, 5)} WIB
                </strong>
              </div>
              <div>
                <span>Status Kesiapan</span>
                <span className="cleaner-work-status">{assignedCleaner.assignment_status}</span>
              </div>
            </div>
          </section>
        )}

        {/* RATING & REVIEW (Section 15) */}
        {isCompleted && (
          <section className="order-review-section">
            <h2>Ulasan & Penilaian Pelanggan</h2>

            {existingReview ? (
              <div className="existing-review-box">
                <div className="review-stars-display">
                  {"★".repeat(existingReview.rating)}
                  {"☆".repeat(5 - existingReview.rating)}
                  <span className="review-score">({existingReview.rating} dari 5)</span>
                </div>
                {existingReview.comment && <p className="review-comment">&ldquo;{existingReview.comment}&rdquo;</p>}
                <small className="review-date">
                  Ditulis pada {new Date(existingReview.created_at).toLocaleDateString("id-ID")}
                </small>
              </div>
            ) : (
              <form action={submitReviewAction} className="review-form">
                <p>Bagaimana kepuasan Anda terhadap hasil pembersihan ini? Masukan Anda sangat berarti bagi kami.</p>
                <input type="hidden" name="booking_id" value={booking.id} />
                {assignedCleaner && <input type="hidden" name="staff_id" value={assignedCleaner.staff_id} />}

                <div className="rating-selector">
                  <label className="rating-label">Beri Bintang:</label>
                  <div className="star-radio-group">
                    {[5, 4, 3, 2, 1].map((val) => (
                      <label key={val} className="star-radio-item">
                        <input type="radio" name="rating" value={val} defaultChecked={val === 5} required />
                        <span>{val} ★</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="customer-field-label">
                  Tulis Ulasan (Opsional)
                  <textarea
                    name="comment"
                    rows={3}
                    maxLength={1000}
                    placeholder="Ceritakan pengalaman Anda, kebersihan ruangan, dan kerapian petugas..."
                    className="customer-field customer-textarea"
                  />
                </label>

                <button type="submit" className="customer-button customer-button-primary">
                  Kirim Ulasan & Rating
                </button>
              </form>
            )}
          </section>
        )}

        {/* BOOKING CHAT (Section 17) */}
        {!isCancelled && (
          <section id="chat-section" className="order-chat-section">
            <div className="chat-section-header">
              <h2>Pesan & Komunikasi Booking</h2>
              <p>Kirim pesan langsung ke petugas atau admin terkait kunjungan ini.</p>
            </div>

            <div className="chat-messages-container">
              {chatMessages && chatMessages.length > 0 ? (
                chatMessages.map((msg) => {
                  const isMe = msg.sender_id === user.id;
                  const senderName = (msg.sender as unknown as { name: string; role: string } | null)?.name || "Pengguna";
                  const senderRole = (msg.sender as unknown as { name: string; role: string } | null)?.role || "customer";
                  return (
                    <div key={msg.id} className={`chat-bubble-row ${isMe ? "is-mine" : "is-theirs"}`}>
                      <div className="chat-bubble">
                        <div className="chat-bubble-author">
                          <strong>{isMe ? "Anda" : senderName}</strong>
                          <span className="role-tag">{senderRole === "staff" ? "Petugas" : senderRole === "admin" ? "Admin" : "Pelanggan"}</span>
                        </div>
                        <p>{msg.message}</p>
                        <small className="chat-time">
                          {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </small>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="chat-empty">
                  <p>Belum ada pesan. Anda dapat memberi petunjuk tambahan atau menanyakan kedatangan di sini.</p>
                </div>
              )}
            </div>

            <form action={sendBookingMessageAction} className="chat-input-form">
              <input type="hidden" name="booking_id" value={booking.id} />
              <input
                type="text"
                name="message"
                required
                maxLength={1000}
                placeholder="Tulis pesan untuk petugas atau admin..."
                className="customer-field chat-field"
              />
              <button type="submit" className="customer-button customer-button-primary chat-send-btn">
                Kirim
              </button>
            </form>
          </section>
        )}

        {/* ORDER DETAILS & FACTS */}
        <section className="order-detail-section">
          <h2>Rincian Kunjungan & Lokasi</h2>
          <dl className="order-facts">
            <div>
              <dt>Tipe Hunian & Ruangan</dt>
              <dd>
                {housingTypes[booking.housing_type as keyof typeof housingTypes]?.label || "Rumah"} ·{" "}
                {booking.room_count || "2 Kamar"}
              </dd>
            </div>
            <div>
              <dt>Durasi Pembersihan</dt>
              <dd>{booking.duration_hours || 2} Jam Kunjungan</dd>
            </div>
            <div>
              <dt>Frekuensi Pemesanan</dt>
              <dd>{recurringOptions[booking.recurring_frequency as keyof typeof recurringOptions]?.label || "Sekali Pesan"}</dd>
            </div>
            <div>
              <dt>Nomor Telepon Konfirmasi</dt>
              <dd>{booking.customer_phone || "-"}</dd>
            </div>
            <div className="fact-full-width">
              <dt>Alamat Layanan ({booking.address_label || "Lokasi"})</dt>
              <dd>{booking.address}</dd>
            </div>
            <div className="fact-full-width">
              <dt>Catatan Khusus dari Pelanggan</dt>
              <dd>{booking.notes || "Tidak ada catatan khusus."}</dd>
            </div>
          </dl>
        </section>

        {/* ITEMIZED PRICE BREAKDOWN */}
        <section className="order-detail-section">
          <h2>Rincian Pembayaran</h2>
          <div className="order-pricing-table">
            <div className="price-item-row">
              <span>Biaya Layanan Utama ({service?.name})</span>
              <span>{formatRupiah(Number(booking.base_price || booking.total_price))}</span>
            </div>

            {booking.booking_add_ons && booking.booking_add_ons.length > 0 && (
              <>
                {booking.booking_add_ons.map((item) => {
                  const addOnObj = Array.isArray(item.add_ons) ? item.add_ons[0] : item.add_ons;
                  return (
                    <div key={item.id} className="price-item-row price-addon-row">
                      <span>+ {addOnObj?.name || "Layanan Tambahan"}</span>
                      <span>{formatRupiah(Number(item.unit_price))}</span>
                    </div>
                  );
                })}
              </>
            )}

            <div className="price-item-row price-total-row">
              <strong>Total Akhir (Server Verified)</strong>
              <strong>{formatRupiah(Number(booking.total_price))}</strong>
            </div>
          </div>
        </section>

        {/* RESCHEDULE WORKFLOW (Tahap 20 Spec) */}
        {canCancel && (
          <section className="order-reschedule-section">
            <details className="reschedule-details-dropdown">
              <summary className="reschedule-summary-trigger">
                📅 Ingin menjadwalkan ulang (reschedule) pesanan ini?
              </summary>
              <form action={rescheduleBookingAction} className="reschedule-form">
                <input type="hidden" name="booking_id" value={booking.id} />
                <p>
                  Anda dapat mengubah tanggal dan waktu kunjungan selama pesanan masih menunggu konfirmasi atau
                  dikonfirmasi sebelum petugas berangkat.
                </p>
                <div className="reschedule-inputs-grid">
                  <label className="customer-field-label">
                    Pilih Tanggal Baru
                    <input
                      type="date"
                      name="new_date"
                      min={jakartaToday()}
                      defaultValue={booking.booking_date}
                      required
                      className="customer-field"
                    />
                  </label>
                  <label className="customer-field-label">
                    Pilih Jam Baru (WIB)
                    <select
                      name="new_time"
                      defaultValue={String(booking.start_time).slice(0, 5)}
                      required
                      className="customer-field"
                    >
                      {standardTimeSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {slot} WIB
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button type="submit" className="customer-button customer-button-primary reschedule-submit-button">
                  Konfirmasi Jadwal Baru
                </button>
              </form>
            </details>
          </section>
        )}

        {/* CANCELLATION WORKFLOW (Section 11 / Tahap 20 Spec) */}
        {canCancel && (
          <section className="order-cancel-section">
            <details className="cancel-details-dropdown">
              <summary className="cancel-summary-trigger">
                Ingin membatalkan pesanan ini?
              </summary>
              <form action={cancelBookingAction} className="cancel-form">
                <input type="hidden" name="booking_id" value={booking.id} />
                <p>
                  Pembatalan gratis dapat dilakukan selama pesanan masih berstatus Menunggu Konfirmasi atau
                  Dikonfirmasi sebelum petugas berangkat.
                </p>
                <label className="customer-field-label">
                  Alasan Pembatalan
                  <select name="cancellation_reason" required className="customer-field">
                    <option value="Perubahan jadwal / urusan mendadak">Perubahan jadwal / urusan mendadak</option>
                    <option value="Salah memilih layanan atau waktu">Salah memilih layanan atau waktu</option>
                    <option value="Sudah dibersihkan sendiri">Sudah dibersihkan sendiri</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </label>
                <button type="submit" className="customer-button cancel-submit-button">
                  Konfirmasi Batalkan Pesanan
                </button>
              </form>
            </details>
          </section>
        )}
      </div>
    </main>
  );
}
