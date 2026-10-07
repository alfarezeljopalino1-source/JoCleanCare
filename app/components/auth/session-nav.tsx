"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { logoutAction } from "../../actions/auth";
import { dashboardForRole, type UserRole } from "../../../lib/auth/roles";

export function SessionNav({ profile }: { profile: { name: string; role: UserRole } }) {
  const pathname = usePathname();
  const profileUrl = profile.role === "customer" ? "/profile" : profile.role === "staff" ? "/staff/profile" : null;
  const links = [
    {
      href: dashboardForRole(profile.role),
      label: profile.role === "staff" ? "Beranda" : "Dashboard",
    },
    ...(profile.role === "customer"
      ? [
          { href: "/layanan", label: "Layanan" },
          { href: "/paket", label: "Paket Rutin" },
          { href: "/orders", label: "Pesanan" },
        ]
      : []),
    ...(profile.role === "staff"
      ? [
          { href: "/staff/schedules", label: "Jadwal" },
          { href: "/staff/tasks", label: "Tugas" },
          { href: "/staff/messages", label: "Pesan" },
        ]
      : []),
    ...(profileUrl ? [{ href: profileUrl, label: "Profil" }] : []),
  ];
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "JC";
  const isCurrent = (href: string) => pathname === href || (href === "/orders" && pathname.startsWith("/orders/"));
  return <header className="customer-nav-shell"><div className="customer-nav-inner">
    <Link href="/" className="customer-brand" aria-label="JoCleanCare, beranda"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>JoClean<span>Care</span></span></Link>
    <nav aria-label="Navigasi akun" className={`customer-account-nav${profile.role === "customer" ? " customer-account-nav-customer" : ""}`}>{links.map(({ href, label }) => <Link key={href} href={href} aria-current={isCurrent(href) ? "page" : undefined} className={isCurrent(href) ? "is-current" : undefined}>{label}</Link>)}</nav>
    <details className="customer-profile-menu">
      <summary aria-label={`Menu akun ${profile.name}`}>
        <span className="customer-avatar" aria-hidden="true">{initials}</span>
        <span className="customer-profile-copy"><strong>{profile.name}</strong><small>{profile.role === "customer" ? "Customer" : profile.role === "staff" ? "Petugas" : "Admin"}</small></span>
        <span className="customer-profile-chevron" aria-hidden="true" />
      </summary>
      <div className="customer-profile-dropdown">
        {profileUrl && <Link href={profileUrl}>Profil saya</Link>}
        <form action={logoutAction}><button type="submit">Keluar</button></form>
      </div>
    </details>
    {profile.role === "customer" && <nav aria-label="Navigasi cepat" className="customer-mobile-nav">{links.filter(({ href }) => href !== "/profile").map(({ href, label }) => <Link key={href} href={href} aria-current={isCurrent(href) ? "page" : undefined} className={isCurrent(href) ? "is-current" : undefined}>{label}</Link>)}</nav>}
  </div></header>;
}
