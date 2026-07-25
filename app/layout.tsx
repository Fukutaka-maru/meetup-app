import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://dot-meet.com";
const TITLE = "Dot Meet（ドットミート）｜待ち合わせの位置共有をURLひとつで";
const DESCRIPTION =
  "Dot Meet（ドットミート）は、待ち合わせ相手と現在地をリアルタイム共有できるサービスです。専用アプリなしで、URLを送るだけですぐに位置情報を共有できます。";

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
    siteName: "Dot Meet",
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
      <body className="h-full">{children}</body>
    </html>
  );
}
