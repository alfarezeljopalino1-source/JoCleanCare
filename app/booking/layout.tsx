import { ProtectedLayout } from "../components/auth/protected-layout";

export const dynamic = "force-dynamic";

export default function BookingLayout({ children }: LayoutProps<"/booking">) {
  return <ProtectedLayout roles={["customer"]}>{children}</ProtectedLayout>;
}
