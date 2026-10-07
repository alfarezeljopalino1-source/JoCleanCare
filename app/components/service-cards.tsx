"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatRupiah, type Service } from "../../lib/bookings";

export function ServiceCards({ services }: { services: Service[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "Semua" },
    { id: "rumah", label: "Rumah & Hunian" },
    { id: "kantor", label: "Kantor & Ruko" },
    { id: "deep", label: "Deep Cleaning" },
    { id: "pindahan", label: "Pindahan" },
  ];

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const name = (service.name || "").toLowerCase();
      const desc = (service.description || "").toLowerCase();
      const tier = (service.service_tier || "").toLowerCase();
      const search = searchTerm.toLowerCase();

      // Search match
      const matchesSearch = !search || name.includes(search) || desc.includes(search);

      // Category match
      let matchesCategory = true;
      if (selectedCategory === "rumah") {
        matchesCategory = tier === "standard" || name.includes("regular") || name.includes("deep");
      } else if (selectedCategory === "kantor") {
        matchesCategory = tier === "commercial" || name.includes("office") || name.includes("kantor");
      } else if (selectedCategory === "deep") {
        matchesCategory = tier === "deep" || name.includes("deep");
      } else if (selectedCategory === "pindahan") {
        matchesCategory = tier === "move_in" || tier === "move_out" || name.includes("move");
      }

      return matchesSearch && matchesCategory;
    });
  }, [services, searchTerm, selectedCategory]);

  if (!services.length) {
    return (
      <div className="customer-empty customer-services-empty">
        <h2>Belum ada layanan aktif</h2>
        <p>Silakan kembali lagi nanti untuk melihat layanan yang tersedia.</p>
      </div>
    );
  }

  return (
    <div className="catalog-wrapper">
      {/* Search and Category Filters (Tahap 23 Spec) */}
      <div className="catalog-filter-bar mb-6 space-y-4">
        <div className="catalog-search-wrap">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Cari nama layanan atau kebutuhan ruangan..."
            className="customer-field catalog-search-input"
          />
        </div>

        <div className="catalog-category-chips flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`chip-button chip-compact ${selectedCategory === cat.id ? "is-selected" : ""}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="customer-empty customer-services-empty py-10">
          <h3>Tidak ada layanan yang sesuai</h3>
          <p>Coba kata kunci pencarian lain atau pilih kategori &ldquo;Semua&rdquo;.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
            }}
            className="customer-button customer-button-link mt-2"
          >
            Reset Filter
          </button>
        </div>
      ) : (
        <ul className="catalog-list">
          {filteredServices.map((service) => (
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
      )}
    </div>
  );
}
