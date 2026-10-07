import { requireRole } from "../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile } = await requireRole(["customer"]);
  const details = [["Nama lengkap", profile.name], ["Email", profile.email], ["Nomor telepon", profile.phone || "Belum ditambahkan"]] as const;
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase() || "JC";
  return <main className="customer-page"><div className="customer-container customer-narrow">
    <header className="customer-page-heading"><p className="customer-overline">Akun</p><h1>Profil saya</h1><p>Informasi yang digunakan untuk mengelola pesanan JoCleanCare.</p></header>
    <section className="profile-identity" aria-label="Identitas akun"><span className="profile-avatar" aria-hidden="true">{initials}</span><div><h2>{profile.name || "Pelanggan JoCleanCare"}</h2><p>{profile.email}</p></div><span className="profile-role">Customer</span></section>
    <section className="profile-settings"><h2>Informasi akun</h2><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Belum tersedia"}</dd></div>)}</dl><p>Untuk mengubah informasi akun, hubungi tim JoCleanCare.</p></section>
  </div></main>;
}
