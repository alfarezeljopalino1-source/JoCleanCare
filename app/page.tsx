import Link from "next/link";

import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { Benefits } from "./components/sections/benefits";
import { HowItWorks } from "./components/sections/how-it-works";
import { Services } from "./components/sections/services";
import { RecurringPackagesSection } from "./components/sections/recurring-packages";
import { CustomerReviewsSection } from "./components/sections/customer-reviews";
import { LandingInteractions } from "./components/landing/landing-interactions";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <LandingInteractions />
      <Header />
      <main className="overflow-x-hidden">
        {/* SECTION 1: HERO WITH FLOATING ELEMENTS & SUBTLE DEPTH */}
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 bg-gradient-to-b from-[#f5f9f7] via-[#fafdfb] to-white border-b border-gray-100">
          <div className="home-container max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Hero Storytelling Copy */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                  JoCleanCare · Layanan Kebersihan Profesional
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-extrabold text-[#102a2b] tracking-tight leading-[1.15]">
                  Rumah bersih. <br />
                  <span className="text-teal-700">Waktu kembali untukmu.</span>
                </h1>

                <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-xl">
                  Pesan bantuan kebersihan rumah, apartemen, atau kantor sesuai kebutuhan. Petugas terverifikasi, jadwal fleksibel, dan pantau pesanan Anda secara real-time dari satu tempat.
                </p>

                {/* Primary & Secondary CTAs */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link
                    href="/layanan"
                    className="customer-button customer-button-primary px-7 py-3.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    Pilih Layanan <span aria-hidden="true">→</span>
                  </Link>
                  <a
                    href="#cara-kerja"
                    className="customer-button customer-button-secondary px-6 py-3.5 text-sm font-semibold border-gray-300 hover:border-gray-400 bg-white"
                  >
                    Cara Kerja
                  </a>
                </div>

                {/* Micro trust indicators */}
                <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1.5 text-teal-800">
                    <span className="font-bold text-teal-600">✓</span> Tanpa Biaya Tersembunyi
                  </span>
                  <span className="flex items-center gap-1.5 text-teal-800">
                    <span className="font-bold text-teal-600">✓</span> SOP & Prokes Higienis
                  </span>
                  <span className="flex items-center gap-1.5 text-teal-800">
                    <span className="font-bold text-teal-600">✓</span> Reschedule Tanpa Ribet
                  </span>
                </div>
              </div>

              {/* Right Column: Layered Floating Visual Composition */}
              <div className="lg:col-span-5 relative min-h-[22rem] sm:min-h-[26rem] flex items-center justify-center">
                {/* Subtle decorative background blur ring */}
                <div className="absolute w-72 h-72 rounded-full bg-teal-100/60 filter blur-3xl -z-10 pointer-events-none" />

                {/* Center Main Floating Card: Regular Cleaning */}
                <div className="hero-float-card w-full max-w-[21rem] p-5 rounded-2xl bg-white border border-teal-100 shadow-xl transition-transform duration-300">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
                      Paling Populer
                    </span>
                    <span className="text-xs text-teal-700 font-mono font-semibold">
                      120 menit
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-gray-900 mb-1">
                    Regular Cleaning
                  </h2>
                  <div className="text-2xl font-black text-teal-700 mb-2">
                    Rp120.000
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    Sapu, pel disinfektan, lap debu perabot, rapikan tempat tidur, dan pengosongan tempat sampah.
                  </p>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Petugas Terlatih</span>
                    <span className="text-teal-700 font-bold">Siap Datang Hari Ini →</span>
                  </div>
                </div>

                {/* Floating Badge 1: Top Right */}
                <div className="hero-float-badge-1 absolute -top-2 -right-2 sm:right-2 p-3 rounded-xl bg-white/95 backdrop-blur-xs border border-gray-200/80 shadow-md flex items-center gap-2.5 transition-transform duration-300">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    ✓
                  </span>
                  <div>
                    <strong className="text-xs text-gray-800 block">Petugas Terverifikasi</strong>
                    <span className="text-[10px] text-gray-400 block">SOP & Identitas Terjamin</span>
                  </div>
                </div>

                {/* Floating Badge 2: Bottom Right */}
                <div className="hero-float-badge-2 absolute -bottom-4 right-0 sm:right-4 p-3 rounded-xl bg-white/95 backdrop-blur-xs border border-gray-200/80 shadow-md flex items-center gap-2.5 transition-transform duration-300">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    ★
                  </span>
                  <div>
                    <strong className="text-xs text-gray-800 block">Rating 4.9 / 5.0</strong>
                    <span className="text-[10px] text-gray-400 block">1.200+ Rumah Puas</span>
                  </div>
                </div>

                {/* Floating Badge 3: Bottom Left */}
                <div className="hero-float-badge-3 absolute bottom-6 -left-3 sm:left-0 p-2.5 rounded-xl bg-white/95 backdrop-blur-xs border border-gray-200/80 shadow-md flex items-center gap-2 transition-transform duration-300">
                  <span className="text-sm">📅</span>
                  <span className="text-xs font-semibold text-gray-700">Jadwal Fleksibel 08:00–17:00</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: TRUST / VALUE STATS BAR */}
        <section className="py-10 bg-white border-b border-gray-100">
          <div className="home-container max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-4 rounded-xl bg-[#fafcfa] border border-gray-100">
                <span className="block text-2xl sm:text-3xl font-black text-teal-700 mb-1">
                  99.4%
                </span>
                <span className="text-xs text-gray-600 font-medium">
                  Tingkat Kepuasan Pelanggan
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#fafcfa] border border-gray-100">
                <span className="block text-2xl sm:text-3xl font-black text-teal-700 mb-1">
                  1.200+
                </span>
                <span className="text-xs text-gray-600 font-medium">
                  Hunian & Kantor Dibersihkan
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#fafcfa] border border-gray-100">
                <span className="block text-2xl sm:text-3xl font-black text-teal-700 mb-1">
                  100%
                </span>
                <span className="text-xs text-gray-600 font-medium">
                  Petugas Terverifikasi & Terlatih
                </span>
              </div>
              <div className="p-4 rounded-xl bg-[#fafcfa] border border-gray-100">
                <span className="block text-2xl sm:text-3xl font-black text-teal-700 mb-1">
                  Setiap Hari
                </span>
                <span className="text-xs text-gray-600 font-medium">
                  08:00 – 17:00 WIB Siap Layani
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: SERVICES (4 CORE SERVICES) */}
        <Services />

        {/* SECTION 4: HOW IT WORKS (INTERACTIVE JOURNEY) */}
        <HowItWorks />

        {/* SECTION 5: BENEFITS */}
        <Benefits />

        {/* SECTION 6: RECURRING PACKAGES */}
        <RecurringPackagesSection />

        {/* SECTION 7: CUSTOMER REVIEWS */}
        <CustomerReviewsSection />

        {/* SECTION 8: FINAL CTA BANNER */}
        <section className="py-20 bg-gradient-to-br from-[#12665e] via-[#0d5952] to-[#08453f] text-white">
          <div className="home-container max-w-4xl text-center space-y-6">
            <span className="inline-block px-3.5 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold tracking-wider uppercase border border-white/15">
              Mulai Hari Ini
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
              Siap Nikmati Kenyamanan Rumah Bersih?
            </h2>
            <p className="text-base sm:text-lg text-teal-100 max-w-2xl mx-auto leading-relaxed">
              Tentukan layanan dan jadwal yang Anda inginkan hanya dalam 2 menit. Serahkan pekerjaan kebersihan kepada tim profesional JoCleanCare.
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link
                href="/booking"
                className="px-8 py-4 rounded-xl bg-white text-teal-900 font-extrabold text-sm shadow-lg hover:bg-teal-50 transition-all hover:scale-105"
              >
                Pesan Sekarang <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/layanan"
                className="px-8 py-4 rounded-xl bg-transparent border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 transition-all"
              >
                Eksplor Layanan
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
