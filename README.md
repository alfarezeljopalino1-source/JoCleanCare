# JoCleanCare

Aplikasi web layanan kebersihan yang dibangun dengan Next.js App Router, React, TypeScript, Tailwind CSS, dan Supabase.

## Menjalankan proyek

1. Salin `.env.example` menjadi `.env.local`.
2. Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` dari halaman API settings project Supabase. Gunakan publishable/anon key; jangan pernah memasukkan service role key ke browser atau repository.
3. Atur `NEXT_PUBLIC_SITE_URL` ke `http://localhost:3000` untuk pengembangan lokal.
4. Jalankan migrasi `supabase/migrations/202609300001_profiles_auth.sql` melalui Supabase CLI atau SQL Editor.
5. Jalankan `npm run dev`.

## Menyiapkan Supabase Auth

- Aktifkan provider Email di Authentication → Sign In / Providers. Jika konfirmasi email aktif, pengguna perlu mengonfirmasi email sebelum login.
- Untuk Google, aktifkan provider Google di Supabase dan masukkan OAuth client ID/secret dari Google Cloud ke konfigurasi provider di dashboard Supabase. Credential Google tidak disimpan di kode aplikasi.
- Tambahkan `http://localhost:3000/auth/callback` pada daftar Redirect URLs Supabase. Tambahkan juga URL callback domain production ketika deploy.
- Atur Site URL Supabase ke origin situs yang sesuai. Untuk Vercel, set `NEXT_PUBLIC_SITE_URL` dan kedua environment variable Supabase pada Project Settings → Environment Variables.
- Buat akun admin/staff seperti biasa, lalu ubah role secara manual melalui SQL Editor yang tepercaya setelah akun terdaftar, misalnya: `update public.profiles set role = 'admin' where email = 'alamat-admin-anda@example.com';`. Ganti nilai email dengan akun yang Anda kendalikan. Role tidak dapat dipilih lewat form publik.

Trigger database membuat profile `customer` untuk pendaftaran email maupun Google. Kebijakan RLS membatasi profile ke pemiliknya dan izin kolom mencegah pengguna mengubah role/email sendiri. Route role dilindungi melalui pemeriksaan session dan profile di server.

## Pemeriksaan

```bash
npm run lint
npx tsc --noEmit
```
