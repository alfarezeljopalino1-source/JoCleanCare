import Link from "next/link";

import { getActiveServices, type Service } from "../../../lib/bookings";
import { getSupabaseConfig } from "../../../lib/supabase/config";
import { createClient } from "../../../lib/supabase/server";

export async function Services() {
  let services: Service[] = [];
  let hasError = false;
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const { data, error } = await getActiveServices(supabase);
    services = (data ?? []) as unknown as Service[];
    hasError = Boolean(error);
  }

  return <section id="layanan" className="home-section home-services">
    <div className="home-container">
      <div className="home-section-heading"><div><p className="customer-overline">Layanan JoCleanCare</p><h2>Perawatan yang pas untuk setiap ruang.</h2></div><p>Dari bersih-bersih rutin sampai perawatan khusus, pilih layanan sesuai kebutuhan rumah atau tempat kerja.</p></div>
      {hasError ? <p className="customer-notice" role="alert">Layanan belum dapat dimuat sekarang.</p> : services.length ? <ul className="home-service-list">{services.slice(0, 4).map((service) => <li key={service.id}><Link href={`/booking?service=${encodeURIComponent(service.id)}`}><span>{service.name}</span><span>{Number(service.price).toLocaleString("id-ID")} · {service.duration_minutes} menit <b aria-hidden="true">→</b></span></Link><p>{service.description || "Layanan kebersihan profesional dari JoCleanCare."}</p></li>)}</ul> : <p className="customer-muted">Layanan aktif akan tampil di sini.</p>}
      <Link href="/layanan" className="customer-inline-link home-all-services">Lihat semua layanan <span aria-hidden="true">→</span></Link>
    </div>
  </section>;
}
