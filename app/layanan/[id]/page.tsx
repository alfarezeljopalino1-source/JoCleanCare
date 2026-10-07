import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatRupiah,
  getActiveAddOns,
  getServiceById,
  getServiceSuitability,
  type AddOn,
  type Service,
} from "../../../lib/bookings";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ServiceDetailPage({
  params,
}: PageProps<"/layanan/[id]">) {
  const { id } = await params;
  if (!id) notFound();

  const supabase = await createClient();
  const [serviceRes, addOnsRes] = await Promise.all([
    getServiceById(supabase, id),
    getActiveAddOns(supabase),
  ]);

  if (serviceRes.error || !serviceRes.data) {
    notFound();
  }

  const service = serviceRes.data as unknown as Service;
  const addOns = (addOnsRes.data ?? []) as unknown as AddOn[];
  const suitability = getServiceSuitability(service.name);

  const included =
    service.whats_included && service.whats_included.length > 0
      ? service.whats_included
      : [
          "Pembersihan lantai (sapu dan pel basah disinfektan)",
          "Mengelap debu pada meja, rak, dan perabot utama",
          "Pembersihan area dapur dan sink cuci piring",
          "Sanitasi kamar mandi (wastafel, kloset, dan lantai)",
          "Pengosongan dan pembuangan kantong sampah",
        ];

  const excluded =
    service.whats_excluded && service.whats_excluded.length > 0
      ? service.whats_excluded
      : [
          "Pembersihan kerak membandel usia bertahun-tahun (opsi Deep Clean)",
          "Pembersihan bagian dalam kulkas & oven (tersedia via Add-on)",
          "Cuci sofa atau kasur dengan wet extractor (tersedia via Add-on)",
          "Pembersihan plafon di atas ketinggian 3.5 meter",
        ];

  return (
    <main className="customer-page service-detail-page">
      <div className="customer-container">
        {/* Navigation Breadcrumb */}
        <div className="service-detail-breadcrumb">
          <Link href="/layanan" className="customer-back-link">
            <span aria-hidden="true">←</span> Kembali ke katalog layanan
          </Link>
        </div>

        {/* Hero Header */}
        <header className="service-detail-hero">
          <div className="service-hero-main">
            {service.badge && <span className="service-badge">{service.badge}</span>}
            <h1>{service.name}</h1>
            <p className="service-hero-desc">
              {service.description || "Layanan kebersihan menyeluruh dan terstandarisasi untuk kenyamanan hunian Anda."}
            </p>

            <div className="service-hero-meta">
              <div>
                <span>Harga Mulai</span>
                <strong>{formatRupiah(Number(service.price))}</strong>
              </div>
              <div className="meta-divider" />
              <div>
                <span>Estimasi Durasi</span>
                <strong>{service.duration_minutes} Menit</strong>
              </div>
              <div className="meta-divider" />
              <div>
                <span>Standar Kualitas</span>
                <strong>Garansi 100% Puas</strong>
              </div>
            </div>
          </div>

          <div className="service-hero-cta-card">
            <h3>Siap Reservasi?</h3>
            <p>Pilih jadwal fleksibel dan sesuaikan kebutuhan hunian Anda sekarang juga.</p>
            <Link
              href={`/booking?service=${encodeURIComponent(service.id)}`}
              className="customer-button customer-button-primary service-cta-button"
            >
              Pesan Sekarang <span aria-hidden="true">→</span>
            </Link>
            <small>Bisa dijadwalkan hari ini atau tanggal pilihan Anda</small>
          </div>
        </header>

        {/* Inclusions & Exclusions Grid */}
        <section className="service-scope-section">
          <div className="scope-grid">
            {/* What's Included */}
            <article className="scope-box scope-included">
              <div className="scope-header">
                <span className="scope-icon-included">✓</span>
                <h2>Apa Saja yang Termasuk</h2>
              </div>
              <ul className="scope-list">
                {included.map((item, idx) => (
                  <li key={idx}>
                    <span className="check-bullet">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            {/* What's Excluded */}
            <article className="scope-box scope-excluded">
              <div className="scope-header">
                <span className="scope-icon-excluded">✕</span>
                <h2>Yang Tidak Termasuk</h2>
              </div>
              <ul className="scope-list">
                {excluded.map((item, idx) => (
                  <li key={idx}>
                    <span className="cross-bullet">—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        {/* Housing Types & Cleanable Areas (Tahap 2 Spec) */}
        <section className="service-suitability-section">
          <div className="suitability-grid">
            <article className="suitability-box">
              <div className="suitability-header">
                <span className="suitability-icon">🏢</span>
                <div>
                  <p className="customer-overline">Kesesuaian Properti</p>
                  <h2>Tipe Hunian yang Sesuai</h2>
                </div>
              </div>
              <p className="suitability-intro">Layanan ini dirancang dan terbukti optimal untuk jenis bangunan berikut:</p>
              <div className="suitability-tags">
                {suitability.housingTypes.map((type, idx) => (
                  <span key={idx} className="suitability-tag">
                    <span className="tag-check">✓</span> {type}
                  </span>
                ))}
              </div>
            </article>

            <article className="suitability-box">
              <div className="suitability-header">
                <span className="suitability-icon">🚪</span>
                <div>
                  <p className="customer-overline">Cakupan Ruang</p>
                  <h2>Ruangan / Area yang Dapat Dibersihkan</h2>
                </div>
              </div>
              <p className="suitability-intro">Petugas kami dapat menjangkau dan membersihkan area-area ini:</p>
              <div className="suitability-tags">
                {suitability.areas.map((area, idx) => (
                  <span key={idx} className="suitability-tag area-tag">
                    <span className="tag-dot">•</span> {area}
                  </span>
                ))}
              </div>
            </article>
          </div>
        </section>

        {/* Complementary Add-ons */}
        {addOns.length > 0 && (
          <section className="service-addons-section">
            <div className="addons-section-heading">
              <div>
                <p className="customer-overline">Pilihan Tambahan</p>
                <h2>Add-ons yang Dapat Ditambahkan</h2>
              </div>
              <p>Lengkapi pembersihan dengan perawatan khusus sesuai kebutuhan ruangan Anda.</p>
            </div>

            <div className="service-addons-grid">
              {addOns.slice(0, 6).map((addon) => (
                <div key={addon.id} className="service-addon-card">
                  <div className="service-addon-header">
                    <strong>{addon.name}</strong>
                    <span className="addon-price">+{formatRupiah(Number(addon.price))}</span>
                  </div>
                  <p>{addon.description || "Perawatan mendalam ekstra."}</p>
                  <small>Est. +{addon.duration_minutes} menit pengerjaan</small>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA Banner */}
        <section className="service-bottom-banner">
          <div className="banner-copy">
            <h2>Butuh Ruang Bersih dan Nyaman Hari Ini?</h2>
            <p>Tim profesional JoCleanCare siap melayani dengan peralatan lengkap dan chemical higienis aman.</p>
          </div>
          <Link
            href={`/booking?service=${encodeURIComponent(service.id)}`}
            className="customer-button customer-button-primary banner-cta"
          >
            Pesan {service.name} <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
