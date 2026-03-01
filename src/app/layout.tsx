import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NidLocal — Location courte et moyenne durée en France",
    template: "%s | NidLocal",
  },
  description:
    "Réservez ou proposez des logements pour séjours courts et moyens en France. Simple, transparent, conforme aux règles locales.",
  keywords: ["location vacances", "court séjour", "hébergement France", "alternative Airbnb"],
  authors: [{ name: "NidLocal" }],
  creator: "NidLocal",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://nidlocal.fr"
  ),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "NidLocal",
    title: "NidLocal — Location courte et moyenne durée en France",
    description:
      "Réservez ou proposez des logements pour séjours courts et moyens en France.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#339168",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
