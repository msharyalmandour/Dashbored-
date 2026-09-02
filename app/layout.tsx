import type { Metadata } from "next";
import { Unbounded, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jbMono = JetBrains_Mono({
  variable: "--font-jbmono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VELOCITÀ — The Automotive Discovery Platform",
  description:
    "Some people see a car. Others feel something. Discover, compare, and find the car that feels like you.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${manrope.variable} ${jbMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-text font-body">
        {children}
      </body>
    </html>
  );
}
