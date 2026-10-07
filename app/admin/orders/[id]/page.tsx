import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "../../../../lib/auth/session";
import { assignStaffAction, setBookingStatusAction } from "../../actions";
import { sendBookingMessageAction } from "../../../actions/bookings";
import {
  Feedback,
  formatDate,
  formatMoney,
  formatTime,
  PageHeading,
  StatusBadge,
  statusLabels,
} from "../../_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/orders/[id]">) {
  const [{ id }, feedback, current] = await Promise.all([params, searchParams, requireRole(["admin"])]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [bookingRes, staffRes, reviewRes, messagesRes] = await Promise.all([
    current.supabase
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
        customer:profiles!bookings_customer_id_fkey(id, name, email, phone),
        service:services(id, name, description, price, duration_minutes),
        staff_schedules(
          id,
          staff_id,
          scheduled_date,
          start_time,
          end_time,
          status,
          notes,
          staff:profiles!staff_schedules_staff_id_fkey(name, phone)
        ),
        booking_add_ons(
          id,
          unit_price,
          quantity,
          add_ons(name, description)
        )
      `)
      .eq("id", id)
      .maybeSingle(),
    current.supabase.from("profiles").select("id, name").eq("role", "staff").order("name"),
    current.supabase
      .from("booking_reviews")
      .select("id, rating, comment, created_at")
      .eq("booking_id", id)
      .maybeSingle(),
    current.supabase
      .from("booking_messages")
      .select(`
        id,
        message,
        created_at,
        sender_id,
        sender:profiles!booking_messages_sender_id_fkey(name, role)
      `)
      .eq("booking_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (bookingRes.error || !bookingRes.data) notFound();

  const row = bookingRes.data as unknown as {
    id: string;
    booking_date: string;
    start_time: string;
    address: string;
    notes: string | null;
    total_price: number;
    base_price: number | null;
    add_ons_price: number | null;
    duration_hours: number | null;
    housing_type: string | null;
    room_count: string | null;
    recurring_frequency: string | null;
    address_label: string | null;
    customer_phone: string | null;
    cancellation_reason: string | null;
    status: string;
    customer: { name: string; email: string | null; phone: string | null } | null;
    service: { name: string; description: string | null; price: number; duration_minutes: number } | null;
    staff_schedules: Array<{
      id: string;
      staff_id: string;
      scheduled_date: string;
      start_time: string;
      end_time: string | null;
      status: string;
      notes: string | null;
      staff: { name: string; phone: string | null } | null;
    }>;
    booking_add_ons: Array<{
      id: string;
      unit_price: number;
      quantity: number;
      add_ons: { name: string; description: string | null } | { name: string; description: string | null }[] | null;
    }>;
  };

  const staffData = staffRes.data ?? [];
  const review = reviewRes.data;
  const messages = messagesRes.data ?? [];
  const activeSchedules = row.staff_schedules.filter((item) => item.status !== "cancelled");

  const nextStatuses: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["cancelled"],
    assigned: ["cancelled"],
    in_progress: [],
    completed: [],
    cancelled: [],
  };

  return (
    <>
      <div className="admin-breadcrumb">
        <Link href="/admin/orders">← Kembali ke pesanan</Link>
      </div>
      <PageHeading
        eyebrow="Detail Booking"
        title={`Pesanan ${row.id.slice(0, 8)}`}
        description="Periksa informasi pelanggan, add-ons, jadwal, komunikasi, dan kelola alur penugasan petugas."
      />
      <Feedback success={feedback.ok} error={feedback.error} />

      {row.status === "cancelled" && (
        <div className="admin-feedback admin-feedback-error">
          <strong>Pesanan Dibatalkan:</strong> {row.cancellation_reason || "Tidak ada alasan spesifik."}
        </div>
      )}

      <div className="admin-detail-grid">
        {/* Booking Details */}
        <section className="admin-card admin-detail-card">
          <div className="admin-detail-title">
            <h2>Informasi Booking</h2>
            <StatusBadge status={row.status} />
          </div>
          <dl className="admin-detail-list">
            <div>
              <dt>Pelanggan</dt>
              <dd>{row.customer?.name ?? "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{row.customer?.email ?? "—"}</dd>
            </div>
            <div>
              <dt>Nomor Telepon</dt>
              <dd>{row.customer_phone || row.customer?.phone || "—"}</dd>
            </div>
            <div>
              <dt>Layanan Utama</dt>
              <dd>
                {row.service?.name ?? "—"}
                <span className="admin-cell-sub">
                  Durasi {row.duration_hours || 2} jam ({row.service?.duration_minutes}m base) · Katalog {formatMoney(row.service?.price ?? 0)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Tipe Hunian & Ruangan</dt>
              <dd>{row.housing_type ?? "Rumah"} · {row.room_count ?? "Standar"}</dd>
            </div>
            <div>
              <dt>Frekuensi</dt>
              <dd>{row.recurring_frequency ?? "one_time"}</dd>
            </div>
            <div>
              <dt>Jadwal Kedatangan</dt>
              <dd>
                {formatDate(row.booking_date)} · {formatTime(row.start_time)}
              </dd>
            </div>
            <div>
              <dt>Alamat ({row.address_label || "Lokasi"})</dt>
              <dd>{row.address}</dd>
            </div>
            <div className="admin-span-all">
              <dt>Catatan Khusus Pelanggan</dt>
              <dd>{row.notes || "Tidak ada catatan khusus."}</dd>
            </div>

            {/* Add-ons line items */}
            {row.booking_add_ons && row.booking_add_ons.length > 0 && (
              <div className="admin-span-all">
                <dt>Layanan Tambahan (Add-ons)</dt>
                <dd>
                  <ul className="admin-addons-list">
                    {row.booking_add_ons.map((item) => {
                      const addOn = Array.isArray(item.add_ons) ? item.add_ons[0] : item.add_ons;
                      return (
                        <li key={item.id}>
                          <span>+ {addOn?.name || "Add-on"}</span>
                          <strong>{formatMoney(item.unit_price)}</strong>
                        </li>
                      );
                    })}
                  </ul>
                </dd>
              </div>
            )}

            <div className="admin-span-all">
              <dt>Total Harga (Server Verified)</dt>
              <dd className="admin-price-emphasis">{formatMoney(row.total_price)}</dd>
            </div>
          </dl>
        </section>

        {/* Status Transition Control */}
        <section className="admin-card admin-detail-card">
          <div className="admin-detail-title">
            <h2>Ubah Status Booking</h2>
          </div>
          <p className="admin-muted">
            Transisi divalidasi oleh database. Penugasan petugas akan otomatis mengubah status booking menjadi &quot;assigned&quot;.
          </p>
          {nextStatuses[row.status]?.length ? (
            <form action={setBookingStatusAction} className="admin-inline-form">
              <input type="hidden" name="booking_id" value={row.id} />
              <label>
                Status Berikutnya
                <select name="status" defaultValue={nextStatuses[row.status][0]}>
                  {nextStatuses[row.status].map((value) => (
                    <option key={value} value={value}>
                      {statusLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <button className="admin-button admin-button-primary" type="submit">
                Simpan Perubahan Status
              </button>
            </form>
          ) : (
            <p className="admin-inline-note">
              Tidak ada transisi manual berikutnya untuk status saat ini.
            </p>
          )}

          {/* Customer Review display if completed */}
          {review && (
            <div className="admin-review-box mt-4 border-t pt-4">
              <h3>Ulasan Pelanggan</h3>
              <div className="review-stars-display">
                {"★".repeat(review.rating)}
                {"☆".repeat(5 - review.rating)}
                <span>({review.rating}/5)</span>
              </div>
              {review.comment && <p className="mt-1 text-sm italic">&ldquo;{review.comment}&rdquo;</p>}
              <small className="text-xs text-gray-500">
                Diberikan {new Date(review.created_at).toLocaleDateString("id-ID")}
              </small>
            </div>
          )}
        </section>
      </div>

      {/* Staff Assignment Section */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Penugasan Petugas</p>
            <h2>Jadwal Petugas Bertugas</h2>
          </div>
        </div>

        {activeSchedules.length ? (
          <div className="admin-schedule-cards">
            {activeSchedules.map((schedule) => (
              <article className="admin-card admin-assignment-card" key={schedule.id}>
                <div className="admin-detail-title">
                  <strong>{schedule.staff?.name ?? "Petugas"}</strong>
                  <span className="admin-status admin-status-neutral">{schedule.status}</span>
                </div>
                <p>
                  {formatDate(schedule.scheduled_date)} · {formatTime(schedule.start_time)}
                  {schedule.end_time ? `–${formatTime(schedule.end_time)}` : "–akhir hari"}
                </p>
                {schedule.staff?.phone && <p>Telepon: {schedule.staff.phone}</p>}
                {schedule.notes && <p>Catatan Petugas: {schedule.notes}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="admin-inline-note">Belum ada petugas yang ditugaskan untuk booking ini.</p>
        )}

        {["confirmed", "assigned"].includes(row.status) && (
          <form action={assignStaffAction} className="admin-card admin-assignment-form">
            <h3>Jadwalkan / Tugaskan Petugas</h3>
            <input type="hidden" name="booking_id" value={row.id} />
            <label>
              Pilih Petugas
              <select name="staff_id" required defaultValue="">
                <option value="" disabled>Pilih Petugas</option>
                {staffData.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tanggal
              <input name="scheduled_date" type="date" defaultValue={row.booking_date} required />
            </label>
            <label>
              Waktu Mulai
              <input name="start_time" type="time" defaultValue={String(row.start_time).slice(0, 5)} required />
            </label>
            <label>
              Waktu Selesai
              <input name="end_time" type="time" />
            </label>
            <label className="admin-span-all">
              Catatan Instruksi untuk Petugas
              <textarea name="notes" rows={2} maxLength={1000} placeholder="Instruksi spesifik peralatan atau akses lokasi" />
            </label>
            <button type="submit" className="admin-button admin-button-primary">
              Simpan & Beritahu Petugas
            </button>
          </form>
        )}
      </section>

      {/* Admin Booking Messages / Support Chat */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Log Percakapan</p>
            <h2>Pesan Booking ({messages.length})</h2>
          </div>
        </div>

        <div className="admin-card p-4">
          <div className="chat-messages-container" style={{ maxHeight: "16rem", overflowY: "auto" }}>
            {messages.length > 0 ? (
              messages.map((m) => {
                const sender = m.sender as unknown as { name: string; role: string } | null;
                return (
                  <div key={m.id} className="chat-bubble-row is-theirs mb-2">
                    <div className="chat-bubble">
                      <div className="chat-bubble-author">
                        <strong>{sender?.name || "Pengguna"}</strong>
                        <span className="role-tag">{sender?.role}</span>
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
              <p className="admin-muted">Belum ada pesan tercatat untuk booking ini.</p>
            )}
          </div>

          <form action={sendBookingMessageAction} className="chat-input-form mt-3">
            <input type="hidden" name="booking_id" value={row.id} />
            <input
              type="text"
              name="message"
              required
              maxLength={1000}
              placeholder="Kirim pesan bantuan atau instruksi sebagai admin..."
              className="admin-field flex-1"
            />
            <button type="submit" className="admin-button admin-button-primary">
              Kirim Pesan
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
