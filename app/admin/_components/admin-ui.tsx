import Link from "next/link";

export const statusLabels: Record<string, string> = {
  pending: "Menunggu konfirmasi", confirmed: "Dikonfirmasi", assigned: "Petugas ditugaskan",
  in_progress: "Sedang dikerjakan", completed: "Selesai", cancelled: "Dibatalkan",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`admin-status admin-status-${status}`}>{statusLabels[status] ?? status}</span>;
}

export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="admin-heading"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function Feedback({ success, error }: { success?: string | string[]; error?: string | string[] }) {
  const errorText = Array.isArray(error) ? error[0] : error;
  const successText = Array.isArray(success) ? success[0] : success;
  if (errorText) return <p role="alert" className="admin-feedback admin-feedback-error">{errorText}</p>;
  if (successText) return <p role="status" className="admin-feedback admin-feedback-success">{successText}</p>;
  return null;
}

export function EmptyState({ title, description, href, linkLabel }: { title: string; description: string; href?: string; linkLabel?: string }) {
  return <div className="admin-empty"><span aria-hidden="true" className="admin-empty-mark">JC</span><h2>{title}</h2><p>{description}</p>{href && linkLabel && <Link className="admin-button admin-button-primary" href={href}>{linkLabel}</Link>}</div>;
}

export function formatMoney(value: number | string | null) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

export function formatTime(value: string) { return value.slice(0, 5); }
