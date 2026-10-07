import Link from "next/link";
import { getSignedInProfile } from "../../lib/auth/session";
import {
  getActiveAddOns,
  getActiveServices,
  getCustomerAddresses,
  getCustomerFavoriteCleaners,
  jakartaToday,
  type AddOn,
  type CustomerAddress,
  type Service,
} from "../../lib/bookings";
import { createClient } from "../../lib/supabase/server";
import { BookingForm } from "./booking-form";

export const dynamic = "force-dynamic";

export default async function BookingPage({ searchParams }: PageProps<"/booking">) {
  const params = await searchParams;
  let services: Service[] = [];
  let addOns: AddOn[] = [];
  let addresses: CustomerAddress[] = [];
  let favoriteCleaners: Array<{ staff_id: string; profiles: { id: string; name: string } | null }> = [];
  let customerProfile: { name: string; phone?: string | null } | null = null;
  let hasError = false;

  try {
    const supabase = await createClient();
    const [servicesRes, addOnsRes] = await Promise.all([
      getActiveServices(supabase),
      getActiveAddOns(supabase),
    ]);

    services = (servicesRes.data ?? []) as unknown as Service[];
    addOns = (addOnsRes.data ?? []) as unknown as AddOn[];
    hasError = Boolean(servicesRes.error);

    const signedIn = await getSignedInProfile();
    if (signedIn) {
      customerProfile = signedIn.profile;
      const [addrRes, favRes] = await Promise.all([
        getCustomerAddresses(supabase, signedIn.user.id),
        getCustomerFavoriteCleaners(supabase, signedIn.user.id),
      ]);
      addresses = (addrRes.data ?? []) as unknown as CustomerAddress[];
      favoriteCleaners = (favRes.data ?? []) as unknown as Array<{ staff_id: string; profiles: { id: string; name: string } | null }>;
    }
  } catch {
    hasError = true;
  }

  return (
    <main className="customer-page">
      <div className="customer-container">
        <Link href="/layanan" className="customer-back-link">
          <span aria-hidden="true">←</span> Kembali ke katalog layanan
        </Link>
        <header className="customer-page-heading booking-page-heading">
          <p className="customer-overline">Pemesanan Terpandu</p>
          <h1>Reservasi Layanan JoCleanCare</h1>
          <p>
            Lengkapi detail hunian, durasi, dan layanan tambahan sesuai kebutuhan Anda. Total harga dihitung transparan dan dikonfirmasi langsung.
          </p>
        </header>

        {hasError ? (
          <p className="customer-notice customer-notice-error" role="alert">
            Layanan belum dapat dimuat saat ini. Silakan coba muat ulang halaman.
          </p>
        ) : services.length ? (
          <BookingForm
            services={services}
            addOns={addOns}
            addresses={addresses}
            favoriteCleaners={favoriteCleaners}
            customerProfile={customerProfile}
            today={jakartaToday()}
            selectedServiceId={typeof params.service === "string" ? params.service : undefined}
          />
        ) : (
          <p className="customer-empty">Belum ada layanan aktif untuk dipesan.</p>
        )}
      </div>
    </main>
  );
}
