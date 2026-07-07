import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dotdot Meet - 待ち合わせ位置共有",
  description:
    "待ち合わせのときだけお互いの位置を共有。合流したら自動で消えます。登録不要、URLを送るだけ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
