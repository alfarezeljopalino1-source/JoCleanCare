"use client";

import { useRef, useState } from "react";
import { cancelBookingAction } from "../../actions/bookings";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

interface OrderCancelCardProps {
  bookingId: string;
  bookingCode: string;
}

export function OrderCancelCard({ bookingId, bookingCode }: OrderCancelCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("Perubahan jadwal / urusan mendadak");
  const formRef = useRef<HTMLFormElement>(null);

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmCancel = () => {
    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  };

  return (
    <section className="order-cancel-section mt-6">
      <details className="cancel-details-dropdown">
        <summary className="cancel-summary-trigger font-medium cursor-pointer text-sm text-red-700 hover:text-red-800 py-2">
          Ingin membatalkan pesanan ini?
        </summary>
        <form
          ref={formRef}
          action={cancelBookingAction}
          onSubmit={handleOpenConfirm}
          className="cancel-form mt-2 p-4 bg-red-50/60 rounded-xl border border-red-100"
        >
          <input type="hidden" name="booking_id" value={bookingId} />
          <p className="text-xs sm:text-sm text-gray-700 mb-3 leading-relaxed">
            Pembatalan gratis dapat dilakukan selama pesanan masih berstatus Menunggu Konfirmasi atau
            Dikonfirmasi sebelum petugas berangkat.
          </p>
          <label className="customer-field-label block mb-3 text-xs sm:text-sm font-medium text-gray-800">
            Alasan Pembatalan
            <select
              name="cancellation_reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="customer-field mt-1 w-full"
            >
              <option value="Perubahan jadwal / urusan mendadak">Perubahan jadwal / urusan mendadak</option>
              <option value="Salah memilih layanan atau waktu">Salah memilih layanan atau waktu</option>
              <option value="Sudah dibersihkan sendiri">Sudah dibersihkan sendiri</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </label>
          <button
            type="submit"
            className="customer-button cancel-submit-button bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Batalkan Pesanan
          </button>
        </form>
      </details>

      <ConfirmDialog
        isOpen={showConfirm}
        title="Batalkan Pesanan Ini?"
        description={`Apakah Anda yakin ingin membatalkan pesanan ${bookingCode}? Tindakan ini bersifat permanen dan petugas yang ditugaskan akan dilepaskan dari jadwal.`}
        confirmLabel="Ya, Batalkan Pesanan"
        cancelLabel="Batal / Kembali"
        variant="danger"
        isLoading={isSubmitting}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowConfirm(false)}
      />
    </section>
  );
}
