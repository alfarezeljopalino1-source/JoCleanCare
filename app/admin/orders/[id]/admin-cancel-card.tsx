"use client";

import { useRef, useState } from "react";
import { adminCancelBookingAction } from "../../actions";
import { ConfirmDialog } from "../../../components/ui/confirm-dialog";

interface AdminCancelCardProps {
  bookingId: string;
}

export function AdminCancelCard({ bookingId }: AdminCancelCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Alasan pembatalan wajib diisi.");
      return;
    }
    setError("");
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  };

  return (
    <div className="admin-cancel-container mt-3">
      <details className="admin-details-cancel">
        <summary className="text-xs font-semibold text-red-600 hover:text-red-700 cursor-pointer py-1">
          ⚠️ Batalkan Booking Ini (Aksi Admin)
        </summary>
        <form
          ref={formRef}
          action={adminCancelBookingAction}
          noValidate
          onSubmit={handleOpenConfirm}
          className="mt-2 space-y-2 p-3 bg-red-50 rounded-lg border border-red-200"
        >
          <input type="hidden" name="booking_id" value={bookingId} />
          <label className="block text-xs font-medium text-gray-800">
            Alasan Pembatalan
            <textarea
              name="cancellation_reason"
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "admin-cancel-error" : undefined}
              className={`w-full mt-1 p-2 text-xs border rounded bg-white text-gray-900 ${
                error ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"
              }`}
              placeholder="Tulis alasan pembatalan (misal: permintaan pelanggan via telepon, kendala cuaca, dsb.)"
            />
          </label>
          {error && (
            <p id="admin-cancel-error" className="text-xs text-red-600 font-medium" role="alert">
              ⚠️ {error}
            </p>
          )}
          <button
            type="submit"
            className="admin-button admin-button-compact bg-red-700 text-white hover:bg-red-800 text-xs py-1.5 px-3 rounded font-semibold transition-colors"
          >
            Batalkan Booking
          </button>
        </form>
      </details>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Konfirmasi Pembatalan Booking Admin"
        description={`Apakah Anda yakin ingin membatalkan booking #${bookingId.slice(
          0,
          8
        )}? Seluruh jadwal tugas petugas kebersihan untuk booking ini akan otomatis dibatalkan.`}
        confirmLabel="Ya, Batalkan Booking"
        cancelLabel="Batal / Kembali"
        variant="danger"
        isLoading={isSubmitting}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
