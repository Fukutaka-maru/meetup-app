import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "運営者情報 | dot meet",
};

const ITEMS = [
  { label: "サービス名", value: "dot meet（ドットミート）" },
  { label: "運営者", value: "routiee" },
  {
    label: "連絡先",
    value: "info@routiee.com",
    href: "mailto:info@routiee.com",
  },
  { label: "サービス内容", value: "待ち合わせ相手との位置共有サービスの提供" },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-600">
      <h1 className="mb-8 text-xl font-semibold text-slate-900">
        運営者情報
      </h1>

      <dl className="divide-y divide-slate-100 border-y border-slate-100">
        {ITEMS.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-3 gap-4 py-4 sm:grid-cols-4"
          >
            <dt className="col-span-1 font-medium text-slate-500">
              {item.label}
            </dt>
            <dd className="col-span-2 sm:col-span-3">
              {item.href ? (
                <a href={item.href} className="underline">
                  {item.value}
                </a>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-8">
        dot meetは、待ち合わせ相手と現在地をリアルタイムに共有できる無料のWebサービスです。位置情報の取り扱いについては
        <a href="/privacy" className="underline">
          プライバシーポリシー
        </a>
        を、ご利用にあたっての条件については
        <a href="/terms" className="underline">
          利用規約
        </a>
        をご確認ください。
      </p>

      <p className="mt-8">
        サービスに関するご意見・不具合のご報告などは、上記の連絡先までお気軽にお問い合わせください。
      </p>
    </main>
  );
}
