import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import { PointerPressFeedback } from "@/components/ui/pointer-press-feedback";

import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bloodwork — Marek Nevole",
  description:
    "A public dashboard for tracking personal blood work over time. Better decisions come from better data — structured lab results, supplements, and health metrics, all in one place and open for anyone to learn from.",
  metadataBase: new URL("https://bloodwork.mareknevole.com"),
  openGraph: {
    title: "Bloodwork — Public Blood Test Dashboard",
    description:
      "A public dashboard for tracking personal blood work over time. Structured lab results, supplements, and health metrics — open for anyone to learn from.",
    url: "https://bloodwork.mareknevole.com",
    siteName: "Bloodwork",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Bloodwork — Public Blood Test Dashboard",
    description:
      "A public dashboard for tracking personal blood work over time. Structured lab results, supplements, and health metrics — open for anyone to learn from.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://bloodwork.mareknevole.com",
  },
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Bloodwork",
  description:
    "A public dashboard for tracking personal blood work over time. Structured lab results, supplements, and health metrics — open for anyone to learn from.",
  url: "https://bloodwork.mareknevole.com",
  applicationCategory: "HealthApplication",
  author: {
    "@type": "Person",
    name: "Marek Nevole",
    url: "https://mareknevole.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <PointerPressFeedback />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
