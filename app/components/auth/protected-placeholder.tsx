import Link from "next/link";

import { getSignedInProfile } from "../../../lib/auth/session";

export async function ProtectedPlaceholder({ title, description }: { title: string; description: string }) {
  const current = await getSignedInProfile();
  const isStaff = current?.profile.role === "staff";

  return <main className="role-page"><div className="role-page-inner">
    <header className="role-page-heading"><p className="role-kicker">JoCleanCare · {isStaff ? "Petugas" : current?.profile.role === "admin" ? "Admin" : "Pelanggan"}</p><h1>{title}</h1><p>{description}</p></header>
    <section className="role-empty-state"><div><p className="role-empty-label">Belum ada informasi</p><h2>{isStaff ? "Pekerjaan akan tampil saat kamu ditugaskan." : "Informasi akan tersedia di sini."}</h2><p>{isStaff ? "Jadwal dan detail pekerjaan ditampilkan setelah admin melakukan penugasan." : "Akunmu sudah terverifikasi dan siap digunakan."}</p></div>
      {isStaff && <Link href="/staff/schedules" className="role-action-link">Lihat jadwal kerja <span aria-hidden="true">→</span></Link>}
    </section>
  </div></main>;
}
