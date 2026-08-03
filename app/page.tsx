"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSignedIn } from "@/lib/firebase";
import { createSession } from "@/lib/session";
import Logo from "@/components/Logo";
import AdUnit from "@/components/AdUnit";

const STEPS = [
  "「待ち合わせを開始」を押す",
  "表示されたURLを相手に送る(LINEなど)",
  "お互いの位置が地図に表示される",
  "会えたら「合流できた!」→ データは消えます",
];

const HOW_TO = [
  {
    emoji: "✏️",
    title: "① 表示名を入力して「待ち合わせを開始」",
    body: "会員登録もアプリのインストールも不要です。相手に表示される名前(ニックネームでOK)を入力してボタンを押すだけで、その場で待ち合わせ用のページが作成されます。",
  },
  {
    emoji: "🔗",
    title: "② URLを相手に送る",
    body: "作成すると専用のURLが発行されるので、LINEやメッセージアプリでそのまま送るだけです。相手はURLを開くだけで参加でき、アカウント作成は必要ありません。同じURLは最大8人まで共有できるので、グループでの待ち合わせにも使えます。",
  },
  {
    emoji: "🗺️",
    title: "③ 地図でお互いの位置を確認",
    body: "参加者全員の現在地が地図上にリアルタイムで表示されます。数秒おきに位置が更新されるので、相手が近づいてくる様子や、自分がどちらに向かえばいいかがひと目で分かります。",
  },
  {
    emoji: "💬",
    title: "④ チャットで一言送れる",
    body: "地図画面からそのままチャットを送れます。「今向かってます」「着きました!」「少し遅れます」などのクイックメッセージも用意されているので、移動中でもタップ1つで簡単に連絡できます。",
  },
  {
    emoji: "🔒",
    title: "⑤ 合流したらデータは自動で消える",
    body: "「合流できた!」を押すと、その待ち合わせに関する位置情報やチャットなどのデータはすべてその場で完全に削除されます。押し忘れても、作成から1時間経過すると自動的に削除されるので、使い終わったデータが残り続ける心配はありません。",
  },
];

