"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { dashboardForRole, isUserRole } from "../../lib/auth/roles";
import { createClient } from "../../lib/supabase/server";

export type AuthFormState = { error?: string; success?: string };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Supabase belum dikonfigurasi")) {
    return "Layanan login belum dikonfigurasi. Silakan hubungi administrator.";
  }
  return error instanceof Error ? error.message : "Terjadi kesalahan. Silakan coba lagi.";
}

async function getCallbackUrl() {
  const requestHeaders = await headers();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) return new URL("/auth/callback", siteUrl).toString();

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) throw new Error("URL situs belum tersedia untuk memulai Google login.");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}/auth/callback`;
}

export async function registerAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = getField(formData, "name");
  const email = getField(formData, "email").toLowerCase();
  const phone = getField(formData, "phone");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password || !confirmPassword) return { error: "Nama, email, dan password wajib diisi." };
  if (!validEmail(email)) return { error: "Format email belum benar." };
  if (password.length < 8) return { error: "Password harus memiliki minimal 8 karakter." };
  if (password !== confirmPassword) return { error: "Konfirmasi password belum sama." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phone } },
    });
    if (error) return { error: error.message };

    if (data.session) redirect("/dashboard");
    return { success: "Pendaftaran berhasil. Periksa email Anda untuk mengonfirmasi akun sebelum login." };
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: authErrorMessage(error) };
  }
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = getField(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Email dan password wajib diisi." };
  if (!validEmail(email)) return { error: "Format email belum benar." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Email atau password tidak cocok. Periksa kembali lalu coba lagi." };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile || !isUserRole(profile.role)) {
      await supabase.auth.signOut();
      return { error: "Profil akun belum tersedia. Hubungi administrator." };
    }
    redirect(dashboardForRole(profile.role));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: authErrorMessage(error) };
  }
}

export async function googleLoginAction() {
  try {
    const supabase = await createClient();
    const redirectTo = await getCallbackUrl();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    if (data.url) redirect(data.url);
    redirect("/login?error=Google%20login%20tidak%20dapat%20dimulai");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/login?error=${encodeURIComponent(authErrorMessage(error))}`);
  }
}

export async function logoutAction() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } finally {
    redirect("/login");
  }
}
