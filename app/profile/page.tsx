import Link from "next/link";
import { requireRole } from "../../lib/auth/session";
import {
  getCustomerAddresses,
  getCustomerFavoriteCleaners,
  getNotifications,
  type CustomerAddress,
  type NotificationItem,
} from "../../lib/bookings";
import {
  markNotificationReadAction,
  saveCustomerAddressAction,
  toggleFavoriteCleanerAction,
} from "../actions/bookings";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { supabase, user, profile } = await requireRole(["customer"]);

  const [addressesRes, favoritesRes, notifsRes] = await Promise.all([
    getCustomerAddresses(supabase, user.id),
    getCustomerFavoriteCleaners(supabase, user.id),
    getNotifications(supabase, user.id),
  ]);

  const addresses = (addressesRes.data ?? []) as unknown as CustomerAddress[];
  const favorites = (favoritesRes.data ?? []) as unknown as Array<{
    staff_id: string;
    profiles: { id: string; name: string; phone: string | null } | null;
  }>;
  const notifications = (notifsRes.data ?? []) as unknown as NotificationItem[];

  const details = [
    ["Nama Lengkap", profile.name],
    ["Email Akun", profile.email],
    ["Nomor Telepon", profile.phone || "Belum ditambahkan"],
  ] as const;

  const initials =
    profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part: string) => part[0])
      .join("")
      .toUpperCase() || "JC";

  return (
    <main className="customer-page profile-page">
      <div className="customer-container customer-narrow">
        <Link href="/dashboard" className="customer-back-link">
          <span aria-hidden="true">←</span> Kembali ke Dashboard
        </Link>
        <header className="customer-page-heading">
          <p className="customer-overline">Pengaturan Akun</p>
          <h1>Profil & Preferensi</h1>
          <p>Kelola data akun, buku alamat hunian, staf favorit, serta pemberitahuan layanan Anda.</p>
        </header>

        {/* Identity Card */}
        <section className="profile-identity" aria-label="Identitas akun">
          <span className="profile-avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <h2>{profile.name || "Pelanggan JoCleanCare"}</h2>
            <p>{profile.email}</p>
          </div>
          <span className="profile-role">Customer</span>
        </section>

        {/* Account Basic Info */}
        <section className="profile-settings">
          <h2>Informasi Akun</h2>
          <dl>
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value || "Belum tersedia"}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ADDRESS BOOK (Section 8: Address Management) */}
        <section className="profile-section-card">
          <div className="section-card-head">
            <div>
              <h2>Buku Alamat Tersimpan</h2>
              <p>Simpan alamat rumah, apartemen, atau kantor untuk mempercepat proses booking berikutnya.</p>
            </div>
          </div>

          <div className="saved-addresses-list">
            {addresses.length === 0 ? (
              <p className="customer-muted">Belum ada alamat tersimpan di akun Anda.</p>
            ) : (
              <div className="address-cards-stack">
                {addresses.map((addr) => (
                  <article key={addr.id} className="address-display-item">
                    <div className="address-item-top">
                      <strong>{addr.label}</strong>
                      {addr.is_default && <span className="default-address-tag">Utama</span>}
                    </div>
                    <p className="address-item-full">{addr.full_address}</p>
                    <small className="address-item-contact">Telp: {addr.phone}</small>
                    {addr.notes && <p className="address-item-notes">Catatan: &ldquo;{addr.notes}&rdquo;</p>}
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* Add New Address Form */}
          <details className="add-address-dropdown">
            <summary className="customer-inline-link font-semibold cursor-pointer py-2">
              + Tambah Alamat Baru
            </summary>
            <form action={saveCustomerAddressAction} noValidate className="new-address-form">
              <div className="booking-fields-grid">
                <label className="customer-field-label">
                  Label Alamat
                  <input
                    type="text"
                    name="label"
                    required
                    placeholder="Contoh: Rumah Sudirman / Apartemen Senopati"
                    className="customer-field"
                  />
                </label>
                <label className="customer-field-label">
                  Nomor Telepon
                  <input
                    type="tel"
                    name="phone"
                    required
                    defaultValue={profile.phone || ""}
                    placeholder="081234567890"
                    className="customer-field"
                  />
                </label>
                <label className="customer-field-label booking-service-field">
                  Alamat Lengkap
                  <textarea
                    name="full_address"
                    required
                    minLength={8}
                    maxLength={500}
                    placeholder="Nama jalan, nomor rumah/unit, RT/RW, kecamatan, patokan lokasi"
                    className="customer-field customer-textarea"
                  />
                </label>
                <label className="customer-field-label booking-service-field">
                  Petunjuk Akses / Catatan Khusus
                  <textarea
                    name="notes"
                    maxLength={500}
                    placeholder="Contoh: Masuk lewat pos satpam timur, kunci ada di resepsionis"
                    className="customer-field customer-textarea"
                  />
                </label>
                <label className="admin-checkbox booking-service-field">
                  <input type="checkbox" name="is_default" />
                  Jadikan sebagai alamat default utama
                </label>
              </div>
              <button type="submit" className="customer-button customer-button-primary mt-3">
                Simpan Alamat Baru
              </button>
            </form>
          </details>
        </section>

        {/* FAVORITE CLEANERS (Section 16: Favorite Cleaner) */}
        <section className="profile-section-card">
          <h2>Petugas Kebersihan Favorit</h2>
          <p className="customer-muted mb-3">
            Petugas yang Anda tandai sebagai favorit dapat dipilih kembali pada saat melakukan pemesanan.
          </p>

          {favorites.length === 0 ? (
            <div className="customer-empty">
              <p>Anda belum memiliki petugas favorit. Anda dapat menyimpan petugas favorit dari halaman detail pesanan yang selesai.</p>
            </div>
          ) : (
            <div className="favorite-cleaners-list">
              {favorites.map((fav) => (
                <div key={fav.staff_id} className="favorite-cleaner-item">
                  <div className="cleaner-item-avatar">
                    {(fav.profiles?.name || "Petugas")
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="cleaner-item-info">
                    <strong>{fav.profiles?.name || "Petugas JoCleanCare"}</strong>
                    <span>Pilihan Rekomendasi Anda</span>
                  </div>
                  <form action={toggleFavoriteCleanerAction}>
                    <input type="hidden" name="staff_id" value={fav.staff_id} />
                    <input type="hidden" name="is_favorite" value="true" />
                    <button type="submit" className="customer-button customer-button-quiet text-xs">
                      Hapus
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* NOTIFICATIONS CENTER (Section 18: In-App Notifications) */}
        <section className="profile-section-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2>Pemberitahuan & Notifikasi</h2>
              <p className="customer-muted">Log riwayat notifikasi akun dan konfirmasi pesanan.</p>
            </div>
            {notifications.some((n) => !n.is_read) && (
              <form action={markNotificationReadAction}>
                <input type="hidden" name="id" value="all" />
                <button type="submit" className="customer-inline-link text-xs">
                  Tandai semua dibaca
                </button>
              </form>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="customer-muted">Belum ada notifikasi baru.</p>
          ) : (
            <ul className="profile-notifications-list">
              {notifications.map((n) => (
                <li key={n.id} className={`notification-item ${n.is_read ? "is-read" : "is-unread"}`}>
                  <div className="notif-content">
                    <div className="notif-header">
                      <strong>{n.title}</strong>
                      <span className="notif-time">
                        {new Date(n.created_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p>{n.message}</p>
                    {n.link && (
                      <a href={n.link} className="customer-inline-link text-xs mt-1">
                        Buka rincian →
                      </a>
                    )}
                  </div>
                  {!n.is_read && (
                    <form action={markNotificationReadAction}>
                      <input type="hidden" name="id" value={n.id} />
                      <button type="submit" className="notif-read-check" title="Tandai sudah dibaca">
                        ✓
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
