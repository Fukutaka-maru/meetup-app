"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSignedIn } from "@/lib/firebase";
import { createSession } from "@/lib/session";

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
    <main className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="mb-3 text-5xl">📍</div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">マチアイ</h1>
          <p className="text-sm leading-relaxed text-slate-500">
            待ち合わせのときだけ、お互いの位置を共有。
            <br />
            合流したら自動で消えます。登録不要。
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            表示名(相手に見える名前)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: たかし"
            maxLength={20}
            className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white shadow-sm transition active:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "作成中..." : "待ち合わせを開始"}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <ol className="mt-8 space-y-2 text-sm text-slate-500">
          <li>1. 「待ち合わせを開始」を押す</li>
          <li>2. 表示されたURLを相手に送る(LINEなど)</li>
          <li>3. お互いの位置が地図に表示される</li>
          <li>4. 会えたら「合流できた!」→ データは消えます</li>
        </ol>

        <p className="mt-6 text-center text-xs text-slate-400">
          位置情報は待ち合わせ相手にだけ共有され、
          <br />
          合流後・1時間経過後に完全に削除されます。
        </p>
      </div>
    </main>
  );
}
