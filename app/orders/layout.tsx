import { ProtectedLayout } from "../components/auth/protected-layout";

export const dynamic = "force-dynamic";

export default function OrdersLayout({ children }: LayoutProps<"/orders">) {
  return <ProtectedLayout roles={["customer"]}>{children}</ProtectedLayout>;
}
