"use client";

import { useFormStatus } from "react-dom";

import { googleLoginAction } from "../../actions/auth";

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return <button className="auth-google" type="submit" disabled={pending}>
    <span className="google-g" aria-hidden="true">G</span>{pending ? "Menghubungkan ke Google..." : "Continue with Google"}
  </button>;
}

export function GoogleButton() {
  return <form action={googleLoginAction}><GoogleSubmit /></form>;
}
