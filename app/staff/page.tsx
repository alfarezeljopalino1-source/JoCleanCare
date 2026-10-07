import Link from "next/link";

import { getSignedInProfile } from "../../lib/auth/session";

export const dynamic = "force-dynamic";

export default async function StaffDashboard() {
  const current = await getSignedInProfile();
  return <main className="role-page"><div className="role-page-inner">
    <header className="role-page-heading staff-dashboard-heading"><p className="role-kicker">Dashboard petugas</p><h1>Halo, {current?.profile.name ?? "Petugas"}</h1><p>Gunakan halaman ini untuk melihat pekerjaan dan jadwal yang diberikan kepadamu.</p></header>
    <section className="staff-today"><div><p className="role-empty-label">Hari ini</p><h2>Belum ada pekerjaan terjadwal.</h2><p>Pekerjaan yang ditugaskan admin akan muncul di sini bersama alamat dan waktu kunjungan.</p></div><Link href="/staff/schedules" className="role-action-link">Buka jadwal kerja <span aria-hidden="true">→</span></Link></section>
    <section className="staff-guidance" aria-labelledby="staff-guidance-title"><h2 id="staff-guidance-title">Saat menerima tugas</h2><ol><li><span>01</span><p>Periksa jadwal dan informasi layanan sebelum berangkat.</p></li><li><span>02</span><p>Gunakan detail pekerjaan untuk menuju alamat customer.</p></li><li><span>03</span><p>Perbarui status setelah pekerjaan tersedia di akunmu.</p></li></ol></section>
  </div></main>;
}
