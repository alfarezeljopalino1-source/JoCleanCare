"use client";

import { useState } from "react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Pilih Layanan & Add-on",
    tagline: "Sesuai kebutuhan hunian",
    description:
      "Tentukan jenis pembersihan mulai dari Regular, Deep Cleaning, hingga Office. Tambahkan kebutuhan spesifik seperti pembersihan kulkas atau setrika pakaian.",
    visualBadge: "Katalog Lengkap",
    visualTitle: "Regular / Deep Cleaning",
    visualHighlight: "Pilihan Durasi & Ruangan Fleksibel",
    visualIcon: "🧹",
    tip: "Kalkulasi harga transparan otomatis tampil sebelum konfirmasi.",
  },
  {
    number: "02",
    title: "Tentukan Waktu Kunjungan",
    tagline: "Jadwal 08:00 – 17:00 WIB",
    description:
      "Pilih tanggal dan slot jam kedatangan yang paling pas untuk Anda. Sistem memeriksa kesiapan staf secara real-time agar tidak bentrok.",
    visualBadge: "Real-Time Slot",
    visualTitle: "Pilih Jam & Tanggal",
    visualHighlight: "Tersedia Setiap Hari Termasuk Akhir Pekan",
    visualIcon: "📅",
    tip: "Jadwal dapat di-reschedule secara fleksibel jika ada urusan mendadak.",
  },
  {
    number: "03",
    title: "Petugas Terverifikasi Tiba",
    tagline: "Peralatan & SOP Higienis",
    description:
      "Petugas kebersihan profesional datang tepat waktu membawa perlengkapan higienis. Anda dapat berkoordinasi via Chat Petugas langsung di aplikasi.",
    visualBadge: "Petugas Terlatih",
    visualTitle: "Budi Santoso · Rating 4.9★",
    visualHighlight: "ID Terverifikasi & Prokes Lengkap",
    visualIcon: "👤",
    tip: "Ruang Chat Petugas terpisah memastikan koordinasi lapangan tetap privat.",
  },
  {
    number: "04",
    title: "Ruang Bersih, Waktu Milik Anda",
    tagline: "Hasil Rapi & Sanitasi Maksimal",
    description:
      "Nikmati rumah yang segar, higienis, dan nyaman tanpa lelah. Cukup periksa hasil pengerjaan lalu beri rating kepuasan Anda.",
    visualBadge: "Jaminan Kualitas",
    visualTitle: "Hasil Pembersihan Selesai",
    visualHighlight: "100% Bersih Bebas Debu & Kerak",
    visualIcon: "✨",
    tip: "Berikan ulasan dan simpan petugas terbaik sebagai Petugas Favorit Anda.",
  },
];

export function HowItWorks() {
  const [activeIdx, setActiveIdx] = useState(0);
  const current = steps[activeIdx];

  return (
    <section id="cara-kerja" className="home-section py-20 bg-[#fbfdfc] border-y border-gray-100">
      <div className="home-container max-w-6xl">
        <div className="home-section-heading mb-12">
          <div>
            <p className="customer-overline text-teal-700 font-bold tracking-wider">
              Alur Pemesanan
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Cara Kerja Praktis, Dari Pesan Hingga Selesai.
            </h2>
          </div>
          <p className="text-sm text-gray-600 max-w-md">
            Pesan dalam 2 menit tanpa proses berbelit. Semua tahapan kunjungan dan status petugas terpantau rapi dari dashboard akun Anda.
          </p>
        </div>

        {/* Journey Grid: Sticky/Floating Visual on Left (Desktop) + Steps Timeline on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Sticky Preview Visual */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="p-6 rounded-2xl bg-white border border-teal-100/80 shadow-md transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold border border-teal-200">
                  <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                  {current.visualBadge}
                </span>
                <span className="text-xs font-mono font-bold text-gray-400">
                  Langkah {current.number}/04
                </span>
              </div>

              {/* Visual Card Interior */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#f3f9f6] to-[#edf6f2] border border-teal-100 text-center my-3">
                <span className="text-5xl block mb-3 transform transition-transform duration-300 hover:scale-110">
                  {current.visualIcon}
                </span>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  {current.visualTitle}
                </h3>
                <p className="text-xs text-teal-800 font-medium">
                  {current.visualHighlight}
                </p>
              </div>

              {/* Step info snippet */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-start gap-2.5">
                  <span className="text-teal-700 font-bold text-xs mt-0.5">💡</span>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {current.tip}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 flex items-center justify-between">
                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIdx(i)}
                      aria-label={`Pilih langkah ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        activeIdx === i ? "w-6 bg-teal-700" : "w-2 bg-gray-200 hover:bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <Link
                  href="/booking"
                  className="text-xs font-bold text-teal-700 hover:underline inline-flex items-center gap-1"
                >
                  Mulai Pesan <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column: Steps Sequence */}
          <div className="lg:col-span-7 space-y-4">
            {steps.map((step, idx) => {
              const isSelected = activeIdx === idx;

              return (
                <div
                  key={step.number}
                  data-step-index={idx}
                  onClick={() => setActiveIdx(idx)}
                  className={`journey-step-item p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-white border-teal-600 shadow-md ring-1 ring-teal-500/20"
                      : "bg-white/60 hover:bg-white border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors ${
                        isSelected
                          ? "bg-teal-700 text-white shadow-xs"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {step.number}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-gray-900">
                          {step.title}
                        </h3>
                        <span className="text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                          {step.tagline}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
