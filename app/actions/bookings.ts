"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "../../lib/auth/session";
import { getActiveServices, jakartaToday } from "../../lib/bookings";

export type BookingFormState = {
  error?: string;
  booking?: {
    id: string;
    serviceName: string;
    bookingDate: string;
    startTime: string;
    totalPrice: number;
    status: string;
  };
};

export async function createBooking(
  _previousState: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const current = await requireRole(["customer"]);
  const serviceId = String(formData.get("service_id") ?? "").trim();
  const bookingDate = String(formData.get("booking_date") ?? "").trim();
  const startTime = String(formData.get("start_time") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!serviceId) return { error: "Silakan pilih layanan terlebih dahulu." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate) || bookingDate < jakartaToday()) {
    return { error: "Pilih tanggal layanan hari ini atau setelahnya." };
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    return { error: "Pilih waktu mulai yang valid." };
  }
  if (address.length < 8 || address.length > 500) {
    return { error: "Alamat wajib diisi (8–500 karakter)." };
  }
  if (notes.length > 1000) return { error: "Catatan maksimal 1.000 karakter." };

  const { data: services, error: serviceError } = await getActiveServices(current.supabase);
  if (serviceError) return { error: "Layanan belum dapat dimuat. Coba beberapa saat lagi." };
  const service = (services as Array<{ id: string; name: string; price: number }> | null)
    ?.find((item) => item.id === serviceId);
  if (!service) return { error: "Layanan tidak tersedia. Silakan pilih layanan aktif." };

  const { data, error } = await current.supabase
    .from("bookings")
    .insert({
      customer_id: current.user.id,
      service_id: service.id,
      booking_date: bookingDate,
      start_time: startTime,
      address,
      notes: notes || null,
      total_price: service.price,
      status: "pending",
    })
    .select("id, booking_date, start_time, total_price, status")
    .single();

  if (error || !data) return { error: "Booking belum berhasil dibuat. Periksa data lalu coba lagi." };
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  return {
    booking: {
      id: data.id,
      serviceName: service.name,
      bookingDate: data.booking_date,
      startTime: String(data.start_time).slice(0, 5),
      totalPrice: Number(data.total_price),
      status: data.status,
    },
  };
}
