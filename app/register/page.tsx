import { redirect } from "next/navigation";

import { dashboardForRole } from "../../lib/auth/roles";
import { getSignedInProfile } from "../../lib/auth/session";
import { AuthCard } from "../components/auth/auth-card";
import { GoogleButton } from "../components/auth/google-button";
import { RegisterForm } from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const current = await getSignedInProfile();
  if (current) redirect(dashboardForRole(current.profile.role));
  return <AuthCard mode="register">
    <RegisterForm />
    <div className="auth-divider"><span>atau</span></div>
    <GoogleButton />
  </AuthCard>;
}
