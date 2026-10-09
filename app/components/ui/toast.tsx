"use client";

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastItemProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

function ToastItem({ toast, onClose }: ToastItemProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠️",
  };

  const styleClasses: Record<ToastType, string> = {
    success: "border-teal-500 bg-teal-50 text-teal-950",
    error: "border-red-500 bg-red-50 text-red-950",
    info: "border-blue-500 bg-blue-50 text-blue-950",
    warning: "border-amber-500 bg-amber-50 text-amber-950",
  };

  const iconClasses: Record<ToastType, string> = {
    success: "bg-teal-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-blue-600 text-white",
    warning: "bg-amber-600 text-white",
  };

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      aria-live="polite"
      className={`flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border shadow-lg transition-all animate-in slide-in-from-bottom-3 duration-200 ${styleClasses[toast.type]}`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${iconClasses[toast.type]}`}
        aria-hidden="true"
      >
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0 pr-1 text-sm">
        {toast.title && <strong className="block font-semibold mb-0.5">{toast.title}</strong>}
        <p className="leading-snug text-xs sm:text-sm">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        aria-label="Tutup notifikasi"
        className="text-gray-400 hover:text-gray-700 text-sm font-bold p-1 rounded-sm focus:outline-hidden"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onClose,
}: {
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifikasi"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100%-2rem)] pointer-events-auto"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}
