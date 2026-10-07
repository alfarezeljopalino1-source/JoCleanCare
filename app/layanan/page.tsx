import Link from "next/link";

import { ServiceCards } from "../components/service-cards";
import { getActiveServices, type Service } from "../../lib/bookings";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  let services: Service[] = [];
  let hasError = false;
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const result = await getActiveServices(supabase);
    services = (result.data ?? []) as unknown as Service[];
    hasError = Boolean(result.error);
  }

  return <main className="customer-page"><div className="customer-container">
    <Link href="/" className="customer-back-link"><span aria-hidden="true">←</span> Beranda</Link>
    <header className="customer-page-heading catalog-heading"><p className="customer-overline">Layanan JoCleanCare</p><h1>Pilih layanan untuk ruangmu.</h1><p>Bandingkan layanan, harga, dan estimasi durasi sebelum membuat pesanan.</p></header>
    {hasError ? <p className="customer-notice customer-notice-error" role="alert">Daftar layanan belum dapat dimuat. Silakan coba lagi nanti.</p> : <ServiceCards services={services} />}
  </div></main>;
}
