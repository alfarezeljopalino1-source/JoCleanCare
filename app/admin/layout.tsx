import { requireRole } from "../../lib/auth/session";
import { AdminShell } from "./_components/admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const current = await requireRole(["admin"]);
  return <AdminShell name={current.profile.name}>{children}</AdminShell>;
}
