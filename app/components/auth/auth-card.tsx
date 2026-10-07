import Link from "next/link";

export function AuthCard({ mode, children }: { mode: "login" | "register"; children: React.ReactNode }) {
  const isLogin = mode === "login";
  return <main className="auth-page-refined"><section className="auth-card-refined" aria-labelledby="auth-title">
    <Link href="/" className="customer-brand" aria-label="JoCleanCare, beranda"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>JoClean<span>Care</span></span></Link>
    <p className="customer-overline auth-overline">Ruang bersih, hari lebih ringan</p>
    <h1 id="auth-title">{isLogin ? "Selamat datang kembali" : "Buat akun JoCleanCare"}</h1>
    <p className="auth-intro">{isLogin ? "Masuk untuk mengatur layanan dan melihat pesananmu." : "Daftar untuk memesan layanan kebersihan dengan mudah."}</p>
    {children}
    <p className="auth-switch-refined">{isLogin ? "Belum punya akun? " : "Sudah punya akun? "}<Link href={isLogin ? "/register" : "/login"}>{isLogin ? "Daftar" : "Login"}</Link></p>
    <p className="auth-terms-refined">Dengan melanjutkan, kamu menyetujui JoCleanCare mengelola akun dan pesananmu.</p>
  </section></main>;
}
