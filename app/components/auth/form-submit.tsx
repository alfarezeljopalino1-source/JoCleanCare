"use client";

import { useFormStatus } from "react-dom";

export function FormSubmit({ children, pendingText }: { children: React.ReactNode; pendingText: string }) {
  const { pending } = useFormStatus();
  return <button className="auth-submit" type="submit" disabled={pending}>{pending ? pendingText : children}</button>;
}
