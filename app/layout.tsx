import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JoCleanCare | Jasa Kebersihan Profesional",
  description:
    "Pesan layanan kebersihan profesional untuk rumah, kantor, sofa, dan berbagai kebutuhan Anda bersama JoCleanCare.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
