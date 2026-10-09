import { requireRole } from "../../../lib/auth/session";
import {
  saveAddOnAction,
  saveServiceAction,
  setAddOnActiveAction,
  setServiceActiveAction,
} from "../actions";
import { EmptyState, Feedback, formatMoney, PageHeading } from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ ok?: string; error?: string; tab?: string }>;

export default async function AdminServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase }, params] = await Promise.all([requireRole(["admin"]), searchParams]);
  const activeTab = params.tab === "addons" ? "addons" : "services";

  const [servicesRes, addOnsRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, description, price, duration_minutes, is_active, badge, service_tier, whats_included, whats_excluded")
      .order("name"),
    supabase
      .from("add_ons")
      .select("id, name, description, price, duration_minutes, is_active, icon_key")
      .order("name"),
  ]);

  const services = servicesRes.data ?? [];
  const addOns = addOnsRes.data ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Katalog JoCleanCare"
        title="Layanan & Add-ons"
        description="Kelola paket layanan utama dan opsi layanan tambahan (add-ons) yang dapat dipilih pelanggan saat pemesanan."
      />
      <Feedback success={params.ok} error={params.error} />

      {/* Tabs */}
      <nav className="orders-filter admin-catalog-tabs" aria-label="Tab Katalog">
        <a href="/admin/services" aria-current={activeTab === "services" ? "page" : undefined}>
          Paket Layanan Utama ({services.length})
        </a>
        <a href="/admin/services?tab=addons" aria-current={activeTab === "addons" ? "page" : undefined}>
          Layanan Tambahan / Add-ons ({addOns.length})
        </a>
      </nav>

      {/* SERVICES TAB */}
      {activeTab === "services" && (
        <>
          <section className="admin-card admin-form-card">
            <div>
              <p className="admin-eyebrow">Tambah Paket</p>
              <h2>Layanan Baru</h2>
            </div>
            <form action={saveServiceAction} noValidate className="admin-service-form">
              <label>
                Nama Layanan
                <input name="name" required minLength={2} maxLength={120} placeholder="Contoh: Deep Cleaning" />
              </label>
              <label>
                Harga Mulai (Rp)
                <input name="price" type="number" min="0" step="1000" required placeholder="250000" />
              </label>
              <label>
                Estimasi Durasi (menit)
                <input name="duration_minutes" type="number" min="1" step="1" required placeholder="120" />
              </label>
              <label>
                Badge / Tag (Opsional)
                <input name="badge" maxLength={40} placeholder="Contoh: Paling Populer, Spesialis" />
              </label>
              <label>
                Kategori Tier
                <select name="service_tier" defaultValue="standard">
                  <option value="standard">Standard</option>
                  <option value="deep">Deep Clean</option>
                  <option value="move">Pindahan (Move in/out)</option>
                  <option value="commercial">Komersial / Kantor</option>
                </select>
              </label>
              <label className="admin-span-all">
                Deskripsi Singkat
                <textarea name="description" rows={2} maxLength={2000} placeholder="Jelaskan keunggulan dan cakupan layanan" />
              </label>
              <label className="admin-span-all">
                Cakupan yang Termasuk (1 per baris)
                <textarea name="whats_included" rows={3} placeholder="Sapu dan pel seluruh lantai&#10;Lap debu perabot utama&#10;Sanitasi kamar mandi" />
              </label>
              <label className="admin-span-all">
                Yang Tidak Termasuk (1 per baris)
                <textarea name="whats_excluded" rows={2} placeholder="Pembersihan dalam kulkas&#10;Cuci sofa basah" />
              </label>
              <button type="submit" className="admin-button admin-button-primary">
                + Simpan Layanan Baru
              </button>
            </form>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p className="admin-eyebrow">Katalog Layanan</p>
                <h2>{services.length} Paket Layanan Terdaftar</h2>
              </div>
            </div>

            {servicesRes.error ? (
              <Feedback error="Daftar layanan belum dapat dimuat. Coba lagi nanti." />
            ) : services.length === 0 ? (
              <EmptyState title="Katalog masih kosong" description="Tambahkan layanan pertama menggunakan formulir di atas." />
            ) : (
              <div className="admin-service-list">
                {services.map((service) => (
                  <article
                    className={`admin-card admin-service-item${service.is_active ? "" : " admin-service-inactive"}`}
                    key={service.id}
                  >
                    <div className="admin-service-head">
                      <div>
                        <span className={`admin-service-state${service.is_active ? " is-active" : ""}`}>
                          {service.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                        {service.badge && <span className="service-badge ml-2">{service.badge}</span>}
                        <p>
                          {formatMoney(service.price)} <span>· {service.duration_minutes} menit</span>
                        </p>
                      </div>
                      <form action={setServiceActiveAction}>
                        <input type="hidden" name="id" value={service.id} />
                        <input type="hidden" name="is_active" value={String(!service.is_active)} />
                        <button type="submit" className="admin-button admin-button-quiet">
                          {service.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                    </div>

                    <form action={saveServiceAction} noValidate className="admin-service-form admin-service-edit">
                      <input type="hidden" name="id" value={service.id} />
                      <label>
                        Nama
                        <input name="name" defaultValue={service.name} required minLength={2} maxLength={120} />
                      </label>
                      <label>
                        Harga (Rp)
                        <input name="price" type="number" min="0" step="1000" defaultValue={service.price} required />
                      </label>
                      <label>
                        Durasi (menit)
                        <input name="duration_minutes" type="number" min="1" step="1" defaultValue={service.duration_minutes} required />
                      </label>
                      <label>
                        Badge
                        <input name="badge" defaultValue={service.badge ?? ""} maxLength={40} />
                      </label>
                      <label>
                        Kategori Tier
                        <select name="service_tier" defaultValue={service.service_tier ?? "standard"}>
                          <option value="standard">Standard</option>
                          <option value="deep">Deep Clean</option>
                          <option value="move">Pindahan (Move in/out)</option>
                          <option value="commercial">Komersial / Kantor</option>
                        </select>
                      </label>
                      <label className="admin-span-all">
                        Deskripsi
                        <textarea name="description" rows={2} maxLength={2000} defaultValue={service.description ?? ""} />
                      </label>
                      <label className="admin-span-all">
                        Cakupan Termasuk (1 per baris)
                        <textarea
                          name="whats_included"
                          rows={3}
                          defaultValue={(service.whats_included ?? []).join("\n")}
                        />
                      </label>
                      <label className="admin-span-all">
                        Tidak Termasuk (1 per baris)
                        <textarea
                          name="whats_excluded"
                          rows={2}
                          defaultValue={(service.whats_excluded ?? []).join("\n")}
                        />
                      </label>
                      <label className="admin-checkbox">
                        <input type="checkbox" name="is_active" defaultChecked={service.is_active} />
                        Tersedia untuk dipesan pelanggan
                      </label>
                      <button type="submit" className="admin-button admin-button-secondary">
                        Simpan Perubahan
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ADD-ONS TAB (Section 5: Add-on Management) */}
      {activeTab === "addons" && (
        <>
          <section className="admin-card admin-form-card">
            <div>
              <p className="admin-eyebrow">Tambah Add-on</p>
              <h2>Layanan Tambahan Baru</h2>
            </div>
            <form action={saveAddOnAction} noValidate className="admin-service-form">
              <label>
                Nama Add-on
                <input name="name" required minLength={2} maxLength={120} placeholder="Contoh: Pembersihan Kulkas" />
              </label>
              <label>
                Harga Tambahan (Rp)
                <input name="price" type="number" min="0" step="1000" required placeholder="45000" />
              </label>
              <label>
                Estimasi Durasi (menit)
                <input name="duration_minutes" type="number" min="0" step="5" defaultValue={30} required />
              </label>
              <label className="admin-span-all">
                Deskripsi Add-on
                <textarea name="description" rows={2} maxLength={500} placeholder="Jelaskan apa yang dibersihkan pada add-on ini" />
              </label>
              <button type="submit" className="admin-button admin-button-primary">
                + Simpan Add-on Baru
              </button>
            </form>
          </section>

          <section className="admin-section">
            <div className="admin-section-heading">
              <div>
                <p className="admin-eyebrow">Daftar Add-on</p>
                <h2>{addOns.length} Opsi Layanan Tambahan</h2>
              </div>
            </div>

            {addOnsRes.error ? (
              <Feedback error="Daftar add-on belum dapat dimuat. Coba lagi nanti." />
            ) : addOns.length === 0 ? (
              <EmptyState title="Belum ada add-on" description="Tambahkan opsi add-on pertama menggunakan formulir di atas." />
            ) : (
              <div className="admin-service-list">
                {addOns.map((addon) => (
                  <article
                    className={`admin-card admin-service-item${addon.is_active ? "" : " admin-service-inactive"}`}
                    key={addon.id}
                  >
                    <div className="admin-service-head">
                      <div>
                        <span className={`admin-service-state${addon.is_active ? " is-active" : ""}`}>
                          {addon.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                        <p>
                          {formatMoney(addon.price)} <span>· +{addon.duration_minutes} menit</span>
                        </p>
                      </div>
                      <form action={setAddOnActiveAction}>
                        <input type="hidden" name="id" value={addon.id} />
                        <input type="hidden" name="is_active" value={String(!addon.is_active)} />
                        <button type="submit" className="admin-button admin-button-quiet">
                          {addon.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </form>
                    </div>

                    <form action={saveAddOnAction} noValidate className="admin-service-form admin-service-edit">
                      <input type="hidden" name="id" value={addon.id} />
                      <label>
                        Nama Add-on
                        <input name="name" defaultValue={addon.name} required minLength={2} maxLength={120} />
                      </label>
                      <label>
                        Harga (Rp)
                        <input name="price" type="number" min="0" step="1000" defaultValue={addon.price} required />
                      </label>
                      <label>
                        Durasi (menit)
                        <input name="duration_minutes" type="number" min="0" step="5" defaultValue={addon.duration_minutes} required />
                      </label>
                      <label className="admin-span-all">
                        Deskripsi
                        <textarea name="description" rows={2} maxLength={500} defaultValue={addon.description ?? ""} />
                      </label>
                      <label className="admin-checkbox">
                        <input type="checkbox" name="is_active" defaultChecked={addon.is_active} />
                        Tersedia untuk dipesan pelanggan
                      </label>
                      <button type="submit" className="admin-button admin-button-secondary">
                        Simpan Perubahan
                      </button>
                    </form>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
