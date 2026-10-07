"use client";

import { useActionState } from "react";

import { registerAction, type AuthFormState } from "../actions/auth";
import { FormSubmit } from "../components/auth/form-submit";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, initialState);
  return <>
    {state.error && <p className="auth-message auth-error" role="alert">{state.error}</p>}
    {state.success && <p className="auth-message auth-success" role="status">{state.success}</p>}
    <form action={action} className="auth-form">
      <label>Nama lengkap<input autoComplete="name" name="name" type="text" placeholder="Nama Anda" minLength={2} maxLength={100} required /></label>
      <label>Email<input autoComplete="email" name="email" type="email" placeholder="nama@email.com" required /></label>
      <label>Nomor telepon <span className="auth-optional">(opsional)</span><input autoComplete="tel" name="phone" type="tel" placeholder="08xxxxxxxxxx" maxLength={25} /></label>
      <label>Password<input autoComplete="new-password" name="password" type="password" placeholder="Minimal 8 karakter" minLength={8} required /></label>
      <label>Konfirmasi password<input autoComplete="new-password" name="confirmPassword" type="password" placeholder="Ulangi password" minLength={8} required /></label>
      <FormSubmit pendingText="Membuat akun...">Daftar</FormSubmit>
    </form>
  </>;
}
