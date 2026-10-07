import { NextResponse, type NextRequest } from "next/server";

import { dashboardForRole, isUserRole } from "../../../lib/auth/roles";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=Login%20Google%20dibatalkan", request.url));

  try {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return NextResponse.redirect(new URL("/login?error=Gagal%20memverifikasi%20login%20Google", request.url));

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.redirect(new URL("/login?error=Sesi%20login%20tidak%20ditemukan", request.url));

    let { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile) {
      const name = typeof user.user_metadata.name === "string"
        ? user.user_metadata.name
        : typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "Pelanggan";
      await supabase.from("profiles").upsert(
        { id: user.id, name, email: user.email ?? null, phone: null, role: "customer" },
        { onConflict: "id", ignoreDuplicates: true },
      );
      const result = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      profile = result.data;
    }

    if (!profile || !isUserRole(profile.role)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?error=Profil%20akun%20belum%20tersedia", request.url));
    }
    return NextResponse.redirect(new URL(dashboardForRole(profile.role), request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=Terjadi%20kesalahan%20saat%20login", request.url));
  }
}
