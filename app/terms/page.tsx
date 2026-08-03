import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | Dot Meet",
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12 text-sm leading-relaxed text-slate-600">
      <h1 className="mb-8 text-xl font-semibold text-slate-900">利用規約</h1>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第1条（適用）</h2>
        <p>
          本規約は、Dot Meet（以下「本サービス」）の利用条件を定めるものです。ユーザーは本サービスを利用することで、本規約に同意したものとみなされます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第2条（サービス内容）</h2>
        <p>
          本サービスは、待ち合わせ相手と現在地をリアルタイムに共有するための機能を提供します。共有される位置情報は、同一セッションの参加者間でのみ表示され、一定時間経過後または待ち合わせ完了後に自動的に削除されます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第3条（禁止事項）</h2>
        <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>法令または公序良俗に違反する行為</li>
          <li>他者になりすます行為、他者の位置情報を無断で取得・共有する行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>本サービスを不正な目的で利用する行為</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第4条（広告の表示）</h2>
        <p>
          本サービスでは、Google AdSense等の第三者配信の広告サービスを利用し、広告を表示することがあります。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第5条（免責事項）</h2>
        <p>
          本サービスは、位置情報の正確性、サービスの中断・停止がないことを保証するものではありません。本サービスの利用により生じた損害について、運営者は故意または重過失がある場合を除き、責任を負わないものとします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第6条（規約の変更）</h2>
        <p>
          運営者は、必要と判断した場合には、ユーザーへの事前通知なく本規約を変更できるものとします。変更後の規約は、本ページに掲載した時点で効力を生じるものとします。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第7条（準拠法）</h2>
        <p>本規約の解釈にあたっては、日本法を準拠法とします。</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 font-semibold text-slate-900">第8条（お問い合わせ）</h2>
        <p>
          本サービスに関するお問い合わせは、下記までご連絡ください。
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
