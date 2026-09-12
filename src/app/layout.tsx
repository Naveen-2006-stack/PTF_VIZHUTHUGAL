import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PTF Vizhuthugal Student Portal | Puthiya Thalaimurai Foundation",
  description: "“VIZHUTHUGAL - Building Students' Personality Through Social Service” - Institutional Student Management Platform for SRM KTR, SRM BAB, and SRM AP.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logos/ptf_vizhuthugal_logo.svg",
    apple: "/logos/ptf_vizhuthugal_logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A192F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable} h-full`} suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-[#1E293B]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
