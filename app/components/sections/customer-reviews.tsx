const reviews = [
  {
    name: "Siti Rahmawati",
    role: "Ibu Rumah Tangga, Jakarta Selatan",
    service: "Deep Cleaning & Kamar Mandi",
    stars: 5,
    comment:
      "Kerak kamar mandi yang membandel bertahun-tahun bisa kinclong kembali. Petugasnya ramah, sopan, dan membawa peralatan pembersih lengkap. Sangat puas dengan JoCleanCare!",
  },
  {
    name: "Dimas Pratama",
    role: "Software Engineer, Apartemen Sudirman",
    service: "Regular Cleaning (Paket Mingguan)",
    stars: 5,
    comment:
      "Jadwal fleksibel dan komunikasi chat di aplikasi sangat memudahkan. Begitu pulang kerja, apartemen sudah wangi dan tertata rapi. Sangat merekomendasikan paket mingguannya.",
  },
  {
    name: "Nadia Kusuma",
    role: "Operational Lead, Startup Coworking",
    service: "Office Cleaning",
    stars: 5,
    comment:
      "Sistem pemesanan praktis dan invoice transparan tanpa biaya siluman. Petugas tepat waktu dan area pantry serta meja meeting selalu higienis disinfeksi.",
  },
];

export function CustomerReviewsSection() {
  return (
    <section className="home-section py-20 bg-white">
      <div className="home-container max-w-6xl">
        <div className="home-section-heading mb-14 text-center max-w-2xl mx-auto">
          <p className="customer-overline text-teal-700 font-bold tracking-wider">
            Ulasan Pelanggan
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
            Kepuasan Nyata dari 1.200+ Rumah & Kantor.
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Pengalaman nyata pelanggan yang mempercayakan kebersihan hunian mereka kepada JoCleanCare.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((r) => (
            <div
              key={r.name}
              className="reveal-init p-6 rounded-2xl bg-[#fafcfa] border border-gray-200/80 flex flex-col justify-between hover:shadow-sm transition-all duration-300"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-500 text-sm mb-3">
                  {"★".repeat(r.stars)}
                  <span className="text-xs font-bold text-gray-600 ml-1.5">5.0</span>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed italic mb-6">
                  &ldquo;{r.comment}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200/60 flex items-center justify-between">
                <div>
                  <strong className="text-xs font-bold text-gray-900 block">
                    {r.name}
                  </strong>
                  <span className="text-[11px] text-gray-400 block mt-0.5">
                    {r.role}
                  </span>
                </div>
                <span className="text-[10px] font-semibold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-full border border-teal-100">
                  {r.service}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
