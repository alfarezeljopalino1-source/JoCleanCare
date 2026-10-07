import { ProtectedLayout } from "../components/auth/protected-layout";

export const dynamic = "force-dynamic";

export default function ProfileLayout({ children }: LayoutProps<"/profile">) {
  return <ProtectedLayout roles={["customer"]}>{children}</ProtectedLayout>;
}
