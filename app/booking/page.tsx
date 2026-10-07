import Link from "next/link";

import { BookingForm } from "./booking-form";
import { getActiveServices, jakartaToday, type Service } from "../../lib/bookings";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BookingPage({ searchParams }: PageProps<"/booking">) {
  const params = await searchParams;
  let services: Service[] = [];
  let hasError = false;
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const result = await getActiveServices(supabase);
    services = (result.data ?? []) as unknown as Service[];
    hasError = Boolean(result.error);
  } else {
    hasError = true;
  }

  return <main className="customer-page"><div className="customer-container customer-narrow">
    <Link href="/layanan" className="customer-back-link"><span aria-hidden="true">←</span> Kembali ke layanan</Link>
    <header className="customer-page-heading booking-page-heading"><p className="customer-overline">Pemesanan layanan</p><h1>Atur kunjungan kebersihan.</h1><p>Pilih layanan dan waktu yang kamu inginkan. Tim kami akan meninjau permintaanmu.</p></header>
    {hasError ? <p className="customer-notice customer-notice-error" role="alert">Layanan belum dapat dimuat. Silakan coba lagi nanti.</p> : services.length ? <BookingForm services={services} today={jakartaToday()} selectedServiceId={typeof params.service === "string" ? params.service : undefined} /> : <p className="customer-empty">Belum ada layanan aktif untuk dipesan.</p>}
  </div></main>;
}
