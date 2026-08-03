import type { Metadata, Viewport } from "next";
import "./globals.css";
import AdSenseScript from "@/components/AdSenseScript";
import { ADSENSE_CLIENT_ID, ADSENSE_ENABLED } from "@/lib/adsense";

const SITE_URL = "https://dot-meet.com";
const TITLE = "dot meet（ドットミート）｜待ち合わせの位置共有をURLひとつで";
const DESCRIPTION =
  "dot meet（ドットミート）は、待ち合わせ相手と現在地をリアルタイム共有できるサービスです。専用アプリなしで、URLを送るだけですぐに位置情報を共有できます。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: "dot meet",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  other: ADSENSE_ENABLED
    ? { "google-adsense-account": ADSENSE_CLIENT_ID }
    : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <AdSenseScript />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
