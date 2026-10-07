import { ProtectedLayout } from "../components/auth/protected-layout";

export const dynamic = "force-dynamic";

export default function StaffLayout({ children }: LayoutProps<"/staff">) {
  return <ProtectedLayout roles={["staff"]}>{children}</ProtectedLayout>;
}
