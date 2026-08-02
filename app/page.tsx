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
              name: "Dot Meet",
              alternateName: "ドットミート",
              url: "https://dot-meet.com",
            },
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Dot Meet",
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
              待ち合わせの「今どこ？」を、URLひとつで。Dot Meet（ドットミート）
            </span>
            <span>dot meet</span>
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            待ち合わせのときだけ、お互いの位置を共有。
            <br />
            合流したら自動で消えます。登録不要。
          </p>
          <p className="sr-only">
            Dot Meet（ドットミート）は、待ち合わせ相手と現在地をリアルタイムで共有できる位置共有サービスです。専用アプリのインストールなしで、共有URLを送るだけですぐに使えます。
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
        </p>
      </div>

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
          「DotMeet」と表記・検索されることもありますが、正式名称は Dot Meet(ドットミート)です。
        </p>
      </section>
    </main>
  );
}
