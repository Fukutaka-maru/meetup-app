"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSignedIn } from "@/lib/firebase";
import { createSession } from "@/lib/session";
import Logo from "@/components/Logo";

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
    <main className="flex min-h-full flex-col items-center justify-center bg-white px-6 py-12">
      <div className="w-full max-w-xs">
        <div className="mb-12 text-center">
          <Logo className="mx-auto mb-5 h-16 w-auto" />
          <h1 className="mb-3 text-2xl font-semibold tracking-tight text-slate-900">
            dotdot meet
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            待ち合わせのときだけ、お互いの位置を共有。
            <br />
            合流したら自動で消えます。登録不要。
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
          className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-900"
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

        <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-300">
          位置情報は待ち合わせ相手にだけ共有され、
          <br />
          合流後・1時間経過後に完全に削除されます。
        </p>
      </div>
    </main>
  );
}
