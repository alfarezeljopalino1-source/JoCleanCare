import Link from "next/link";

const packages = [
  {
    name: "Paket Mingguan",
    frequency: "Setiap 7 Hari",
    discountTag: "Hemat 15%",
    idealFor: "Keluarga aktif & hunian dengan hewan peliharaan.",
    description: "Kunjungan rutin terjadwal otomatis setiap minggu agar rumah selalu higienis dan rapi tanpa perlu pesan berulang kali.",
    isPopular: true,
  },
  {
    name: "Paket Dua Mingguan",
    frequency: "Setiap 14 Hari",
    discountTag: "Hemat 10%",
    idealFor: "Pasangan muda, pekerja sibuk & apartemen 2 kamar.",
    description: "Keseimbangan sempurna antara efisiensi biaya dan kebersihan terjaga berkala sebelum debu menumpuk.",
    isPopular: false,
  },
  {
    name: "Paket Bulanan",
    frequency: "Setiap 30 Hari",
    discountTag: "Hemat 5%",
    idealFor: "Pembersihan menyeluruh berkala & kantor ruko.",
    description: "Deep maintenance bulanan untuk menjaga sanitasi perabot, toilet, dan sudut ruang tetap bersih optimal.",
    isPopular: false,
  },
];

export function RecurringPackagesSection() {
  return (
    <section className="home-section py-20 bg-[#f9fbfa] border-t border-gray-100">
      <div className="home-container max-w-6xl">
        <div className="home-section-heading mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="customer-overline text-teal-700 font-bold tracking-wider">
              Paket Rutin Berlangganan
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Rumah Selalu Terawat, Biaya Lebih Hemat.
            </h2>
            <p className="text-sm text-gray-600 mt-2 max-w-lg">
              Hemat biaya hingga 15% dengan paket pembersihan berkala. Prioritas penugasan petugas favorit Anda tanpa repot memesan ulang setiap kali.
            </p>
          </div>
          <Link
            href="/paket"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline inline-flex items-center gap-1.5"
          >
            Lihat rincian paket rutin <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={`reveal-init p-6 rounded-2xl flex flex-col justify-between border transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                pkg.isPopular
                  ? "bg-white border-teal-600 shadow-sm ring-1 ring-teal-500/20"
                  : "bg-white border-gray-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {pkg.discountTag}
                  </span>
                  <span className="text-xs text-teal-700 font-semibold font-mono">
                    {pkg.frequency}
                  </span>
                </div>

                <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                  {pkg.name}
                </h3>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">
                  {pkg.description}
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-gray-100 text-[11px] text-gray-600 mb-6">
                  <span className="font-semibold text-gray-800 block mb-0.5">Cocok untuk:</span>
                  {pkg.idealFor}
                </div>
              </div>

              <Link
                href="/booking"
                className={`w-full py-2.5 text-center text-xs font-bold rounded-xl transition-colors ${
                  pkg.isPopular
                    ? "bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                    : "bg-gray-50 hover:bg-teal-50 text-gray-800 hover:text-teal-900 border border-gray-200"
                }`}
              >
                Pilih Berlangganan →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
