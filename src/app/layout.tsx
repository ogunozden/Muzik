/**
 * Root Layout - Optimized with next/font
 */

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Muzik - Türk Müziği Platformu",
    template: "%s | Muzik",
  },
  description: "Türk müziği için kapsamlı nota, usül ve makam çalma platformu.",
  keywords: ["Türk müziği", "makam", "usül", "nota", "piyano", "müzik eğitimi"],
  authors: [{ name: "Muzik Team" }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://muzik.app",
    siteName: "Muzik",
    title: "Muzik - Türk Müziği Platformu",
    description: "Türk müziği için kapsamlı nota, usül ve makam çalma platformu",
  },
  twitter: {
    card: "summary_large_image",
    title: "Muzik - Türk Müziği Platformu",
    description: "Türk müziği için kapsamlı nota, usül ve makam çalma platformu",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#8B5A2B",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
