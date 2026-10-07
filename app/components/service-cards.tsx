import Link from "next/link";

import { formatRupiah, type Service } from "../../lib/bookings";

export function ServiceCards({ services }: { services: Service[] }) {
  if (!services.length) return <div className="customer-empty customer-services-empty"><h2>Belum ada layanan aktif</h2><p>Silakan kembali lagi nanti untuk melihat layanan yang tersedia.</p></div>;

  return <ul className="catalog-list">
    {services.map((service) => <li key={service.id} className="catalog-item">
      <div className="catalog-copy"><h2>{service.name}</h2><p>{service.description || "Layanan kebersihan profesional dari JoCleanCare."}</p></div>
      <div className="catalog-details"><span>{formatRupiah(Number(service.price))}</span><span>{service.duration_minutes} menit</span><Link href={`/booking?service=${encodeURIComponent(service.id)}`} className="customer-inline-link">Pesan <span aria-hidden="true">→</span></Link></div>
    </li>)}
  </ul>;
}
