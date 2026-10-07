import Link from "next/link";
import { formatRupiah } from "../../lib/bookings";

export const metadata = {
  title: "Paket Langganan Rutin | JoCleanCare",
  description: "Paket perawatan kebersihan rutin bulanan untuk rumah dan apartemen selalu bersih dan higienis.",
};

const subscriptionPackages = [
  {
    id: "basic",
    name: "Paket Rutin Basic",
    visitsPerMonth: 4,
    frequencyLabel: "1 Kunjungan per Minggu",
    originalPrice: 480000,
    discountedPrice: 408000,
    savingsText: "Hemat 15%",
    badge: "Praktis Mingguan",
    idealFor: "Hunian studio, 1-2 kamar, atau penghuni yang sibuk di hari kerja.",
    features: [
      "4x Kunjungan pembersihan per bulan",
      "Durasi 2 jam setiap kunjungan",
      "Sapu, pel disinfektan & lap perabot utama",
      "Sanitasi kamar mandi & buang sampah",
      "Penjadwalan hari tetap yang fleksibel digeser",
      "Garansi kepuasan pembersihan ulang",
    ],
    bookingParam: "weekly",
  },
  {
    id: "regular",
    name: "Paket Rutin Regular",
    visitsPerMonth: 8,
    frequencyLabel: "2 Kunjungan per Minggu",
    originalPrice: 960000,
    discountedPrice: 768000,
    savingsText: "Hemat 20%",
    badge: "Paling Populer",
    popular: true,
    idealFor: "Rumah keluarga 2-3 kamar dengan anak atau hewan peliharaan.",
    features: [
      "8x Kunjungan pembersihan per bulan",
      "Durasi 2 jam setiap kunjungan",
      "Pembersihan detail ruang tamu, kamar & dapur",
      "Prioritas penugasan petugas favorit",
      "Diskon 15% untuk semua add-on tambahan",
      "Reschedule mudah hingga 12 jam sebelumnya",
      "Dukungan admin prioritas via chat",
    ],
    bookingParam: "weekly",
  },
  {
    id: "premium",
    name: "Paket Rutin Premium",
    visitsPerMonth: 12,
    frequencyLabel: "3 Kunjungan per Minggu",
    originalPrice: 1440000,
    discountedPrice: 1080000,
    savingsText: "Hemat 25%",
    badge: "Perawatan Maksimal",
    idealFor: "Rumah besar, kantor kecil/ruko, atau standar kebersihan tertinggi.",
    features: [
      "12x Kunjungan pembersihan per bulan",
      "Durasi 2-3 jam fleksibel per kunjungan",
      "Pembersihan menyeluruh + sanitasi komprehensif",
      "Dedikasi staf cleaner terlatih tetap",
      "Gratis 1x Add-on Kulkas/Kompor setiap bulan",
      "Laporan checklist kebersihan digital",
      "Bebas biaya reschedule kapan saja",
    ],
    bookingParam: "weekly",
  },
];

export default function SubscriptionPackagesPage() {
  return (
    <main className="customer-page packages-page">
      <div className="customer-container">
        <div className="customer-breadcrumb mb-2">
          <Link href="/layanan" className="customer-back-link">
            <span aria-hidden="true">←</span> Kembali ke katalog layanan
          </Link>
        </div>

        <header className="customer-page-heading text-center max-w-2xl mx-auto">
          <p className="customer-overline">Langganan Rutin JoCleanCare</p>
          <h1>Rumah Bersih Terawat Tanpa Repot</h1>
          <p>
            Pilih paket kunjungan berkala bulanan dengan tarif lebih hemat dan jaminan ketersediaan slot petugas kebersihan.
          </p>
        </header>

        {/* Package Grid */}
        <div className="packages-grid mt-8">
          {subscriptionPackages.map((pkg) => (
            <article
              key={pkg.id}
              className={`package-card ${pkg.popular ? "is-featured" : ""}`}
            >
              <div className="package-card-header">
                {pkg.badge && <span className="package-badge">{pkg.badge}</span>}
                <h2>{pkg.name}</h2>
                <p className="package-frequency">{pkg.frequencyLabel}</p>
                <div className="package-pricing">
                  <span className="package-original-price">
                    {formatRupiah(pkg.originalPrice)}
                  </span>
                  <div className="package-main-price">
                    <strong>{formatRupiah(pkg.discountedPrice)}</strong>
                    <small>/ bulan</small>
                  </div>
                  <span className="package-savings-tag">{pkg.savingsText}</span>
                </div>
              </div>

              <div className="package-ideal">
                <strong>Cocok untuk:</strong> {pkg.idealFor}
              </div>

              <ul className="package-features-list">
                {pkg.features.map((feat, idx) => (
                  <li key={idx}>
                    <span className="check-bullet">✓</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <div className="package-cta-wrap">
                <Link
                  href={`/booking?recurring=${pkg.bookingParam}`}
                  className={`customer-button ${pkg.popular ? "customer-button-primary" : "customer-button-secondary"} full-width`}
                >
                  Pilih Paket & Atur Kunjungan Pertama <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Subscription FAQ / Guarantee */}
        <section className="packages-faq-section mt-12">
          <h2>Pertanyaan Umum Paket Langganan</h2>
          <div className="faq-grid mt-6">
            <div className="faq-item">
              <h3>Apakah saya bisa menjadwalkan ulang (reschedule) kunjungan?</h3>
              <p>
                Bisa. Anda dapat mengatur ulang jadwal kunjungan hingga 12 jam sebelum jadwal dimulai tanpa biaya tambahan melalui detail pesanan.
              </p>
            </div>
            <div className="faq-item">
              <h3>Apakah petugas yang datang selalu orang yang sama?</h3>
              <p>
                Ya, kami mengutamakan menugaskan petugas yang sama atau petugas yang Anda simpan sebagai favorit agar sudah memahami kebutuhan hunian Anda.
              </p>
            </div>
            <div className="faq-item">
              <h3>Bagaimana mekanisme pembayaran paket?</h3>
              <p>
                Untuk kemudahan Anda, konfirmasi paket dilakukan melalui sistem booking JoCleanCare dan pembayaran diverifikasi transparan per periode kunjungan.
              </p>
            </div>
            <div className="faq-item">
              <h3>Apakah peralatan kebersihan sudah disediakan?</h3>
              <p>
                Seluruh petugas kami telah dilengkapi dengan chemical pembersih higienis standar JoCleanCare, lap microfiber berkode warna, dan peralatan standar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