const SCENES = [
  {
    emoji: "🚉",
    title: "駅・改札での待ち合わせ",
    body: "「どの改札にいる？」「何口から出た？」というやり取りが減ります。大きな駅や乗り換えが多い駅では、同じ駅でも出口が何十mも離れていることがあり、電話で説明するのが難しい場面が多いです。dot meetならお互いの現在地が地図上にそのまま表示されるので、言葉で説明する必要がありません。",
  },
  {
    emoji: "🎪",
    title: "フェス・イベント会場での待ち合わせ",
    body: "人が多く、目印になる場所が少ない野外フェスやイベント会場では、待ち合わせ場所を事前に決めていてもはぐれてしまうことがあります。会場内は電波が混雑して通話がつながりにくいこともありますが、位置情報の共有だけなら軽い通信量で済むため、比較的つながりやすい状況でも使いやすいです。",
  },
  {
    emoji: "✈️",
    title: "旅行先・出張先での待ち合わせ",
    body: "土地勘のない旅行先では、住所や建物名を伝えても相手がすぐに理解できないことがあります。地図上の位置を直接共有できるので、言語や土地勘の違いを気にせず合流できます。",
  },
  {
    emoji: "🏬",
    title: "ショッピングモール・商業施設での待ち合わせ",
    body: "フロアが分かれている大型施設では「何階のどのあたり」を口頭で伝えるのが難しいことがあります。買い物中に一時的に別行動をして、後で合流したいときにも役立ちます。",
  },
  {
    emoji: "🎆",
    title: "花火大会・野外イベントでの待ち合わせ",
    body: "混雑した人混みの中で、決めていた待ち合わせ場所にたどり着けないことは珍しくありません。移動しながらでもお互いの位置がリアルタイムに更新されるので、人混みの中でも合流しやすくなります。",
  },
  {
    emoji: "👨‍👩‍👧‍👦",
    title: "グループでの待ち合わせに便利",
    body: "dot meetは1人につき1つのURLではなく、同じURLを複数人で共有して使えます(最大8人まで参加可能)。友達同士のお出かけや、旅行先で一時的に別行動していたグループ、子どもや高齢の家族と一緒に出かけるときなど、複数人が同時に集まる場面でも、誰がどこにいるか一目で分かります。",
  },
];

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("displayName");
    if (saved) setName(saved);
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const user = await ensureSignedIn();
      const displayName = name.trim() || "作成者";
      localStorage.setItem("displayName", displayName);
      const sessionId = await createSession(user.uid, displayName);
      router.push(`/session/${sessionId}`);
    } catch (err) {
      console.error(err);
      setError("セッションの作成に失敗しました。通信環境を確認してもう一度お試しください。");
      setCreating(false);
    }
  };

  return (
    <main className="flex min-h-full flex-col items-center bg-white px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "dot meet",
              alternateName: "ドットミート",
              url: "https://dot-meet.com",
            },
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "dot meet",
              alternateName: "ドットミート",
              url: "https://dot-meet.com",
              applicationCategory: "UtilitiesApplication",
              operatingSystem: "Web",
            },
          ]),
        }}
      />

      <div className="w-full max-w-xs">
        <div className="mb-12 text-center">
          <Logo className="mx-auto mb-5 h-16 w-auto" />
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900">
            <span className="sr-only">
              待ち合わせの「今どこ？」を、URLひとつで。dot meet（ドットミート）
            </span>
            <span>dot meet</span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            待ち合わせのときだけ、お互いの位置を共有。
            <br />
            合流したら自動で消えます。登録不要。
          </p>
          <p className="sr-only">
            dot meet（ドットミート）は、待ち合わせ相手と現在地をリアルタイムで共有できる位置共有サービスです。専用アプリのインストールなしで、共有URLを送るだけですぐに使えます。
          </p>
        </div>

        <label className="mb-2 block text-xs font-medium text-slate-500">
          表示名(相手に見える名前)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: たかし"
          maxLength={20}
          className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-900"
        />

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full rounded-full bg-slate-900 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] active:bg-slate-800 disabled:opacity-40"
        >
          {creating ? "作成中..." : "待ち合わせを開始"}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <ol className="mt-12 space-y-2.5 border-t border-slate-100 pt-8">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-[13px] text-slate-500">
              <span className="font-semibold tabular-nums text-slate-300">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <AdUnit slot="1557643728" />
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-300">
          位置情報は待ち合わせ相手にだけ共有され、
          <br />
          合流後・1時間経過後に完全に削除されます。
          <br />
          このページを開いている間だけ更新されるので、
          <br />
          画面を閉じたりロックしたりすると更新が止まります。
        </p>

        <p className="mt-4 text-center text-[10px] text-slate-300">
          <a href="/terms" className="hover:underline">
            利用規約
          </a>
          <span className="mx-2">・</span>
          <a href="/privacy" className="hover:underline">
            プライバシーポリシー
          </a>
          <span className="mx-2">・</span>
          <a href="/about" className="hover:underline">
            運営者情報
          </a>
        </p>
      </div>

      <section className="mt-16 w-full max-w-2xl border-t border-slate-100 pt-12">
        <h2 className="mb-1 text-center text-lg font-semibold text-slate-900">
          こんなシーンで使える
        </h2>
        <p className="mb-8 text-center text-sm text-slate-400">
          相手を見つけにくい場所での待ち合わせに役立ちます。
        </p>
        <div className="space-y-8">
          {SCENES.map((scene) => (
            <div key={scene.title}>
              <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="text-lg">{scene.emoji}</span>
                {scene.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-500">
                {scene.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 w-full max-w-2xl border-t border-slate-100 pt-12">
        <h2 className="mb-1 text-center text-lg font-semibold text-slate-900">
          使い方
        </h2>
        <p className="mb-8 text-center text-sm text-slate-400">
          登録不要、URLを送るだけですぐに始められます。
        </p>
        <div className="space-y-8">
          {HOW_TO.map((step) => (
            <div key={step.title}>
              <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="text-lg">{step.emoji}</span>
                {step.title}
              </h3>
              <p className="text-[13px] leading-relaxed text-slate-500">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="sr-only">
        <h2>待ち合わせの位置共有を、もっと簡単に</h2>
        <p>
          駅やイベント会場、旅行先など、相手を見つけにくい場所での待ち合わせに。Dot
          Meetなら、位置情報を共有するためのURLを発行し、相手に送るだけで現在地を確認できます。「今どこ？」「どの出口にいる？」というやり取りを減らし、スムーズに合流できます。
        </p>
        <p>
          待ち合わせアプリのように事前登録やインストールをする必要はなく、URLで位置情報を共有するだけ。アプリなしで位置共有できるので、思い立ったその場ですぐに現在地共有・リアルタイム位置共有を始められます。
        </p>
        <p>
          「DotMeet」と表記・検索されることもありますが、正式名称は dot meet(ドットミート)です。
        </p>
      </section>
    </main>
  );
}
