"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { createBooking, type BookingFormState } from "../actions/bookings";
import {
  bookingStatuses,
  calculateServerPriceBreakdown,
  durationOptions,
  formatBookingDate,
  formatRupiah,
  housingTypes,
  recurringOptions,
  roomOptions,
  standardTimeSlots,
  type AddOn,
  type CustomerAddress,
  type HousingType,
  type RecurringFrequency,
  type Service,
} from "../../lib/bookings";

const initialState: BookingFormState = {};

interface BookingFormProps {
  services: Service[];
  addOns: AddOn[];
  addresses: CustomerAddress[];
  favoriteCleaners: Array<{ staff_id: string; profiles: { id: string; name: string } | null }>;
  customerProfile: { name: string; phone?: string | null } | null;
  today: string;
  selectedServiceId?: string;
}

export function BookingForm({
  services,
  addOns,
  addresses,
  favoriteCleaners,
  customerProfile,
  today,
  selectedServiceId,
}: BookingFormProps) {
  const [state, formAction, pending] = useActionState(createBooking, initialState);

  // Multi-step progressive disclosure (Steps 1 to 4 groups)
  // Step 1: Layanan & Hunian (Service, Housing Type, Rooms, Duration)
  // Step 2: Layanan Tambahan (Add-ons) & Preferensi Rutin
  // Step 3: Jadwal & Waktu
  // Step 4: Alamat & Kontak, Review & Konfirmasi
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [selectedService, setSelectedService] = useState(selectedServiceId || services[0]?.id || "");
  const [housingType, setHousingType] = useState<HousingType>("rumah");
  const [roomCount, setRoomCount] = useState("2_rooms");
  const [durationHours, setDurationHours] = useState<number>(2);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [recurring, setRecurring] = useState<RecurringFrequency>("one_time");

  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");

  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id || "manual");
  const [manualAddress, setManualAddress] = useState(addresses[0]?.full_address || "");
  const [addressLabel, setAddressLabel] = useState(addresses[0]?.label || "Rumah");
  const [customerPhone, setCustomerPhone] = useState(addresses[0]?.phone || customerProfile?.phone || "");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [preferredStaffId, setPreferredStaffId] = useState("");

  const activeServiceObj = useMemo(
    () => services.find((s) => s.id === selectedService) || services[0],
    [services, selectedService]
  );

  const selectedAddOnObjs = useMemo(
    () => addOns.filter((a) => selectedAddOnIds.includes(a.id)),
    [addOns, selectedAddOnIds]
  );

  const pricing = useMemo(() => {
    return calculateServerPriceBreakdown({
      baseCatalogPrice: Number(activeServiceObj?.price || 0),
      durationHours,
      selectedAddOns: selectedAddOnObjs.map((a) => ({ id: a.id, price: Number(a.price), name: a.name })),
      recurring,
    });
  }, [activeServiceObj, durationHours, selectedAddOnObjs, recurring]);

  const handleToggleAddOn = (id: string) => {
    setSelectedAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectSavedAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === "manual") {
      setManualAddress("");
      setAddressLabel("Rumah");
    } else {
      const match = addresses.find((a) => a.id === id);
      if (match) {
        setManualAddress(match.full_address);
        setAddressLabel(match.label);
        setCustomerPhone(match.phone);
        if (match.notes) setNotes(match.notes);
      }
    }
  };

  // Step validations
  const canGoToStep2 = Boolean(selectedService && housingType && roomCount && durationHours);
  const canGoToStep3 = Boolean(canGoToStep2);
  const canGoToStep4 = Boolean(canGoToStep3 && bookingDate && startTime);

  if (state.booking) {
    return (
      <section className="booking-success" aria-live="polite">
        <div className="booking-success-badge">
          <span className="booking-success-icon">✓</span>
          <p className="customer-overline">Pemesanan Terkirim</p>
        </div>
        <h2>Pesanan Anda Siap Kami Proses</h2>
        <p className="booking-success-intro">
          Terima kasih telah mempercayakan kebersihan ruang Anda kepada JoCleanCare. Tim admin kami sedang memeriksa ketersediaan staf untuk mengonfirmasi pesanan Anda.
        </p>

        <dl className="booking-success-details">
          <div>
            <dt>Nomor Booking</dt>
            <dd className="break-all font-mono">#{state.booking.id.slice(0, 8)}</dd>
          </div>
          <div>
            <dt>Layanan Utama</dt>
            <dd className="font-semibold">{state.booking.serviceName}</dd>
          </div>
          <div>
            <dt>Tanggal Layanan</dt>
            <dd>{formatBookingDate(state.booking.bookingDate)}</dd>
          </div>
          <div>
            <dt>Waktu Kunjungan</dt>
            <dd>{state.booking.startTime} WIB</dd>
          </div>
          <div>
            <dt>Total Estimasi</dt>
            <dd className="text-teal-800 font-bold">{formatRupiah(state.booking.totalPrice)}</dd>
          </div>
          <div>
            <dt>Status Awal</dt>
            <dd className="customer-status customer-status-pending">
              {bookingStatuses[state.booking.status] ?? state.booking.status}
            </dd>
          </div>
        </dl>

        <div className="booking-success-actions">
          <Link href={`/orders/${state.booking.id}`} className="customer-button customer-button-primary">
            Pantau Progres Pesanan <span aria-hidden="true">→</span>
          </Link>
          <Link href="/dashboard" className="customer-button customer-button-link">
            Kembali ke Dashboard
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="booking-wizard-container">
      {/* Wizard Progress Bar */}
      <nav aria-label="Langkah Pemesanan" className="wizard-stepper">
        {[
          { num: 1, title: "Layanan & Hunian" },
          { num: 2, title: "Layanan Ekstra" },
          { num: 3, title: "Jadwal Waktu" },
          { num: 4, title: "Alamat & Review" },
        ].map((step) => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;
          return (
            <button
              key={step.num}
              type="button"
              className={`wizard-step-tab ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
              onClick={() => {
                if (step.num < currentStep) setCurrentStep(step.num);
                if (step.num === 2 && canGoToStep2) setCurrentStep(2);
                if (step.num === 3 && canGoToStep3) setCurrentStep(3);
                if (step.num === 4 && canGoToStep4) setCurrentStep(4);
              }}
            >
              <span className="step-badge">{isDone ? "✓" : step.num}</span>
              <span className="step-label">{step.title}</span>
            </button>
          );
        })}
      </nav>

      <form action={formAction} className="booking-form-layout">
        <div className="booking-form-fields">
          {state.error && (
            <div className="customer-notice customer-notice-error" role="alert">
              <strong>Mohon periksa:</strong> {state.error}
            </div>
          )}

          {/* Hidden inputs to send to Server Action */}
          <input type="hidden" name="service_id" value={selectedService} />
          <input type="hidden" name="housing_type" value={housingType} />
          <input type="hidden" name="room_count" value={roomCount} />
          <input type="hidden" name="duration_hours" value={durationHours} />
          <input type="hidden" name="recurring_frequency" value={recurring} />
          <input type="hidden" name="booking_date" value={bookingDate} />
          <input type="hidden" name="start_time" value={startTime} />
          <input type="hidden" name="address" value={manualAddress} />
          <input type="hidden" name="address_label" value={addressLabel} />
          <input type="hidden" name="customer_phone" value={customerPhone} />
          <input type="hidden" name="notes" value={notes} />
          <input type="hidden" name="preferred_staff_id" value={preferredStaffId} />
          {saveAddress && <input type="hidden" name="save_address" value="on" />}
          {selectedAddOnIds.map((id) => (
            <input key={id} type="hidden" name="add_ons" value={id} />
          ))}

          {/* STEP 1: Layanan & Karakteristik Hunian */}
          {currentStep === 1 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 1 dari 4</span>
                <h2>Pilih Layanan & Tipe Hunian</h2>
              </legend>

              {/* Service Cards */}
              <div className="form-group-block">
                <label className="customer-field-label">Pilih Paket Layanan Utama</label>
                <div className="service-selection-grid">
                  {services.map((service) => {
                    const isSelected = selectedService === service.id;
                    return (
                      <div
                        key={service.id}
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => setSelectedService(service.id)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") setSelectedService(service.id);
                        }}
                        className={`selectable-card service-select-card ${isSelected ? "is-selected" : ""}`}
                      >
                        <div className="selectable-card-header">
                          <strong className="service-title">{service.name}</strong>
                          {service.badge && <span className="service-badge">{service.badge}</span>}
                        </div>
                        <p className="service-desc">{service.description || "Layanan kebersihan profesional."}</p>
                        <div className="service-meta-footer">
                          <span className="service-price">{formatRupiah(Number(service.price))}</span>
                          <span className="service-time">{service.duration_minutes} menit</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Housing Type */}
              <div className="form-group-block">
                <label className="customer-field-label">Tipe Tempat / Hunian</label>
                <div className="chip-selection-grid">
                  {(Object.entries(housingTypes) as [HousingType, { label: string; desc: string }][]).map(
                    ([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setHousingType(key)}
                        className={`chip-button ${housingType === key ? "is-selected" : ""}`}
                      >
                        <strong>{val.label}</strong>
                        <small>{val.desc}</small>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Room Count */}
              <div className="form-group-block">
                <label className="customer-field-label">Jumlah Kamar / Estimasi Luas</label>
                <div className="room-options-grid">
                  {roomOptions.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRoomCount(r.value)}
                      className={`chip-button chip-compact ${roomCount === r.value ? "is-selected" : ""}`}
                    >
                      <span>{r.label}</span>
                      <small>{r.estimate}</small>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="form-group-block">
                <label className="customer-field-label">Pilih Durasi Pengerjaan</label>
                <div className="duration-options-grid">
                  {durationOptions.map((opt) => (
                    <button
                      key={opt.hours}
                      type="button"
                      onClick={() => setDurationHours(opt.hours)}
                      className={`duration-card ${durationHours === opt.hours ? "is-selected" : ""}`}
                    >
                      <strong className="duration-hours">{opt.label}</strong>
                      <small className="duration-desc">{opt.desc}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className="wizard-nav-buttons">
                <button
                  type="button"
                  className="customer-button customer-button-primary"
                  disabled={!canGoToStep2}
                  onClick={() => setCurrentStep(2)}
                >
                  Lanjut ke Layanan Tambahan <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>
          )}

          {/* STEP 2: Add-ons & Recurring Preference */}
          {currentStep === 2 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 2 dari 4</span>
                <h2>Pilih Layanan Tambahan (Add-ons)</h2>
              </legend>
              <p className="wizard-intro-copy">
                Pilih perawatan ekstra yang diinginkan. Anda dapat memilih lebih dari satu add-on.
              </p>

              {/* Add-ons List */}
              <div className="addons-grid">
                {addOns.map((addon) => {
                  const isChecked = selectedAddOnIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className={`addon-card ${isChecked ? "is-checked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleAddOn(addon.id)}
                        className="addon-checkbox"
                      />
                      <div className="addon-content">
                        <div className="addon-head">
                          <strong>{addon.name}</strong>
                          <span className="addon-price">+{formatRupiah(Number(addon.price))}</span>
                        </div>
                        <p className="addon-desc">{addon.description}</p>
                        <span className="addon-dur">Est. +{addon.duration_minutes} menit</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Recurring Cleaning Option */}
              <div className="form-group-block recurring-block">
                <label className="customer-field-label">Frekuensi Pembersihan</label>
                <p className="recurring-sub">
                  Pilih paket langganan rutin untuk rumah selalu terawat dengan potongan harga khusus.
                </p>
                <div className="recurring-grid">
                  {(Object.entries(recurringOptions) as [RecurringFrequency, typeof recurringOptions[RecurringFrequency]][]).map(
                    ([freq, config]) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setRecurring(freq)}
                        className={`chip-button recurring-chip ${recurring === freq ? "is-selected" : ""}`}
                      >
                        <div className="recurring-header">
                          <strong>{config.label}</strong>
                          {config.discountBadge && (
                            <span className="discount-tag">{config.discountBadge}</span>
                          )}
                        </div>
                        <small>{config.desc}</small>
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="wizard-nav-buttons">
                <button
                  type="button"
                  className="customer-button customer-button-link"
                  onClick={() => setCurrentStep(1)}
                >
                  <span aria-hidden="true">←</span> Kembali
                </button>
                <button
                  type="button"
                  className="customer-button customer-button-primary"
                  onClick={() => setCurrentStep(3)}
                >
                  Lanjut ke Pilih Jadwal <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>
          )}

          {/* STEP 3: Jadwal & Waktu */}
          {currentStep === 3 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 3 dari 4</span>
                <h2>Pilih Tanggal & Jam Kunjungan</h2>
              </legend>

              <div className="schedule-step-grid">
                <div className="form-group-block">
                  <label className="customer-field-label">
                    Tanggal Pembersihan
                    <input
                      type="date"
                      min={today}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                      className="customer-field"
                    />
                  </label>
                  <p className="field-hint">Pemesanan dapat dilakukan mulai hari ini atau hari kerja berikutnya.</p>
                </div>

                <div className="form-group-block">
                  <label className="customer-field-label">Pilih Jam Mulai (WIB)</label>
                  <div className="time-slots-grid">
                    {standardTimeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setStartTime(slot)}
                        className={`time-slot-chip ${startTime === slot ? "is-selected" : ""}`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                  <p className="field-hint">Jam operasional: 08:00 – 17:00 WIB.</p>
                </div>
              </div>

              {/* Preferred cleaner if customer has favorites */}
              {favoriteCleaners.length > 0 && (
                <div className="form-group-block">
                  <label className="customer-field-label">Pilih Petugas Favorit (Opsional)</label>
                  <select
                    value={preferredStaffId}
                    onChange={(e) => setPreferredStaffId(e.target.value)}
                    className="customer-field"
                  >
                    <option value="">Biarkan Admin Menentukan yang Terbaik</option>
                    {favoriteCleaners.map((fav) => (
                      <option key={fav.staff_id} value={fav.staff_id}>
                        {fav.profiles?.name || "Petugas Favorit"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="wizard-nav-buttons">
                <button
                  type="button"
                  className="customer-button customer-button-link"
                  onClick={() => setCurrentStep(2)}
                >
                  <span aria-hidden="true">←</span> Kembali
                </button>
                <button
                  type="button"
                  className="customer-button customer-button-primary"
                  disabled={!bookingDate || !startTime}
                  onClick={() => setCurrentStep(4)}
                >
                  Lanjut ke Alamat & Review <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>
          )}

          {/* STEP 4: Alamat, Catatan, Review & Konfirmasi */}
          {currentStep === 4 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 4 dari 4</span>
                <h2>Alamat Layanan & Konfirmasi</h2>
              </legend>

              {/* Saved addresses picker */}
              {addresses.length > 0 && (
                <div className="form-group-block">
                  <label className="customer-field-label">Pilih Alamat Tersimpan</label>
                  <div className="saved-address-grid">
                    {addresses.map((addr) => (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => handleSelectSavedAddress(addr.id)}
                        className={`saved-addr-card ${selectedAddressId === addr.id ? "is-selected" : ""}`}
                      >
                        <strong>{addr.label}</strong>
                        <p>{addr.full_address}</p>
                        <small>Telp: {addr.phone}</small>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleSelectSavedAddress("manual")}
                      className={`saved-addr-card ${selectedAddressId === "manual" ? "is-selected" : ""}`}
                    >
                      <strong>+ Alamat Baru</strong>
                      <p>Tulis alamat baru secara manual</p>
                    </button>
                  </div>
                </div>
              )}

              {/* Address detail inputs */}
              <div className="address-inputs-grid">
                <label className="customer-field-label">
                  Nama Label Alamat
                  <input
                    type="text"
                    value={addressLabel}
                    onChange={(e) => setAddressLabel(e.target.value)}
                    placeholder="Contoh: Rumah Tinggal, Apartemen Sudirman, Kantor"
                    className="customer-field"
                    required
                  />
                </label>

                <label className="customer-field-label">
                  Nomor Telepon / WhatsApp Aktif
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Contoh: 081234567890"
                    className="customer-field"
                    required
                  />
                </label>

                <label className="customer-field-label full-width">
                  Alamat Lengkap
                  <textarea
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah/unit, RT/RW, kecamatan, kota, patokan lokasi"
                    minLength={8}
                    maxLength={500}
                    className="customer-field customer-textarea"
                    required
                  />
                </label>

                <label className="customer-field-label full-width">
                  Instruksi Khusus untuk Petugas <span className="field-optional">Opsional</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Gunakan cairan pembersih non-aroma, masuk lewat pintu belakang samping garasi, ada hewan peliharaan di dalam kandang"
                    maxLength={1000}
                    className="customer-field customer-textarea customer-notes"
                  />
                </label>

                {selectedAddressId === "manual" && (
                  <label className="save-address-checkbox">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) => setSaveAddress(e.target.checked)}
                    />
                    <span>Simpan alamat ini ke buku alamat saya untuk pemesanan berikutnya</span>
                  </label>
                )}
              </div>

              {/* Review Order Summary Box before Submit */}
              <div className="order-final-review-card">
                <h3>Tinjauan Akhir Pesanan</h3>
                <dl className="review-list">
                  <div>
                    <dt>Paket Layanan</dt>
                    <dd>{activeServiceObj?.name} ({housingTypes[housingType]?.label})</dd>
                  </div>
                  <div>
                    <dt>Durasi & Ruangan</dt>
                    <dd>{durationHours} Jam · {roomOptions.find((r) => r.value === roomCount)?.label}</dd>
                  </div>
                  <div>
                    <dt>Layanan Tambahan</dt>
                    <dd>
                      {selectedAddOnObjs.length > 0
                        ? selectedAddOnObjs.map((a) => a.name).join(", ")
                        : "Tidak ada"}
                    </dd>
                  </div>
                  <div>
                    <dt>Jadwal Kedatangan</dt>
                    <dd>{bookingDate ? formatBookingDate(bookingDate) : "-"} pukul {startTime} WIB</dd>
                  </div>
                  <div>
                    <dt>Frekuensi</dt>
                    <dd>{recurringOptions[recurring]?.label}</dd>
                  </div>
                </dl>
              </div>

              <div className="wizard-nav-buttons">
                <button
                  type="button"
                  className="customer-button customer-button-link"
                  onClick={() => setCurrentStep(3)}
                >
                  <span aria-hidden="true">←</span> Kembali
                </button>
                <button
                  type="submit"
                  disabled={pending || !manualAddress || manualAddress.length < 8}
                  className="customer-button customer-button-primary booking-submit-btn"
                >
                  {pending ? "Memproses Pemesanan…" : "Konfirmasi & Buat Pesanan"}
                </button>
              </div>
            </fieldset>
          )}
        </div>

        {/* Sticky Price Breakdown Aside (Section 19: Price Estimation) */}
        <aside className="booking-summary" aria-label="Rincian Biaya Pemesanan">
          <p className="customer-overline">Rincian Biaya</p>
          <div className="summary-service-title">{activeServiceObj?.name}</div>
          <p className="booking-summary-description">
            {activeServiceObj?.description || "Layanan kebersihan profesional bergaransi."}
          </p>

          <div className="summary-breakdown-table">
            <div className="summary-row">
              <span>Layanan ({durationHours} jam)</span>
              <strong>{formatRupiah(pricing.basePrice)}</strong>
            </div>

            {selectedAddOnObjs.map((addon) => (
              <div key={addon.id} className="summary-row summary-addon-row">
                <span>+ {addon.name}</span>
                <strong>{formatRupiah(Number(addon.price))}</strong>
              </div>
            ))}

            <div className="summary-row summary-subtotal-row">
              <span>Subtotal</span>
              <span>{formatRupiah(pricing.subtotal)}</span>
            </div>

            {pricing.discountAmount > 0 && (
              <div className="summary-row summary-discount-row">
                <span>Diskon Langganan ({pricing.discountLabel})</span>
                <span className="discount-value">-{formatRupiah(pricing.discountAmount)}</span>
              </div>
            )}

            <div className="summary-row summary-total-row">
              <strong>Total Pembayaran</strong>
              <strong className="summary-total-price">{formatRupiah(pricing.totalPrice)}</strong>
            </div>
          </div>

          <div className="summary-trust-points">
            <div>
              <span className="trust-check">✓</span>
              <small>Harga transparan server-side tanpa biaya tersembunyi</small>
            </div>
            <div>
              <span className="trust-check">✓</span>
              <small>Peralatan & cairan sanitasi higienis standar JoCleanCare</small>
            </div>
            <div>
              <span className="trust-check">✓</span>
              <small>Garansi pembersihan ulang jika tidak sesuai standar</small>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
