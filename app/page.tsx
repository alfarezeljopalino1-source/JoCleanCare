import Link from "next/link";

import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { Benefits } from "./components/sections/benefits";
import { HowItWorks } from "./components/sections/how-it-works";
import { Services } from "./components/sections/services";

export const dynamic = "force-dynamic";

export default function Home() {
  return <>
    <Header />
    <main>
      <section className="home-hero">
        <div className="home-container home-hero-grid">
          <div className="home-hero-copy"><p className="customer-overline">JoCleanCare · layanan kebersihan</p><h1>Rumah bersih. Waktu kembali untukmu.</h1><p className="home-hero-lead">Pesan bantuan kebersihan rumah atau kantor sesuai kebutuhan. Pilih layanan dan jadwal, lalu pantau pesananmu dari akun JoCleanCare.</p><div className="home-hero-actions"><Link href="/layanan" className="customer-button customer-button-primary">Pilih layanan <span aria-hidden="true">→</span></Link><a href="#cara-kerja" className="customer-button customer-button-link">Cara kerja</a></div></div>
          <aside className="home-hero-note" aria-label="Informasi layanan"><p className="customer-overline">Dari pesan sampai selesai</p><ol><li><span>01</span>Pilih layanan kebersihan</li><li><span>02</span>Tentukan waktu kunjungan</li><li><span>03</span>Pantau status pesanan</li></ol><Link href="/register">Buat akun untuk mulai <span aria-hidden="true">→</span></Link></aside>
        </div>
      </section>
      <Services />
      <HowItWorks />
      <Benefits />
      <section className="home-about"><div className="home-container home-about-inner"><div><p className="customer-overline">Tentang JoCleanCare</p><h2>Perawatan ruang yang praktis, dari satu tempat.</h2></div><div><p>JoCleanCare membantu mengatur layanan kebersihan, jadwal, dan perkembangan pesanan. Detail layanan dan harga ditampilkan sebelum kamu membuat booking.</p><Link href="/layanan" className="customer-inline-link">Lihat layanan yang tersedia <span aria-hidden="true">→</span></Link></div></div></section>
    </main>
    <Footer />
  </>;
}
