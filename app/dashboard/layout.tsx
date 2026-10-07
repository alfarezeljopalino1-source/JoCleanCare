import { ProtectedLayout } from "../components/auth/protected-layout";

export const dynamic = "force-dynamic";

export default function CustomerLayout({ children }: LayoutProps<"/dashboard">) {
  return <ProtectedLayout roles={["customer"]}>{children}</ProtectedLayout>;
}
