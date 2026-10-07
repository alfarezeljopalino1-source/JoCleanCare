import Link from "next/link";
import { requireRole } from "../../../lib/auth/session";
import { EmptyState, Feedback, formatDate, formatTime, PageHeading, StatusBadge } from "../_components/admin-ui";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const { supabase } = await requireRole(["admin"]);
  const [{ data: staffData, error }, { data: scheduleData }] = await Promise.all([
    supabase.from("profiles").select("id, name, email, phone").eq("role", "staff").order("name"),
    supabase.from("staff_schedules").select("id, staff_id, booking_id, scheduled_date, start_time, end_time, status, booking:bookings(status, service:services(name), customer:profiles!bookings_customer_id_fkey(name))").neq("status", "cancelled").order("scheduled_date"),
  ]);
  const schedules = (scheduleData ?? []) as unknown as Array<{ id: string; staff_id: string; booking_id: string; scheduled_date: string; start_time: string; end_time: string | null; status: string; booking: { status: string; service: { name: string } | null; customer: { name: string } | null } | null }>;
  const staff = staffData ?? [];
  return <>
    <PageHeading eyebrow="Tim operasional" title="Petugas" description="Daftar profile dengan role staff dan pekerjaan aktif. Pembuatan akun petugas dilakukan melalui proses onboarding yang aman di luar panel ini." />
    {error ? <Feedback error="Data petugas belum dapat dimuat. Coba lagi nanti." /> : staff.length === 0 ? <EmptyState title="Belum ada petugas terdaftar" description="Akun dengan role staff akan muncul di sini setelah disiapkan oleh administrator sistem." /> : <div className="admin-staff-grid">{staff.map((person) => {
      const jobs = schedules.filter((item) => item.staff_id === person.id && !["completed", "cancelled"].includes(item.status));
      const recent = schedules.filter((item) => item.staff_id === person.id).slice(0, 3);
      return <article className="admin-card admin-staff-card" key={person.id}><div className="admin-staff-person"><span className="admin-avatar" aria-hidden="true">{person.name.split(/\s+/).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase()}</span><div><h2>{person.name}</h2><p>{person.email ?? "Email tidak tersedia"}</p>{person.phone && <p>{person.phone}</p>}</div></div><div className="admin-staff-workload"><span><strong>{jobs.length}</strong> pekerjaan aktif</span><Link href="/admin/schedules" className="admin-row-link">Lihat jadwal</Link></div>{recent.length > 0 && <div className="admin-staff-jobs">{recent.map((job) => <div key={job.id}><div><strong>{job.booking?.service?.name ?? "Layanan"}</strong><span>{job.booking?.customer?.name ?? "Customer"} · {formatDate(job.scheduled_date)} · {formatTime(job.start_time)}</span></div><StatusBadge status={job.status} /></div>)}</div>}</article>;
    })}</div>}
  </>;
}
