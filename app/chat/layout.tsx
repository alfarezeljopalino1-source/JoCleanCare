import { ProtectedLayout } from "../components/auth/protected-layout";

export const dynamic = "force-dynamic";

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedLayout roles={["customer"]}>{children}</ProtectedLayout>;
}
