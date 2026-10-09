"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { loginAction, type AuthFormState } from "../actions/auth";

const initialState: AuthFormState = {};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const nextErrors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      nextErrors.email = "Email wajib diisi.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Masukkan alamat email yang valid.";
    }

    if (!password) {
      nextErrors.password = "Password wajib diisi.";
    }

    return nextErrors;
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (isPending) {
      e.preventDefault();
      return;
    }
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      e.preventDefault();
      setErrors(validationErrors);
      return;
    }
    setErrors({});
  };

  return (
    <>
      {state?.error && (
        <p className="auth-message auth-error" role="alert" aria-live="polite">
          {state.error}
        </p>
      )}

      <form
        action={formAction}
        onSubmit={handleSubmit}
        className="auth-form"
        noValidate
        autoComplete="off"
      >
        <div className="auth-field-group">
          <label htmlFor="login-email" className="auth-field-label">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            className={`auth-field-input${errors.email ? " has-error" : ""}`}
            disabled={isPending}
          />
          {errors.email && (
            <p id="login-email-error" className="auth-field-error" role="alert">
              <span aria-hidden="true">⚠️</span> {errors.email}
            </p>
          )}
        </div>

        <div className="auth-field-group">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="auth-field-label">
              Password
            </label>
            <div className="auth-forgot">
              <Link href="/register">Perlu membuat akun?</Link>
            </div>
          </div>
          <input
            id="login-password"
            name="password"
            type="password"
            placeholder="Masukkan password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) {
                setErrors((prev) => ({ ...prev, password: undefined }));
              }
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            className={`auth-field-input${errors.password ? " has-error" : ""}`}
            disabled={isPending}
          />
          {errors.password && (
            <p id="login-password-error" className="auth-field-error" role="alert">
              <span aria-hidden="true">⚠️</span> {errors.password}
            </p>
          )}
        </div>

        <button
          className="auth-submit"
          type="submit"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? (
            <>
              <span className="auth-spinner" aria-hidden="true" />
              <span>Sedang masuk...</span>
            </>
          ) : (
            <span>Login</span>
          )}
        </button>
      </form>
    </>
  );
}
