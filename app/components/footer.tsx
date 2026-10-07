import Link from "next/link";

export function Footer() {
  return <footer className="site-footer"><div className="home-container site-footer-inner"><Link href="/" className="customer-brand"><span className="brand-mark brand-mark-small" aria-hidden="true"><span /><span /><span /></span><span>JoClean<span>Care</span></span></Link><p>Ruang bersih, hari lebih ringan.</p><small>© {new Date().getFullYear()} JoCleanCare</small></div></footer>;
}
