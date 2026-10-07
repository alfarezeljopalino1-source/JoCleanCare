import { NextResponse, type NextRequest } from "next/server";

import { dashboardForRole, isUserRole } from "../../../lib/auth/roles";
import { createClient } from "../../../lib/supabase/server";

function loginRedirect(request: NextRequest, message: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    return loginRedirect(request, "Tautan konfirmasi tidak valid atau tidak lengkap. Minta email konfirmasi baru.");
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (error || !data.user) {
      return loginRedirect(request, "Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Minta email konfirmasi baru.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile || !isUserRole(profile.role)) {
      await supabase.auth.signOut();
      return loginRedirect(request, "Email terkonfirmasi, tetapi profil akun belum tersedia. Hubungi administrator.");
    }

    return NextResponse.redirect(new URL(dashboardForRole(profile.role), request.url));
  } catch {
    return loginRedirect(request, "Konfirmasi email gagal diproses. Silakan coba lagi atau minta tautan baru.");
  }
}
