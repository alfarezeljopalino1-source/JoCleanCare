import { requireRole } from "../../../lib/auth/session";
import { saveAddOnAction, setAddOnActiveAction } from "../actions";
import { EmptyState, Feedback, formatMoney, PageHeading } from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function AdminAddOnsPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase }, params] = await Promise.all([requireRole(["admin"]), searchParams]);

  const { data: addOnsData, error } = await supabase
    .from("add_ons")
    .select("id, name, description, price, duration_minutes, is_active, icon_key")
    .order("name");

  const addOns = addOnsData ?? [];

  return (
    <>
      <PageHeading
        eyebrow="Katalog Tambahan JoCleanCare"
        title="Manajemen Layanan Add-on"
        description="Kelola opsi layanan kebersihan tambahan yang dapat dipilih pelanggan saat checkout booking (seperti pembersihan kulkas, kerak kompor, setrika, atau tungau)."
      />
      <Feedback success={params.ok} error={params.error} />

      {/* New Add-on Form */}
      <section className="admin-card admin-form-card mb-6">
        <div>
          <p className="admin-eyebrow">Item Baru</p>
          <h2>Tambah Add-on Baru</h2>
          <p className="text-xs text-gray-500 mt-1">
            Layanan tambahan akan otomatis muncul sebagai opsi opsional pada form booking pelanggan.
          </p>
        </div>
        <form action={saveAddOnAction} className="admin-service-form">
          <label>
            Nama Add-on
            <input name="name" required minLength={2} maxLength={80} placeholder="Contoh: Pembersihan Kulkas" />
          </label>
          <label>
            Biaya Tambahan (Rp)
            <input name="price" type="number" min="0" step="5000" required placeholder="45000" />
          </label>
          <label>
            Estimasi Tambahan Durasi (menit)
            <input name="duration_minutes" type="number" min="10" step="5" defaultValue={30} required />
          </label>
          <label>
            Jenis Ikon Visual
            <select name="icon_key" defaultValue="sparkle">
              <option value="fridge">Kulkas / Lemari Pendingin</option>
              <option value="stove">Kompor & Cooker Hood</option>
              <option value="kitchen">Kitchen Set & Dapur</option>
              <option value="iron">Setrika Pakaian</option>
              <option value="dishes">Cuci Piring Sanitasi</option>
              <option value="glass">Kaca & Cermin</option>
              <option value="sofa">Vakum Sofa & Tungau</option>
              <option value="bathroom">Kamar Mandi Ekstra</option>
              <option value="sparkle">Lainnya / Umum</option>
            </select>
          </label>
          <label className="admin-span-all">
            Deskripsi Pekerjaan
            <textarea
              name="description"
              rows={2}
              maxLength={500}
              placeholder="Jelaskan apa yang dibersihkan pada add-on ini..."
            />
          </label>
          <button type="submit" className="admin-button admin-button-primary">
            + Tambahkan Add-on
          </button>
        </form>
      </section>

      {/* Existing Add-ons List */}
      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p className="admin-eyebrow">Daftar Aktif</p>
            <h2>{addOns.length} Pilihan Add-on Terdaftar</h2>
          </div>
        </div>

        {error ? (
          <Feedback error="Daftar add-on belum dapat dimuat. Coba lagi nanti." />
        ) : addOns.length === 0 ? (
          <EmptyState
            title="Belum ada add-on"
            description="Tambahkan add-on pertama menggunakan formulir di atas."
          />
        ) : (
          <div className="admin-service-list">
            {addOns.map((addon) => (
              <article
                className={`admin-card admin-service-item${addon.is_active ? "" : " admin-service-inactive"}`}
                key={addon.id}
              >
                <header className="admin-service-header">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✨</span>
                    <div>
                      <h3>{addon.name}</h3>
                      <p className="admin-service-meta">
                        {formatMoney(addon.price)} · +{addon.duration_minutes} menit · Ikon: {addon.icon_key || "standar"}
                      </p>
                    </div>
                  </div>
                  <form action={setAddOnActiveAction}>
                    <input type="hidden" name="id" value={addon.id} />
                    <input type="hidden" name="is_active" value={addon.is_active ? "false" : "true"} />
                    <button
                      type="submit"
                      className={`admin-button admin-button-compact${addon.is_active ? " admin-button-quiet" : " admin-button-primary"}`}
                    >
                      {addon.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </form>
                </header>

                {addon.description && <p className="admin-service-desc">{addon.description}</p>}

                {/* Inline Edit Form in Details */}
                <details className="admin-service-edit-details mt-4">
                  <summary className="text-xs text-teal-700 font-semibold cursor-pointer">
                    Edit Detail Add-on
                  </summary>
                  <form action={saveAddOnAction} className="admin-service-form admin-service-edit-form mt-3">
                    <input type="hidden" name="id" value={addon.id} />
                    <label>
                      Nama Add-on
                      <input name="name" defaultValue={addon.name} required />
                    </label>
                    <label>
                      Harga (Rp)
                      <input name="price" type="number" defaultValue={addon.price} min="0" step="5000" required />
                    </label>
                    <label>
                      Durasi (menit)
                      <input name="duration_minutes" type="number" defaultValue={addon.duration_minutes} min="10" required />
                    </label>
                    <label>
                      Ikon
                      <select name="icon_key" defaultValue={addon.icon_key || "sparkle"}>
                        <option value="fridge">Kulkas</option>
                        <option value="stove">Kompor</option>
                        <option value="kitchen">Kitchen Set</option>
                        <option value="iron">Setrika</option>
                        <option value="dishes">Cuci Piring</option>
                        <option value="glass">Kaca & Cermin</option>
                        <option value="sofa">Vakum Sofa</option>
                        <option value="bathroom">Kamar Mandi</option>
                        <option value="sparkle">Umum</option>
                      </select>
                    </label>
                    <label className="admin-span-all">
                      Deskripsi
                      <textarea name="description" defaultValue={addon.description ?? ""} rows={2} />
                    </label>
                    <label className="admin-toggle-label flex items-center gap-2">
                      <input name="is_active" type="checkbox" defaultChecked={addon.is_active} />
                      <span>Aktif untuk Dipilih Customer</span>
                    </label>
                    <button type="submit" className="admin-button admin-button-primary admin-span-all">
                      Simpan Perubahan
                    </button>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
