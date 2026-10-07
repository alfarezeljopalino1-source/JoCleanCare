"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createBooking, type BookingFormState } from "../actions/bookings";
import { bookingStatuses, formatBookingDate, formatRupiah, type Service } from "../../lib/bookings";

const initialState: BookingFormState = {};

export function BookingForm({ services, today, selectedServiceId }: { services: Service[]; today: string; selectedServiceId?: string }) {
  const [state, formAction, pending] = useActionState(createBooking, initialState);
  const [selectedService, setSelectedService] = useState(selectedServiceId ?? "");
  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [address, setAddress] = useState("");
  const selected = services.find((service) => service.id === selectedService);

  if (state.booking) return <section className="booking-success" aria-live="polite">
    <p className="customer-overline">Booking berhasil dikirim</p><h2>Terima kasih sudah memesan.</h2><p className="booking-success-intro">Permintaanmu menunggu konfirmasi dari JoCleanCare.</p>
    <dl className="booking-success-details"><div><dt>Nomor booking</dt><dd className="break-all">{state.booking.id}</dd></div><div><dt>Layanan</dt><dd>{state.booking.serviceName}</dd></div><div><dt>Tanggal</dt><dd>{formatBookingDate(state.booking.bookingDate)}</dd></div><div><dt>Waktu</dt><dd>{state.booking.startTime} WIB</dd></div><div><dt>Total</dt><dd>{formatRupiah(state.booking.totalPrice)}</dd></div><div><dt>Status</dt><dd>{bookingStatuses[state.booking.status] ?? state.booking.status}</dd></div></dl>
    <Link href={`/orders/${state.booking.id}`} className="customer-button customer-button-primary">Lihat pesanan <span aria-hidden="true">→</span></Link>
  </section>;

  return <form action={formAction} className="booking-form-layout">
    <div className="booking-form-fields">
      {state.error && <p className="customer-notice customer-notice-error" role="alert">{state.error}</p>}
      <div className="booking-fields-grid">
        <label className="customer-field-label booking-service-field">Pilih layanan<select name="service_id" required value={selectedService} onChange={(event) => setSelectedService(event.target.value)} className="customer-field"><option value="" disabled>Pilih layanan</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatRupiah(service.price)}</option>)}</select></label>
        <label className="customer-field-label">Tanggal layanan<input className="customer-field" type="date" name="booking_date" min={today} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} required /></label>
        <label className="customer-field-label">Waktu mulai<input className="customer-field" type="time" name="start_time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required /></label>
        <label className="customer-field-label booking-service-field">Alamat layanan<textarea className="customer-field customer-textarea" name="address" minLength={8} maxLength={500} value={address} onChange={(event) => setAddress(event.target.value)} required placeholder="Jalan, nomor rumah, kecamatan, kota" /></label>
        <label className="customer-field-label booking-service-field">Catatan tambahan <span className="field-optional">Opsional</span><textarea className="customer-field customer-textarea customer-notes" name="notes" maxLength={1000} placeholder="Petunjuk akses atau kebutuhan khusus" /></label>
      </div>
      <button className="customer-button customer-button-primary booking-submit" type="submit" disabled={pending || services.length === 0}>{pending ? "Mengirim booking…" : "Konfirmasi booking"}</button>
    </div>
    <aside className="booking-summary" aria-label="Ringkasan pemesanan"><p className="customer-overline">Ringkasan pemesanan</p>
      {selected ? <><p className="booking-summary-service">{selected.name}</p><p className="booking-summary-description">{selected.description || "Layanan kebersihan profesional JoCleanCare."}</p><dl className="booking-summary-facts"><div><dt>Durasi</dt><dd>{selected.duration_minutes} menit</dd></div><div><dt>Total harga</dt><dd>{formatRupiah(Number(selected.price))}</dd></div></dl></> : <p className="customer-muted">Pilih layanan untuk melihat harga dan estimasi durasinya.</p>}
      <dl className="booking-summary-facts booking-summary-extra"><div><dt>Jadwal</dt><dd>{bookingDate || "Pilih tanggal"}{startTime ? ` · ${startTime}` : ""}</dd></div><div><dt>Alamat</dt><dd>{address || "Belum diisi"}</dd></div><div><dt>Status awal</dt><dd>Menunggu konfirmasi</dd></div></dl>
    </aside>
  </form>;
}
