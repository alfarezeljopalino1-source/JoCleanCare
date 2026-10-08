import Link from "next/link";
import { logoutAction } from "../actions/auth";
import { dashboardForRole } from "../../lib/auth/roles";
import { getSignedInProfile } from "../../lib/auth/session";

export async function Header() {
  const current = await getSignedInProfile();
  return (
    <header className="site-header">
      <nav aria-label="Navigasi utama" className="site-nav">
        <Link href="/" className="customer-brand" aria-label="JoCleanCare, beranda">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span>
            JoClean<span>Care</span>
          </span>
        </Link>
        <div className="site-section-links">
          <Link href="/layanan">Layanan</Link>
          <Link href="/paket">Paket Rutin</Link>
          <Link href="/#cara-kerja">Cara Kerja</Link>
          <Link href="/#keunggulan">Keunggulan</Link>
        </div>
        <div className="site-nav-actions">
          {current ? (
            <>
              {current.profile.role === "customer" && (
                <>
                  <Link href="/layanan" className="site-customer-link">
                    Layanan
                  </Link>
                  <Link href="/paket" className="site-customer-link">
                    Paket
                  </Link>
                  <Link href="/orders" className="site-customer-link">
                    Pesanan
                  </Link>
                  <Link href="/chat" className="site-customer-link">
                    Chat
                  </Link>
                </>
              )}
              <Link href={dashboardForRole(current.profile.role)} className="site-account-link">
                Dashboard
              </Link>
              <Link
                href={
                  current.profile.role === "customer"
                    ? "/profile"
                    : current.profile.role === "staff"
                    ? "/staff/profile"
                    : "/admin"
                }
                className="site-account-link"
              >
                {current.profile.role === "admin" ? "Admin" : "Profil"}
              </Link>
              <form action={logoutAction}>
                <button className="site-nav-logout" type="submit">
                  Keluar
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="site-account-link">
                Masuk
              </Link>
              <Link href="/register" className="site-account-link">
                Daftar
              </Link>
              <Link href="/booking" className="customer-button customer-button-primary site-book-cta">
                Pesan Sekarang <span aria-hidden="true">→</span>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
