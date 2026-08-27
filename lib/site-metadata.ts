import type { Metadata } from "next";

export const personalTrackingDisclaimer =
  "Personal tracking, not clinical guidance.";

export const publicDashboardDescription = `A public dashboard of personal blood work over time, including lab results, supplements, and health metrics. ${personalTrackingDisclaimer} Not medical advice.`;

export const publicMetadata: Metadata = {
  title: "Bloodwork — Marek Nevole",
  description: publicDashboardDescription,
  metadataBase: new URL("https://bloodwork.mareknevole.com"),
  openGraph: {
    title: "Bloodwork — Public Blood Test Dashboard",
    description: publicDashboardDescription,
    url: "https://bloodwork.mareknevole.com",
    siteName: "Bloodwork",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Bloodwork — Public Blood Test Dashboard",
    description: publicDashboardDescription,
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

export const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Bloodwork",
  description: publicDashboardDescription,
  url: "https://bloodwork.mareknevole.com",
  applicationCategory: "HealthApplication",
  author: {
    "@type": "Person",
    name: "Marek Nevole",
    url: "https://mareknevole.com",
  },
};
