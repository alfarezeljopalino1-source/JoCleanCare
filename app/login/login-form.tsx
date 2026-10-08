"use client";

import Link from "next/link";
import { useActionState } from "react";

import { loginAction, type AuthFormState } from "../actions/auth";
import { FormSubmit } from "../components/auth/form-submit";

const initialState: AuthFormState = {};

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);
  return <>
    {state.error && <p className="auth-message auth-error" role="alert">{state.error}</p>}
    <form action={action} className="auth-form">
      <label>
        Email
        <input
          autoComplete="email"
          name="email"
          type="email"
          placeholder="nama@email.com"
          defaultValue=""
          required
        />
      </label>
      <label>
        Password
        <input
          autoComplete="current-password"
          name="password"
          type="password"
          placeholder="Masukkan password"
          defaultValue=""
          required
        />
      </label>
      <div className="auth-forgot"><Link href="/register">Perlu membuat akun?</Link></div>
      <FormSubmit pendingText="Sedang masuk...">Login</FormSubmit>
    </form>
  </>;
}
