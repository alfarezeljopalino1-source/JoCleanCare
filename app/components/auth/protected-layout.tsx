import type { UserRole } from "../../../lib/auth/roles";
import { requireRole } from "../../../lib/auth/session";
import { SessionNav } from "./session-nav";

export async function ProtectedLayout({ roles, children }: { roles: readonly UserRole[]; children: React.ReactNode }) {
  const current = await requireRole(roles);
  return <><SessionNav profile={current.profile} />{children}</>;
}
