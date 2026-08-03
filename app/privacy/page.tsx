import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Dot Meet",
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-600">
      <h1 className="mb-8 text-xl font-semibold text-slate-900">
        プライバシーポリシー
      </h1>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">1. 位置情報の取り扱い</h2>
        <p>
          Dot Meet（以下「本サービス」）は、待ち合わせ機能の提供のためにユーザーの位置情報を取得します。取得した位置情報は、同一の待ち合わせセッションに参加している相手にのみ共有され、それ以外の第三者には提供されません。位置情報を含むセッションデータは、待ち合わせ完了時、または作成から1時間が経過した時点で自動的に削除されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">2. 取得する情報</h2>
        <p>
          本サービスの利用にあたり、以下の情報を取得することがあります。
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>位置情報（緯度・経度）</li>
          <li>表示名として入力された任意の文字列</li>
          <li>プッシュ通知の送信に必要な情報（通知を許可した場合）</li>
          <li>アクセスログ、Cookie等の技術情報</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">3. 広告について</h2>
        <p>
          本サービスは、第三者配信の広告サービス（Google
          AdSense）を利用することがあります。広告配信事業者は、ユーザーの興味に応じた広告を表示するためにCookieを使用することがあります。Cookieを無効にする方法や、Googleが使用するCookieの詳細については、
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Googleの広告ポリシー
          </a>
          をご確認ください。パーソナライズ広告の設定は
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Google広告設定
          </a>
          から変更できます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">4. 情報の第三者提供</h2>
        <p>
          法令に基づく場合を除き、取得した情報を本人の同意なく第三者に提供することはありません。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">5. お問い合わせ</h2>
        <p>
          本ポリシーに関するお問い合わせは、下記までご連絡ください。
          <br />
          Email:{" "}
          <a href="mailto:info@routiee.com" className="underline">
            info@routiee.com
          </a>
        </p>
      </section>

      <p className="mt-12 text-xs text-slate-400">最終更新日: 2026年8月2日</p>
    </main>
  );
}
