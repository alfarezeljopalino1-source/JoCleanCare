import Link from "next/link";
import { formatRupiah, type Service } from "../../lib/bookings";

export function ServiceCards({ services }: { services: Service[] }) {
  if (!services.length) {
    return (
      <div className="customer-empty customer-services-empty">
        <h2>Belum ada layanan aktif</h2>
        <p>Silakan kembali lagi nanti untuk melihat layanan yang tersedia.</p>
      </div>
    );
  }

  return (
    <ul className="catalog-list">
      {services.map((service) => (
        <li key={service.id} className="catalog-item">
          <div className="catalog-copy">
            <div className="catalog-header-wrap">
              <h2>{service.name}</h2>
              {service.badge && <span className="service-badge">{service.badge}</span>}
            </div>
            <p>{service.description || "Layanan kebersihan profesional dari JoCleanCare."}</p>
          </div>
          <div className="catalog-details">
            <div className="catalog-price-wrap">
              <span className="catalog-price-val">{formatRupiah(Number(service.price))}</span>
              <span className="catalog-duration-val">~{service.duration_minutes} menit</span>
            </div>
            <div className="catalog-actions-wrap">
              <Link href={`/layanan/${encodeURIComponent(service.id)}`} className="customer-inline-link">
                Detail
              </Link>
              <Link
                href={`/booking?service=${encodeURIComponent(service.id)}`}
                className="customer-button customer-button-primary catalog-book-btn"
              >
                Pesan <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
