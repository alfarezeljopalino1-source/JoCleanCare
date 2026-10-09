"use client";

import { useActionState, useState } from "react";

import { registerAction, type AuthFormState } from "../actions/auth";

const initialState: AuthFormState = {};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(registerAction, initialState);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = () => {
    const nextErrors: typeof errors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      nextErrors.name = "Nama lengkap wajib diisi.";
    } else if (trimmedName.length < 2) {
      nextErrors.name = "Nama minimal 2 karakter.";
    }

    if (!trimmedEmail) {
      nextErrors.email = "Email wajib diisi.";
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = "Masukkan alamat email yang valid.";
    }

    if (phone.trim() && phone.trim().length > 0 && phone.trim().length < 8) {
      nextErrors.phone = "Nomor telepon minimal 8 digit.";
    }

    if (!password) {
      nextErrors.password = "Password wajib diisi.";
    } else if (password.length < 8) {
      nextErrors.password = "Password harus memiliki minimal 8 karakter.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Konfirmasi password wajib diisi.";
    } else if (password && confirmPassword !== password) {
      nextErrors.confirmPassword = "Konfirmasi password tidak cocok.";
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
      {state?.success && (
        <p className="auth-message auth-success" role="status" aria-live="polite">
          {state.success}
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
          <label htmlFor="register-name" className="auth-field-label">
            Nama lengkap
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            placeholder="Nama Anda"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "register-name-error" : undefined}
            className={`auth-field-input${errors.name ? " has-error" : ""}`}
            disabled={isPending}
          />
          {errors.name && (
            <p id="register-name-error" className="auth-field-error" role="alert">
              <span aria-hidden="true">⚠️</span> {errors.name}
            </p>
          )}
        </div>

        <div className="auth-field-group">
          <label htmlFor="register-email" className="auth-field-label">
            Email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "register-email-error" : undefined}
            className={`auth-field-input${errors.email ? " has-error" : ""}`}
            disabled={isPending}
          />
          {errors.email && (
            <p id="register-email-error" className="auth-field-error" role="alert">
              <span aria-hidden="true">⚠️</span> {errors.email}
            </p>
          )}
        </div>

        <div className="auth-field-group">
          <div className="flex items-center justify-between">
            <label htmlFor="register-phone" className="auth-field-label">
              Nomor telepon
            </label>
            <span className="auth-optional text-xs text-gray-400 font-normal">(opsional)</span>
          </div>
          <input
            id="register-phone"
            name="phone"
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
            }}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "register-phone-error" : undefined}
            className={`auth-field-input${errors.phone ? " has-error" : ""}`}
            disabled={isPending}
          />
          {errors.phone && (
            <p id="register-phone-error" className="auth-field-error" role="alert">
              <span aria-hidden="true">⚠️</span> {errors.phone}
            </p>
          )}
        </div>

        <div className="auth-field-group">
          <label htmlFor="register-password" className="auth-field-label">
            Password
          </label>
          <input
            id="register-password"
            name="password"
            type="password"
            placeholder="Minimal 8 karakter"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "register-password-error" : undefined}
            className={`auth-field-input${errors.password ? " has-error" : ""}`}
            disabled={isPending}
          />
          {errors.password && (
            <p id="register-password-error" className="auth-field-error" role="alert">
              <span aria-hidden="true">⚠️</span> {errors.password}
            </p>
          )}
        </div>

        <div className="auth-field-group">
          <label htmlFor="register-confirm" className="auth-field-label">
            Konfirmasi password
          </label>
          <input
            id="register-confirm"
            name="confirmPassword"
            type="password"
            placeholder="Ulangi password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
            }}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? "register-confirm-error" : undefined}
            className={`auth-field-input${errors.confirmPassword ? " has-error" : ""}`}
            disabled={isPending}
          />
          {errors.confirmPassword && (
            <p id="register-confirm-error" className="auth-field-error" role="alert">
              <span aria-hidden="true">⚠️</span> {errors.confirmPassword}
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
              <span>Membuat akun...</span>
            </>
          ) : (
            <span>Daftar</span>
          )}
        </button>
      </form>
    </>
  );
}
