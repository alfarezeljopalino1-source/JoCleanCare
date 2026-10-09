const benefits = [
  {
    icon: "🛡️",
    title: "Petugas Terverifikasi & Terlatih",
    description:
      "Setiap staf melewati verifikasi identitas, pelatihan SOP sanitasi standar tinggi, serta perlengkapan pembersihan yang higienis.",
  },
  {
    icon: "⏱️",
    title: "Jadwal Tepat & Fleksibilitas Reschedule",
    description:
      "Slot waktu teratur pukul 08:00 hingga 17:00 WIB. Urusan mendadak? Anda dapat mengatur ulang jadwal dengan mudah tanpa biaya tersembunyi.",
  },
  {
    icon: "💬",
    title: "Ruang Chat Terpisah & Terstruktur",
    description:
      "Admin Support siap membantu pertanyaan umum & pembayaran. Chat Petugas khusus untuk koordinasi lapangan yang cepat dan privat.",
  },
  {
    icon: "⭐",
    title: "Transparansi Harga & Rating Nyata",
    description:
      "Biaya layanan terverifikasi server tanpa biaya tambahan misterius saat petugas tiba. Anda bebas menyimpan staf terbaik sebagai Petugas Favorit.",
  },
];

export function Benefits() {
  return (
    <section id="keunggulan" className="home-section py-20 bg-white">
      <div className="home-container max-w-6xl">
        <div className="home-section-heading mb-14 text-center max-w-2xl mx-auto">
          <p className="customer-overline text-teal-700 font-bold tracking-wider">
            Kenapa JoCleanCare
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
            Kenyamanan Maksimal, Ruang Bersih Tanpa Rasa Khawatir.
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Kami memadukan kemudahan teknologi pemesanan modern dengan dedikasi tenaga kebersihan berpengalaman.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="reveal-init p-6 rounded-2xl bg-gradient-to-b from-[#f8faf9] to-[#ffffff] border border-gray-200/80 hover:border-teal-300 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl mb-4">
                  {b.icon}
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">
                  {b.title}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {b.description}
                </p>
              </div>
              <div className="mt-6 pt-3 border-t border-gray-100 text-[11px] font-mono text-gray-400">
                0{i + 1} · JoCleanCare Standar
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
