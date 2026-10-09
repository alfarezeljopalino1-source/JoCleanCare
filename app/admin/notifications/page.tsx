import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireRole } from "../../../lib/auth/session";
import { formatDate, PageHeading } from "../_components/admin-ui";

export const dynamic = "force-dynamic";

async function sendNotificationAction(formData: FormData) {
  "use server";
  const { supabase } = await requireRole(["admin"]);
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const type = String(formData.get("type") ?? "info").trim();

  if (!title || !message) return;

  if (targetUserId === "all") {
    const { data: users } = await supabase.from("profiles").select("id");
    if (users && users.length > 0) {
      const rows = users.map((u) => ({
        user_id: u.id,
        title,
        message,
        link: link || null,
        type,
      }));
      await supabase.from("notifications").insert(rows);
    }
  } else if (/^[0-9a-f-]{36}$/i.test(targetUserId)) {
    await supabase.from("notifications").insert({
      user_id: targetUserId,
      title,
      message,
      link: link || null,
      type,
    });
  }

  revalidatePath("/admin/notifications");
}

export default async function AdminNotificationsPage() {
  const { supabase } = await requireRole(["admin"]);

  const [notifRes, userRes] = await Promise.all([
    supabase
      .from("notifications")
      .select(`
        id,
        title,
        message,
        link,
        type,
        is_read,
        created_at,
        user:profiles!notifications_user_id_fkey (name, role, email)
      `)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, name, role").order("name"),
  ]);

  const notifications = (notifRes.data ?? []) as unknown as Array<{
    id: string;
    title: string;
    message: string;
    link: string | null;
    type: string;
    is_read: boolean;
    created_at: string;
    user: { name: string; role: string; email: string | null } | null;
  }>;

  const users = userRes.data ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Sistem & Notifikasi"
        title="Manajemen Notifikasi"
        description="Pantau log notifikasi otomatis yang terkirim ke pelanggan dan petugas, atau kirim pengumuman baru."
      />

      {/* Broadcast Form */}
      <section className="admin-card admin-form-card mb-6">
        <div>
          <p className="admin-eyebrow">Kirim Notifikasi</p>
          <h2>Kirim Pesan Notifikasi In-App</h2>
        </div>
        <form action={sendNotificationAction} noValidate className="admin-service-form">
          <label>
            Penerima
            <select name="user_id" required defaultValue="all">
              <option value="all">Semua Pengguna Terdaftar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </label>
          <label>
            Judul Notifikasi
            <input name="title" required maxLength={100} placeholder="Contoh: Pemeliharaan Sistem / Promo" />
          </label>
          <label>
            Tipe Notifikasi
            <select name="type" defaultValue="info">
              <option value="info">Informasi Umum</option>
              <option value="booking">Terkait Booking</option>
              <option value="status">Perubahan Status</option>
              <option value="assignment">Penugasan</option>
            </select>
          </label>
          <label className="admin-span-all">
            Isi Pesan Notifikasi
            <textarea name="message" required rows={2} maxLength={500} placeholder="Tuliskan pesan notifikasi yang jelas dan ramah..." />
          </label>
          <label className="admin-span-all">
            Tautan / Link Opsional
            <input name="link" placeholder="Contoh: /layanan atau /orders" />
          </label>
          <button type="submit" className="admin-button admin-button-primary">
            Kirim Notifikasi Sekarang
          </button>
        </form>
      </section>

      {/* Notifications Table */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Log Terkini</p>
            <h2>{notifications.length} Notifikasi Terakhir</h2>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="admin-empty">
            <p>Belum ada riwayat notifikasi.</p>
          </div>
        ) : (
          <div className="admin-card admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Penerima</th>
                  <th>Judul & Pesan</th>
                  <th>Tipe</th>
                  <th>Status Baca</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td>
                      {formatDate(n.created_at.slice(0, 10))}
                      <span className="admin-cell-sub">
                        {new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </span>
                    </td>
                    <td>
                      <strong>{n.user?.name || "Pengguna"}</strong>
                      <span className="admin-cell-sub">
                        {n.user?.role} · {n.user?.email || "No email"}
                      </span>
                    </td>
                    <td style={{ maxWidth: "25rem" }}>
                      <strong>{n.title}</strong>
                      <p className="text-xs text-gray-600 mt-1">{n.message}</p>
                      {n.link && (
                        <Link href={n.link} className="admin-row-link text-xs">
                          Tautan: {n.link}
                        </Link>
                      )}
                    </td>
                    <td>
                      <span className="admin-status admin-status-neutral">{n.type}</span>
                    </td>
                    <td>
                      <span className={n.is_read ? "text-green-700 text-xs font-semibold" : "text-amber-700 text-xs font-semibold"}>
                        {n.is_read ? "Sudah Dibaca" : "Belum Dibaca"}
                      </span>
                    </td>
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
