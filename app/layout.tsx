import type { Metadata } from "next";
import { Cairo, Tajawal, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800", "900"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "900"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "دِقّة — قطع غيار سيارات مدعومة بالذكاء الاصطناعي",
  description:
    "منصة دِقّة لبيع قطع غيار السيارات في السعودية. افحص سيارتك برقم الشاصي أو صورة، واكتشف القطع المتوافقة معها.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text font-body">
        {children}
      </body>
    </html>
  );
}
