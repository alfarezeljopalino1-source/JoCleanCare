import { redirect } from "next/navigation";

import { dashboardForRole } from "../../lib/auth/roles";
import { getSignedInProfile } from "../../lib/auth/session";
import { AuthCard } from "../components/auth/auth-card";
import { GoogleButton } from "../components/auth/google-button";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const current = await getSignedInProfile();
  if (current) redirect(dashboardForRole(current.profile.role));
  const query = await searchParams;
  return <AuthCard mode="login">
    {query.error && <p className="auth-message auth-error" role="alert">{query.error}</p>}
    <LoginForm />
    <div className="auth-divider"><span>atau</span></div>
    <GoogleButton />
  </AuthCard>;
}
