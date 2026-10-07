import { requireRole } from "../../../lib/auth/session";
import { PageHeading } from "../_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const { profile } = await requireRole(["admin"]);

  return (
    <>
      <PageHeading
        eyebrow="Konfigurasi Bisnis"
        title="Pengaturan Usaha JoCleanCare"
        description="Profil bisnis pembersihan, aturan operasional layanan, dan status keamanan arsitektur sistem."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Profile */}
        <section className="admin-card">
          <h2 className="text-base font-bold text-gray-900 mb-1">Profil Usaha & Kontak</h2>
          <p className="text-xs text-gray-500 mb-4">Informasi identitas bisnis yang ditampilkan kepada pelanggan.</p>
          <dl className="admin-detail-list">
            <div>
              <dt>Nama Bisnis</dt>
              <dd><strong>JoCleanCare</strong></dd>
            </div>
            <div>
              <dt>Tipe Layanan</dt>
              <dd>Jasa Kebersihan Hunian & Komersial</dd>
            </div>
            <div>
              <dt>Jam Operasional</dt>
              <dd className="font-semibold text-teal-800">08:00 – 17:00 WIB (Setiap Hari)</dd>
            </div>
            <div>
              <dt>Cakupan Wilayah</dt>
              <dd>Yogyakarta dan sekitarnya</dd>
            </div>
            <div>
              <dt>WhatsApp Layanan Pelanggan</dt>
              <dd className="font-mono text-teal-700 font-semibold">+62 812-3456-7890</dd>
            </div>
            <div>
              <dt>Email Dukungan</dt>
              <dd className="font-mono">support@jocleancare.com</dd>
            </div>
          </dl>
        </section>

        {/* Operational Policies */}
        <section className="admin-card">
          <h2 className="text-base font-bold text-gray-900 mb-1">Aturan & Kebijakan Operasional</h2>
          <p className="text-xs text-gray-500 mb-4">Parameter kerja yang diberlakukan dalam sistem pemesanan.</p>
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <strong className="text-gray-900 block mb-0.5">Penjadwalan & Waktu Booking</strong>
              <p className="text-gray-600">
                Pelanggan dapat memilih slot waktu 08:00 sampai 16:00 WIB. Sistem memvalidasi kapasitas petugas agar tidak terjadi overbooking.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <strong className="text-gray-900 block mb-0.5">Kebijakan Reschedule (Ganti Jadwal)</strong>
              <p className="text-gray-600">
                Customer diizinkan mengajukan perubahan tanggal dan jam selama pesanan berstatus <em>Menunggu Konfirmasi</em> atau <em>Dikonfirmasi</em>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <strong className="text-gray-900 block mb-0.5">Kebijakan Pembatalan (Cancellation)</strong>
              <p className="text-gray-600">
                Pembatalan mandiri oleh customer hanya dapat dilakukan sebelum petugas mulai bekerja di lokasi. Admin dapat membatalkan pesanan kapan saja dengan catatan alasan pembatalan.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
              <strong className="text-gray-900 block mb-0.5">Paket Langganan Rutin (Recurring)</strong>
              <p className="text-gray-600">
                Diskon otomatis berlaku untuk paket rutin: Mingguan (10%), Dua Mingguan (5%), dan Bulanan (3%).
              </p>
            </div>
          </div>
        </section>

        {/* Security & System Architecture Status */}
        <section className="admin-card lg:col-span-2">
          <h2 className="text-base font-bold text-gray-900 mb-1">Status Keamanan & Arsitektur Multi-User</h2>
          <p className="text-xs text-gray-500 mb-4">
            Pengaturan privasi data dan proteksi keamanan tingkat basis data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
              <strong className="text-teal-900 block font-bold mb-1">✓ Supabase Row Level Security (RLS)</strong>
              <p className="text-teal-800">
                Terkonfigurasi ketat. Customer A dijamin tidak dapat mengakses atau membaca data pesanan, chat, dan alamat milik Customer B.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
              <strong className="text-teal-900 block font-bold mb-1">✓ Server-Side Role Enforcement</strong>
              <p className="text-teal-800">
                Role (Customer, Staff, Admin) divalidasi langsung di sisi server melalui helper <code>requireRole()</code>, kebal manipulasi klien.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-teal-50 border border-teal-200">
              <strong className="text-teal-900 block font-bold mb-1">✓ Staff Isolation Boundary</strong>
              <p className="text-teal-800">
                Petugas hanya dapat membaca data pekerjaan yang secara spesifik ditugaskan kepada mereka melalui stored procedures aman.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Sesi Administrator Aktif: <strong>{profile.name}</strong></span>
            <span className="font-mono">Versi JoCleanCare: 0.1.0-production-ready</span>
          </div>
        </section>
      </div>
    </>
  );
}
