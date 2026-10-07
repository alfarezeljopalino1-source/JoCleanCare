"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../../actions/auth";
import type { UserRole } from "../../../lib/auth/roles";

const links = [
  ["/admin", "Dashboard"],
  ["/admin/orders", "Booking"],
  ["/admin/schedules", "Kalender"],
  ["/admin/services", "Layanan"],
  ["/admin/addons", "Add-on"],
  ["/admin/staff", "Staff"],
  ["/admin/customers", "Customer"],
  ["/admin/chat", "Chat"],
  ["/admin/reviews", "Review"],
  ["/admin/notifications", "Notifikasi"],
  ["/admin/reports", "Laporan"],
  ["/admin/settings", "Pengaturan"],
] as const;

export function AdminShell({ children, name }: { children: React.ReactNode; name: string }) {
  const pathname = usePathname();
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand"><span className="brand-mark"><span /><span /><span /></span><span>JoClean<span className="text-teal-700">Care</span></span></Link>
      <p className="admin-sidebar-label">OPERASIONAL</p>
      <nav aria-label="Navigasi admin" className="admin-nav">
        {links.map(([href, label]) => {
          const isCurrent = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={isCurrent ? "page" : undefined} className={`admin-nav-link${isCurrent ? " is-current" : ""}`}>{label}</Link>;
        })}
      </nav>
      <Link href="/" className="admin-back-link">← Lihat website</Link>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar">
        <div><p className="admin-topbar-kicker">JoCleanCare · Admin</p><p className="admin-topbar-name">{name}</p></div>
        <form action={logoutAction}><button className="admin-logout" type="submit">Keluar</button></form>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}

export type AdminProfile = { name: string; role: UserRole };
