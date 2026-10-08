import Link from "next/link";
import { getActiveServices, type Service, formatRupiah } from "../../../lib/bookings";
import { getSupabaseConfig } from "../../../lib/supabase/config";
import { createClient } from "../../../lib/supabase/server";

export async function Services() {
  let services: Service[] = [];
  if (getSupabaseConfig()) {
    const supabase = await createClient();
    const { data } = await getActiveServices(supabase);
    services = (data ?? []) as unknown as Service[];
  }

  // Fallback core services if database query is empty
  const displayServices =
    services.length > 0
      ? services.slice(0, 4)
      : [
          {
            id: "b0000001-0000-0000-0000-000000000001",
            name: "Regular Cleaning",
            description: "Sapu, pel disinfektan, lap debu meja & perabot, rapikan tempat tidur, pengosongan tempat sampah.",
            price: 120000,
            duration_minutes: 120,
            badge: "Paling Populer",
          },
          {
            id: "b0000002-0000-0000-0000-000000000002",
            name: "Deep Cleaning",
            description: "Scrubbing kerak lantai/dinding toilet, sanitasi wastafel & kloset, sudut mati, dan disinfeksi menyeluruh.",
            price: 250000,
            duration_minutes: 240,
            badge: "Perawatan Ekstra",
          },
          {
            id: "b0000005-0000-0000-0000-000000000005",
            name: "Office Cleaning",
            description: "Sanitasi meja kerja & perlengkapan, pembersihan pantry & microwave, toilet kantor, dan vakum karpet.",
            price: 200000,
            duration_minutes: 180,
            badge: "Bisnis & Kantor",
          },
          {
            id: "b0000003-0000-0000-0000-000000000003",
            name: "Move In / Move Out",
            description: "Pembersihan total sebelum atau sesudah pindahan hunian, kabinet luar-dalam, kerak air, dan siap huni.",
            price: 350000,
            duration_minutes: 300,
            badge: "Pindahan Bersih",
          },
        ];

  return (
    <section id="layanan" className="home-section py-20 bg-white">
      <div className="home-container max-w-6xl">
        <div className="home-section-heading mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="customer-overline text-teal-700 font-bold tracking-wider">
              Pilihan Layanan
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-1">
              Perawatan Tepat Untuk Setiap Sudut Ruang.
            </h2>
            <p className="text-sm text-gray-600 mt-2 max-w-lg">
              Dari pembersihan rutin mingguan hingga sanitasi mendalam, pilih spesifikasi yang pas untuk rumah, apartemen, atau kantor Anda.
            </p>
          </div>
          <Link
            href="/layanan"
            className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline inline-flex items-center gap-1.5"
          >
            Lihat semua layanan & add-on <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* 4 Core Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayServices.map((service, index) => {
            const isFeatured = index === 0;

            return (
              <div
                key={service.id}
                className={`reveal-init relative flex flex-col justify-between p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  isFeatured
                    ? "bg-[#fcfdfd] border-teal-600 shadow-sm ring-1 ring-teal-500/20"
                    : "bg-white border-gray-200 hover:border-teal-200"
                }`}
              >
                <div>
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-100">
                      {service.badge || "Pilihan"}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      ⏱ {service.duration_minutes} menit
                    </span>
                  </div>

                  {/* Title & Price */}
                  <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                    {service.name}
                  </h3>
                  <div className="text-xl font-black text-teal-700 mb-3">
                    {formatRupiah(Number(service.price))}
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed mb-6">
                    {service.description || "Layanan kebersihan profesional dari JoCleanCare."}
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                  <Link
                    href={`/booking?service=${encodeURIComponent(service.id)}`}
                    className={`w-full py-2.5 text-center text-xs font-bold rounded-xl transition-colors ${
                      isFeatured
                        ? "bg-teal-700 hover:bg-teal-800 text-white shadow-xs"
                        : "bg-gray-50 hover:bg-teal-50 text-gray-800 hover:text-teal-900 border border-gray-200"
                    }`}
                  >
                    Pilih Layanan Ini →
                  </Link>
                  <Link
                    href={`/layanan/${encodeURIComponent(service.id)}`}
                    className="text-center text-[11px] text-gray-400 hover:text-teal-700 font-medium py-1"
                  >
                    Lihat detail cakupan
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
