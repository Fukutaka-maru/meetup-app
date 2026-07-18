"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureSignedIn } from "@/lib/firebase";
import { createSession, type Destination } from "@/lib/session";
import Logo from "@/components/Logo";

const STEPS = [
  "「待ち合わせを開始」を押す",
  "表示されたURLを相手に送る(LINEなど)",
  "お互いの位置が地図に表示される",
  "会えたら「合流できた!」→ データは消えます",
];

type GeocodingFeature = {
  id: string;
  place_name: string;
  geometry: { coordinates: [number, number] };
};

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [destQuery, setDestQuery] = useState("");
  const [destSuggestions, setDestSuggestions] = useState<GeocodingFeature[]>([]);
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(null);
  const [destSearching, setDestSearching] = useState(false);
  const destDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("displayName");
    if (saved) setName(saved);
  }, []);

  // 目的地の検索(Mapbox Geocoding)
  useEffect(() => {
    if (destDebounceRef.current) clearTimeout(destDebounceRef.current);
    if (!destQuery.trim() || selectedDestination) {
      setDestSuggestions([]);
      return;
    }
    destDebounceRef.current = setTimeout(async () => {
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) return;
      setDestSearching(true);
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destQuery)}.json?access_token=${token}&language=ja&limit=5&proximity=ip`;
        const res = await fetch(url);
        const data = (await res.json()) as { features: GeocodingFeature[] };
        setDestSuggestions(data.features ?? []);
      } catch {
        // ネットワークエラーは無視
      } finally {
        setDestSearching(false);
      }
    }, 300);
  }, [destQuery, selectedDestination]);

  const handleSelectDestination = (feature: GeocodingFeature) => {
    const [lng, lat] = feature.geometry.coordinates;
    setSelectedDestination({ lat, lng, name: feature.place_name });
    setDestQuery(feature.place_name);
    setDestSuggestions([]);
  };

  const handleClearDestination = () => {
    setSelectedDestination(null);
    setDestQuery("");
    setDestSuggestions([]);
  };

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const user = await ensureSignedIn();
      const displayName = name.trim() || "作成者";
      localStorage.setItem("displayName", displayName);
      const sessionId = await createSession(
        user.uid,
        displayName,
        selectedDestination ?? undefined
      );
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
          className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-900"
        />

        <label className="mb-2 block text-xs font-medium text-slate-500">
          目的地(任意)
        </label>
        <div className="relative mb-3">
          <div className="relative">
            <input
              type="text"
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                if (selectedDestination) setSelectedDestination(null);
              }}
              onBlur={() => setTimeout(() => setDestSuggestions([]), 150)}
              placeholder="例: 渋谷駅"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-10 text-base outline-none transition focus:border-slate-900"
            />
            {(destQuery || selectedDestination) && (
              <button
                onClick={handleClearDestination}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 active:text-slate-700"
                aria-label="目的地をクリア"
              >
                ✕
              </button>
            )}
          </div>
          {destSuggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              {destSuggestions.map((f) => (
                <li key={f.id}>
                  <button
                    onMouseDown={() => handleSelectDestination(f)}
                    className="w-full px-4 py-3 text-left text-sm leading-snug text-slate-700 hover:bg-slate-50 active:bg-slate-100"
                  >
                    <span className="mr-1.5">📍</span>
                    {f.place_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {destSearching && (
            <p className="mt-1 px-1 text-xs text-slate-400">検索中...</p>
          )}
          {selectedDestination && (
            <p className="mt-1 px-1 text-xs text-emerald-600">✓ 目的地を設定しました</p>
          )}
        </div>

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
          <br />
          このページを開いている間だけ更新されるので、
          <br />
          画面を閉じたりロックしたりすると更新が止まります。
        </p>
      </div>
    </main>
  );
}
