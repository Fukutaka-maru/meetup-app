import type { Metadata } from "next";

// 待ち合わせセッションは相手専用の一時ページなので検索に出さない。
// セッションIDや位置情報を含まない、固定の noindex 設定のみを適用する。
export const metadata: Metadata = {
  title: "Dot Meet - 待ち合わせ中",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function SessionLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
