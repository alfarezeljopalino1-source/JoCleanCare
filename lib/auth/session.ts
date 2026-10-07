import { redirect } from "next/navigation";

import { dashboardForRole, isUserRole, type UserRole } from "./roles";
import { getSupabaseConfig } from "../supabase/config";
import { createClient } from "../supabase/server";

export async function getSignedInProfile() {
  if (!getSupabaseConfig()) return null;
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, email, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !isUserRole(profile.role)) return null;
  return { supabase, user, profile: { ...profile, role: profile.role } };
}

export async function requireRole(allowedRoles: readonly UserRole[]) {
  const current = await getSignedInProfile();
  if (!current) redirect("/login");
  if (!allowedRoles.includes(current.profile.role)) redirect(dashboardForRole(current.profile.role));
  return current;
}
