"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import {
  checkAvailableSlotsAction,
  createBooking,
  type BookingFormState,
} from "../actions/bookings";
import {
  bookingStatuses,
  calculateServerPriceBreakdown,
  cleaningRoomOptions,
  durationOptions,
  formatBookingDate,
  formatRupiah,
  housingTypes,
  recurringOptions,
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

  // 5 Step Progressive Disclosure:
  // Step 1: Pilih Layanan & Tipe Hunian (Tahap 2, 4)
  // Step 2: Pilih Ruangan & Durasi (Tahap 5, 6)
  // Step 3: Pilih Layanan Tambahan (Add-ons) & Paket Rutin (Tahap 7, 21)
  // Step 4: Pilih Tanggal & Jam dengan Ketersediaan Staff Riil (Tahap 10)
  // Step 5: Alamat, Catatan, Tinjauan Akhir & Konfirmasi (Tahap 9, 11, 12)
  const [currentStep, setCurrentStep] = useState(1);

  // Form states
  const [selectedService, setSelectedService] = useState(selectedServiceId || services[0]?.id || "");
  const [housingType, setHousingType] = useState<HousingType>("rumah");
  const [selectedRooms, setSelectedRooms] = useState<string[]>([
    "Ruang tamu",
    "Kamar tidur",
    "Kamar mandi",
  ]);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [recurring, setRecurring] = useState<RecurringFrequency>("one_time");

  const [bookingDate, setBookingDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [slotAvailability, setSlotAvailability] = useState<
    Record<string, { isAvailable: boolean; busyStaff: number }>
  >({});
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id || "manual");
  const [manualAddress, setManualAddress] = useState(addresses[0]?.full_address || "");
  const [addressLabel, setAddressLabel] = useState(addresses[0]?.label || "Rumah");
  const [customerPhone, setCustomerPhone] = useState(addresses[0]?.phone || customerProfile?.phone || "");
  const [notes, setNotes] = useState("");
  const [saveAddress, setSaveAddress] = useState(false);
  const [preferredStaffId, setPreferredStaffId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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

  const handleToggleRoom = (roomName: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomName)
        ? prev.filter((r) => r !== roomName)
        : [...prev, roomName]
    );
  };

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

  const handleDateChange = async (dateVal: string) => {
    setBookingDate(dateVal);
    setFieldErrors((prev) => ({ ...prev, bookingDate: "" }));
    if (dateVal) {
      setLoadingSlots(true);
      try {
        const res = await checkAvailableSlotsAction(dateVal);
        setSlotAvailability(res.slots || {});
        if (res.slots && res.slots[startTime] && !res.slots[startTime].isAvailable) {
          const firstAvail = standardTimeSlots.find((s) => res.slots[s]?.isAvailable);
          if (firstAvail) setStartTime(firstAvail);
        }
      } catch {
        // Fallback gracefully
      } finally {
        setLoadingSlots(false);
      }
    }
  };

  const validateStep4 = () => {
    const errors: Record<string, string> = {};
    if (!bookingDate) {
      errors.bookingDate = "Pilih tanggal pembersihan terlebih dahulu.";
    }
    if (!startTime) {
      errors.startTime = "Pilih jam mulai kunjungan terlebih dahulu.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep4Next = () => {
    if (validateStep4()) {
      setCurrentStep(5);
    }
  };

  const validateStep5 = () => {
    const errors: Record<string, string> = {};
    if (!addressLabel.trim()) {
      errors.addressLabel = "Label alamat wajib diisi (misal: Rumah, Apartemen, Kantor).";
    }
    if (!customerPhone.trim()) {
      errors.customerPhone = "Nomor telepon aktif wajib diisi.";
    } else if (!/^[0-9+() -]{9,18}$/.test(customerPhone.trim())) {
      errors.customerPhone = "Nomor telepon tidak valid (minimal 9 digit).";
    }
    if (!manualAddress.trim()) {
      errors.manualAddress = "Alamat lengkap wajib diisi.";
    } else if (manualAddress.trim().length < 8) {
      errors.manualAddress = "Alamat terlalu singkat, tuliskan minimal 8 karakter dengan patokan.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!validateStep5()) {
      e.preventDefault();
    }
  };

  // Step validations
  const canGoToStep2 = Boolean(selectedService && housingType);
  const canGoToStep3 = Boolean(canGoToStep2 && selectedRooms.length > 0 && durationHours);
  const canGoToStep4 = Boolean(canGoToStep3);
  const canGoToStep5 = Boolean(canGoToStep4 && bookingDate && startTime);

  // TAHAP 13 — KONFIRMASI BOOKING SUCCESS SCREEN
  if (state.booking) {
    const bookingCode = `JC-${state.booking.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const startParts = (state.booking.startTime || "09:00").split(":").map(Number);
    const dur = state.booking.durationHours || 2;
    const endHour = String((startParts[0] + dur) % 24).padStart(2, "0");
    const endMinute = String(startParts[1] || 0).padStart(2, "0");
    const timeFormatted = `${state.booking.startTime}–${endHour}:${endMinute} WIB`;

    return (
      <section className="booking-success" aria-live="polite">
        <div className="booking-success-badge">
          <span className="booking-success-icon">✓</span>
          <p className="customer-overline">Konfirmasi Booking</p>
        </div>
        <h2>Booking berhasil!</h2>
        <p className="booking-success-intro">
          Pesanan Anda telah diterima dalam sistem JoCleanCare dan sedang diproses oleh tim operasional kami.
        </p>

        <dl className="booking-success-details">
          <div>
            <dt>Nomor Booking</dt>
            <dd className="font-mono font-bold text-teal-800 text-base">{bookingCode}</dd>
          </div>
          <div>
            <dt>Layanan</dt>
            <dd className="font-semibold">{state.booking.serviceName}</dd>
          </div>
          <div>
            <dt>Tanggal</dt>
            <dd>{formatBookingDate(state.booking.bookingDate)}</dd>
          </div>
          <div>
            <dt>Jam</dt>
            <dd>{timeFormatted}</dd>
          </div>
          {state.booking.address && (
            <div className="fact-full-width">
              <dt>Alamat</dt>
              <dd>{state.booking.address}</dd>
            </div>
          )}
          <div>
            <dt>Total</dt>
            <dd className="text-teal-800 font-bold text-lg">{formatRupiah(state.booking.totalPrice)}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd className="customer-status customer-status-pending">
              {bookingStatuses[state.booking.status] ?? "Menunggu konfirmasi"}
            </dd>
          </div>
        </dl>

        <div className="booking-success-actions">
          <Link href={`/orders/${state.booking.id}`} className="customer-button customer-button-primary">
            Lihat Pesanan <span aria-hidden="true">→</span>
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
          { num: 2, title: "Ruangan & Durasi" },
          { num: 3, title: "Add-ons" },
          { num: 4, title: "Jadwal & Jam" },
          { num: 5, title: "Alamat & Konfirmasi" },
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
                if (step.num === 5 && canGoToStep5) setCurrentStep(5);
              }}
            >
              <span className="step-badge">{isDone ? "✓" : step.num}</span>
              <span className="step-label">{step.title}</span>
            </button>
          );
        })}
      </nav>

      <form action={formAction} noValidate onSubmit={handleFormSubmit} className="booking-form-layout">
        <div className="booking-form-fields">
          {state.error && (
            <div className="customer-notice customer-notice-error" role="alert">
              <strong>Mohon periksa:</strong> {state.error}
            </div>
          )}

          {/* Hidden inputs sent to Server Action */}
          <input type="hidden" name="service_id" value={selectedService} />
          <input type="hidden" name="housing_type" value={housingType} />
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
          {selectedRooms.map((r) => (
            <input key={r} type="hidden" name="rooms" value={r} />
          ))}
          <input type="hidden" name="room_count" value={selectedRooms.join(", ")} />
          {selectedAddOnIds.map((id) => (
            <input key={id} type="hidden" name="add_ons" value={id} />
          ))}

          {/* STEP 1: Pilih Layanan & Tipe Hunian */}
          {currentStep === 1 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 1 dari 5</span>
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
                          <span className="service-time">~{service.duration_minutes} menit</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Housing Type (Tahap 4 Spec) */}
              <div className="form-group-block">
                <label className="customer-field-label">Tipe Hunian / Bangunan</label>
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

              <div className="wizard-nav-buttons">
                <button
                  type="button"
                  className="customer-button customer-button-primary"
                  disabled={!canGoToStep2}
                  onClick={() => setCurrentStep(2)}
                >
                  Lanjut ke Pilih Ruangan & Durasi <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>
          )}

          {/* STEP 2: Pilih Ruangan & Durasi (Tahap 5 & 6 Spec) */}
          {currentStep === 2 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 2 dari 5</span>
                <h2>Pilih Ruangan & Durasi Pembersihan</h2>
              </legend>

              {/* Multi-Select Room Options (Tahap 5 Spec) */}
              <div className="form-group-block">
                <label className="customer-field-label">
                  Ruang yang Ingin Dibersihkan <small>(Bisa pilih beberapa sekaligus)</small>
                </label>
                <div className="rooms-checklist-grid">
                  {cleaningRoomOptions.map((room) => {
                    const isChecked = selectedRooms.includes(room.id);
                    return (
                      <label
                        key={room.id}
                        className={`room-checkbox-card ${isChecked ? "is-checked" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRoom(room.id)}
                          className="room-input-checkbox"
                        />
                        <div className="room-checkbox-info">
                          <strong>{room.label}</strong>
                          <small>{room.desc}</small>
                        </div>
                      </label>
                    );
                  })}
                </div>
                {selectedRooms.length === 0 && (
                  <p className="field-hint text-amber-700">Pilih minimal 1 area ruangan yang ingin dibersihkan.</p>
                )}
              </div>

              {/* Duration Options (Tahap 6 Spec) */}
              <div className="form-group-block">
                <label className="customer-field-label">Pilih Durasi Waktu Pembersihan</label>
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
                <p className="field-hint">Durasi dapat disesuaikan dengan luas dan tingkat kekotoran ruangan.</p>
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
                  disabled={selectedRooms.length === 0}
                  onClick={() => setCurrentStep(3)}
                >
                  Lanjut ke Layanan Tambahan (Add-on) <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>
          )}

          {/* STEP 3: Add-ons & Recurring Preference (Tahap 7 & 21 Spec) */}
          {currentStep === 3 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 3 dari 5</span>
                <h2>Pilih Layanan Tambahan (Add-ons)</h2>
              </legend>
              <p className="wizard-intro-copy">
                Lengkapi pembersihan dengan pengerjaan khusus. Anda dapat memilih lebih dari satu add-on.
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

              {/* Recurring Option */}
              <div className="form-group-block recurring-block">
                <label className="customer-field-label">Frekuensi Pembersihan</label>
                <p className="recurring-sub">
                  Dapatkan potongan harga khusus untuk hunian selalu bersih dengan paket langganan rutin.
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
                  onClick={() => setCurrentStep(2)}
                >
                  <span aria-hidden="true">←</span> Kembali
                </button>
                <button
                  type="button"
                  className="customer-button customer-button-primary"
                  onClick={() => setCurrentStep(4)}
                >
                  Lanjut ke Jadwal & Jam <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>
          )}

          {/* STEP 4: Tanggal & Jam dengan Ketersediaan Staff Riil (Tahap 10 Spec) */}
          {currentStep === 4 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 4 dari 5</span>
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
                      onChange={(e) => handleDateChange(e.target.value)}
                      aria-invalid={Boolean(fieldErrors.bookingDate)}
                      aria-describedby={fieldErrors.bookingDate ? "bookingDate-error" : undefined}
                      className={`customer-field ${fieldErrors.bookingDate ? "customer-field-error" : ""}`}
                    />
                  </label>
                  {fieldErrors.bookingDate && (
                    <p id="bookingDate-error" className="field-error-text" role="alert">
                      ⚠️ {fieldErrors.bookingDate}
                    </p>
                  )}
                  <p className="field-hint">Pemesanan tersedia mulai hari ini atau hari kerja berikutnya.</p>
                </div>

                <div className="form-group-block">
                  <div className="flex items-center justify-between">
                    <label className="customer-field-label">Pilih Jam Mulai (WIB)</label>
                    {loadingSlots && <small className="text-teal-700">Memeriksa ketersediaan…</small>}
                  </div>

                  <div className="time-slots-grid">
                    {standardTimeSlots.map((slot) => {
                      const slotInfo = slotAvailability[slot];
                      const isAvail = slotInfo ? slotInfo.isAvailable : true;
                      const isSelected = startTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={!isAvail}
                          onClick={() => {
                            setStartTime(slot);
                            setFieldErrors((prev) => ({ ...prev, startTime: "" }));
                          }}
                          className={`time-slot-chip ${isSelected ? "is-selected" : ""} ${!isAvail ? "is-slot-full" : ""}`}
                        >
                          <span className="slot-hour">{slot}</span>
                          <span className={`slot-status-pill ${isAvail ? "is-available" : "is-full"}`}>
                            {isAvail ? "Tersedia" : "Penuh"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {fieldErrors.startTime && (
                    <p id="startTime-error" className="field-error-text" role="alert">
                      ⚠️ {fieldErrors.startTime}
                    </p>
                  )}
                  <p className="field-hint">Jam operasional standar: 08:00 – 17:00 WIB.</p>
                </div>
              </div>

              {/* Preferred cleaner if customer has favorites (Tahap 16 & 17 Spec) */}
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
                  onClick={() => setCurrentStep(3)}
                >
                  <span aria-hidden="true">←</span> Kembali
                </button>
                <button
                  type="button"
                  className="customer-button customer-button-primary"
                  onClick={handleStep4Next}
                >
                  Lanjut ke Alamat & Review <span aria-hidden="true">→</span>
                </button>
              </div>
            </fieldset>
          )}

          {/* STEP 5: Alamat, Catatan Petugas & Tinjauan Akhir (Tahap 9, 11, 12 Spec) */}
          {currentStep === 5 && (
            <fieldset className="wizard-step-section">
              <legend className="wizard-section-title">
                <span>Langkah 5 dari 5</span>
                <h2>Alamat Layanan, Catatan & Konfirmasi</h2>
              </legend>

              {/* Saved addresses picker (Tahap 9 Spec) */}
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
                    onChange={(e) => {
                      setAddressLabel(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, addressLabel: "" }));
                    }}
                    placeholder="Contoh: Rumah Tinggal, Apartemen Sudirman, Kantor"
                    className={`customer-field ${fieldErrors.addressLabel ? "customer-field-error" : ""}`}
                    aria-invalid={Boolean(fieldErrors.addressLabel)}
                    aria-describedby={fieldErrors.addressLabel ? "addressLabel-error" : undefined}
                  />
                  {fieldErrors.addressLabel && (
                    <p id="addressLabel-error" className="field-error-text" role="alert">
                      ⚠️ {fieldErrors.addressLabel}
                    </p>
                  )}
                </label>

                <label className="customer-field-label">
                  Nomor Telepon / WhatsApp Aktif
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, customerPhone: "" }));
                    }}
                    placeholder="Contoh: 081234567890"
                    className={`customer-field ${fieldErrors.customerPhone ? "customer-field-error" : ""}`}
                    aria-invalid={Boolean(fieldErrors.customerPhone)}
                    aria-describedby={fieldErrors.customerPhone ? "customerPhone-error" : undefined}
                  />
                  {fieldErrors.customerPhone && (
                    <p id="customerPhone-error" className="field-error-text" role="alert">
                      ⚠️ {fieldErrors.customerPhone}
                    </p>
                  )}
                </label>

                <label className="customer-field-label full-width">
                  Alamat Lengkap
                  <textarea
                    value={manualAddress}
                    onChange={(e) => {
                      setManualAddress(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, manualAddress: "" }));
                    }}
                    placeholder="Nama jalan, nomor rumah/unit, RT/RW, kelurahan, kecamatan, kota, patokan lokasi"
                    minLength={8}
                    maxLength={500}
                    className={`customer-field customer-textarea ${fieldErrors.manualAddress ? "customer-field-error" : ""}`}
                    aria-invalid={Boolean(fieldErrors.manualAddress)}
                    aria-describedby={fieldErrors.manualAddress ? "manualAddress-error" : undefined}
                  />
                  {fieldErrors.manualAddress && (
                    <p id="manualAddress-error" className="field-error-text" role="alert">
                      ⚠️ {fieldErrors.manualAddress}
                    </p>
                  )}
                </label>

                {/* Catatan untuk cleaner (Tahap 11 Spec) */}
                <label className="customer-field-label full-width">
                  Catatan untuk Petugas <span className="field-optional">Opsional (Maks. 1.000 karakter)</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: Masuk melalui pintu samping garasi. Ada hewan peliharaan di rumah. Hubungi saya sebelum datang."
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

              {/* Review Pesanan (Tahap 12 Spec) */}
              <div className="order-final-review-card">
                <h3>Tinjauan Lengkap Pesanan</h3>
                <dl className="review-list">
                  <div>
                    <dt>Layanan</dt>
                    <dd>{activeServiceObj?.name}</dd>
                  </div>
                  <div>
                    <dt>Tipe Hunian</dt>
                    <dd>{housingTypes[housingType]?.label}</dd>
                  </div>
                  <div>
                    <dt>Ruangan yang Dibersihkan</dt>
                    <dd>{selectedRooms.length > 0 ? selectedRooms.join(", ") : "Belum dipilih"}</dd>
                  </div>
                  <div>
                    <dt>Durasi</dt>
                    <dd>{durationHours} Jam</dd>
                  </div>
                  <div>
                    <dt>Layanan Tambahan (Add-on)</dt>
                    <dd>
                      {selectedAddOnObjs.length > 0
                        ? selectedAddOnObjs.map((a) => `${a.name} (+${formatRupiah(Number(a.price))})`).join(", ")
                        : "Tidak ada"}
                    </dd>
                  </div>
                  <div>
                    <dt>Alamat Layanan</dt>
                    <dd>{manualAddress || "-"}</dd>
                  </div>
                  <div>
                    <dt>Tanggal</dt>
                    <dd>{bookingDate ? formatBookingDate(bookingDate) : "-"}</dd>
                  </div>
                  <div>
                    <dt>Jam</dt>
                    <dd>{startTime} WIB</dd>
                  </div>
                  {notes && (
                    <div className="fact-full-width">
                      <dt>Catatan Petugas</dt>
                      <dd>&ldquo;{notes}&rdquo;</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="wizard-nav-buttons">
                <button
                  type="button"
                  className="customer-button customer-button-link"
                  onClick={() => setCurrentStep(4)}
                >
                  <span aria-hidden="true">←</span> Kembali
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="customer-button customer-button-primary booking-submit-btn flex items-center justify-center gap-2"
                >
                  {pending ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                      <span>Memproses Pemesanan…</span>
                    </>
                  ) : (
                    "Konfirmasi Booking"
                  )}
                </button>
              </div>
            </fieldset>
          )}
        </div>

        {/* Sticky Price Breakdown Aside (Tahap 8: Perhitungan Harga Aman) */}
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
              <small>Harga transparan server-side tanpa biaya siluman</small>
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
