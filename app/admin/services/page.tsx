import { requireRole } from "../../../lib/auth/session";
import { saveServiceAction, setServiceActiveAction } from "../actions";
import { EmptyState, Feedback, formatMoney, PageHeading } from "../_components/admin-ui";

export const dynamic = "force-dynamic";
type SearchParams = Promise<{ ok?: string; error?: string }>;

export default async function AdminServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ supabase }, params] = await Promise.all([requireRole(["admin"]), searchParams]);
  const { data, error } = await supabase.from("services").select("id, name, description, price, duration_minutes, is_active").order("name");
  const services = data ?? [];
  return <>
    <PageHeading eyebrow="Katalog" title="Layanan" description="Kelola katalog yang ditampilkan kepada customer. Nonaktifkan layanan lama agar tetap tersimpan pada riwayat booking." />
    <Feedback success={params.ok} error={params.error} />
    <section className="admin-card admin-form-card"><div><p className="admin-eyebrow">Tambah katalog</p><h2>Layanan baru</h2></div><form action={saveServiceAction} className="admin-service-form">
      <label>Nama layanan<input name="name" required minLength={2} maxLength={120} placeholder="Contoh: Deep Cleaning" /></label>
      <label>Harga (Rp)<input name="price" type="number" min="0" step="1000" required placeholder="250000" /></label>
      <label>Durasi (menit)<input name="duration_minutes" type="number" min="1" step="1" required placeholder="120" /></label>
      <label className="admin-span-all">Deskripsi<textarea name="description" rows={2} maxLength={2000} placeholder="Jelaskan cakupan layanan" /></label>
      <button type="submit" className="admin-button admin-button-primary">Tambah layanan</button>
    </form></section>
    <section className="admin-section"><div className="admin-section-heading"><div><p className="admin-eyebrow">Katalog saat ini</p><h2>{services.length} layanan</h2></div></div>
      {error ? <Feedback error="Daftar layanan belum dapat dimuat. Coba lagi nanti." /> : services.length === 0 ? <EmptyState title="Katalog masih kosong" description="Tambahkan layanan pertama menggunakan formulir di atas." /> : <div className="admin-service-list">{services.map((service) => <article className={`admin-card admin-service-item${service.is_active ? "" : " admin-service-inactive"}`} key={service.id}>
        <div className="admin-service-head"><div><span className={`admin-service-state${service.is_active ? " is-active" : ""}`}>{service.is_active ? "Aktif" : "Nonaktif"}</span><p>{formatMoney(service.price)} <span>· {service.duration_minutes} menit</span></p></div><form action={setServiceActiveAction}><input type="hidden" name="id" value={service.id} /><input type="hidden" name="is_active" value={String(!service.is_active)} /><button type="submit" className="admin-button admin-button-quiet">{service.is_active ? "Nonaktifkan" : "Aktifkan"}</button></form></div>
        <form action={saveServiceAction} className="admin-service-form admin-service-edit"><input type="hidden" name="id" value={service.id} /><label>Nama<input name="name" defaultValue={service.name} required minLength={2} maxLength={120} /></label><label>Harga (Rp)<input name="price" type="number" min="0" step="1000" defaultValue={service.price} required /></label><label>Durasi (menit)<input name="duration_minutes" type="number" min="1" step="1" defaultValue={service.duration_minutes} required /></label><label className="admin-span-all">Deskripsi<textarea name="description" rows={2} maxLength={2000} defaultValue={service.description ?? ""} /></label><label className="admin-checkbox"><input type="checkbox" name="is_active" defaultChecked={service.is_active} />Tersedia untuk dipesan</label><button type="submit" className="admin-button admin-button-secondary">Simpan perubahan</button></form>
      </article>)}</div>}
    </section>
  </>;
}
