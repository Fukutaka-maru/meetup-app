"use client";

import { useEffect, useRef, useState } from "react";
import Map, { type MapMarker } from "@/components/Map";
import Logo from "@/components/Logo";
import {
  distanceMeters,
  transitMinutes,
  TRANSIT_MIN_DISTANCE_M,
  walkingMinutes,
} from "@/lib/distance";

/** 録画用のスクリーンショット/デモ専用ページ。Firebase等の外部依存なし、完全ローカル。 */

const DEST = { lat: 35.659, lng: 139.7005, name: "渋谷スクランブル交差点" };

const M_PER_DEG_LAT = 111320;
const metersToDegLat = (m: number) => m / M_PER_DEG_LAT;
const metersToDegLng = (m: number, atLat: number) =>
  m / (M_PER_DEG_LAT * Math.cos((atLat * Math.PI) / 180));

function offset(lat: number, lng: number, dNorthM: number, dEastM: number) {
  return {
    lat: lat + metersToDegLat(dNorthM),
    lng: lng + metersToDegLng(dEastM, lat),
  };
}

const SELF_COLOR = "#2563eb";
const SELF_START = offset(DEST.lat, DEST.lng, 700, -450);
const SELF_START_DELAY_MS = 300;
const SELF_DURATION_MS = 20000;

type PersonConfig = {
  id: string;
  name: string;
  color: string;
  start: { lat: number; lng: number };
  /** 「URLを相手に送る」を押してから移動を始めるまでの遅延 */
  startDelayMs: number;
  durationMs: number;
  delayMessageAtMs?: number;
  delayMessageText?: string;
  replies: string[];
};

const FRIENDS: PersonConfig[] = [
  {
    id: "yuki",
    name: "ゆき",
    color: "#f97316",
    start: offset(DEST.lat, DEST.lng, 650, 500),
    startDelayMs: 1200,
    durationMs: 16000,
    replies: ["了解です!もうすぐ着きます😊", "見えました!そっちに向かいますね"],
  },
  {
    id: "ken",
    name: "けん",
    color: "#16a34a",
    start: offset(DEST.lat, DEST.lng, -550, -600),
    startDelayMs: 2600,
    durationMs: 34000,
    delayMessageAtMs: 10000,
    delayMessageText: "ちょっと遅れる🙏",
    replies: ["おっけー、もうすぐ着くわ😊", "見えた!そっち行くね"],
  },
];

const TICK_MS = 200;
const AUTO_REPLY_DELAY_MS = 1800;

type ChatMsg = { id: string; from: string; name: string; text: string; mine: boolean };
type RouteData = { coords: [number, number][]; cum: number[]; total: number };

const QUICK_MESSAGES = ["今向かってます🚶", "着きました!", "少し遅れます🙏", "どこにいますか?"];

function buildRouteData(coords: [number, number][]): RouteData {
  const cum = [0];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];
    total += distanceMeters(lat1, lng1, lat2, lng2);
    cum.push(total);
  }
  return { coords, cum, total };
}

function pointAt(route: RouteData, t: number): { lat: number; lng: number } {
  const clamped = Math.min(1, Math.max(0, t));
  const target = route.total * clamped;
  let idx = 0;
  while (idx < route.cum.length - 2 && route.cum[idx + 1] < target) idx++;
  const segStart = route.cum[idx];
  const segEnd = route.cum[idx + 1] ?? route.total;
  const segLen = segEnd - segStart;
  const segT = segLen > 0 ? (target - segStart) / segLen : 0;
  const [lng1, lat1] = route.coords[idx];
  const [lng2, lat2] = route.coords[Math.min(idx + 1, route.coords.length - 1)];
  return { lat: lat1 + (lat2 - lat1) * segT, lng: lng1 + (lng2 - lng1) * segT };
}

async function fetchWalkingRoute(
  start: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<RouteData> {
  const straight = buildRouteData([
    [start.lng, start.lat],
    [dest.lng, dest.lat],
  ]);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return straight;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${start.lng},${start.lat};${dest.lng},${dest.lat}?geometries=geojson&overview=full&access_token=${token}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      routes?: { geometry: { coordinates: [number, number][] } }[];
    };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return straight;
    return buildRouteData(coords);
  } catch {
    return straight;
  }
}

export default function DemoPage() {
  const [phase, setPhase] = useState<"start" | "session" | "completed">("start");
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [remainingMin, setRemainingMin] = useState(59);
  const [visibleFriendIds, setVisibleFriendIds] = useState<string[]>([]);
  const [selfMoving, setSelfMoving] = useState(false);
  const [, forceTick] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [unread, setUnread] = useState(0);

  const routesRef = useRef<Record<string, RouteData>>({});
  const startTimesRef = useRef<Record<string, number>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatOpenRef = useRef(false);

  const handleStart = () => setPhase("session");

  // チャット開閉の反映と、開いたときの未読リセット
  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  // セッション表示時点で、自分と友達それぞれの徒歩ルート(道路沿い)を先読みしておく
  useEffect(() => {
    if (phase !== "session") return;
    let cancelled = false;
    fetchWalkingRoute(SELF_START, DEST).then((r) => {
      if (!cancelled) routesRef.current.self = r;
    });
    for (const f of FRIENDS) {
      fetchWalkingRoute(f.start, DEST).then((r) => {
        if (!cancelled) routesRef.current[f.id] = r;
      });
    }
    return () => {
      cancelled = true;
    };
  }, [phase]);

  // 全体を再描画するためのタイマー(進行中は動かし続ける)
  useEffect(() => {
    if (phase !== "session") return;
    const interval = setInterval(() => forceTick((n) => n + 1), TICK_MS);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== "session") return;
    const interval = setInterval(() => {
      setRemainingMin((m) => (m > 1 ? m - 1 : 59));
    }, 20000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleShare = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    if (shared) return;
    setShared(true);

    const selfTimer = setTimeout(() => {
      startTimesRef.current.self = Date.now();
      setSelfMoving(true);
    }, SELF_START_DELAY_MS);
    timersRef.current.push(selfTimer);

    for (const friend of FRIENDS) {
      const joinTimer = setTimeout(() => {
        startTimesRef.current[friend.id] = Date.now();
        setVisibleFriendIds((prev) => [...prev, friend.id]);
      }, friend.startDelayMs);
      timersRef.current.push(joinTimer);

      if (friend.delayMessageAtMs && friend.delayMessageText) {
        const msgTimer = setTimeout(
          () => {
            setMessages((prev) => [
              ...prev,
              {
                id: `${Date.now()}-${friend.id}-delay`,
                from: friend.id,
                name: friend.name,
                text: friend.delayMessageText!,
                mine: false,
              },
            ]);
            if (!chatOpenRef.current) setUnread((n) => n + 1);
          },
          friend.startDelayMs + friend.delayMessageAtMs
        );
        timersRef.current.push(msgTimer);
      }
    }
  };

  const positionOf = (id: string, start: { lat: number; lng: number }, durationMs: number) => {
    const startedAt = startTimesRef.current[id];
    if (!startedAt) return { lat: start.lat, lng: start.lng, t: 0 };
    const t = Math.min(1, (Date.now() - startedAt) / durationMs);
    const route = routesRef.current[id] ?? buildRouteData([
      [start.lng, start.lat],
      [DEST.lng, DEST.lat],
    ]);
    const p = pointAt(route, t);
    return { ...p, t };
  };

  const selfName = name.trim() || "自分";
  const selfPos = positionOf("self", SELF_START, SELF_DURATION_MS);
  const self = { id: "self", name: selfName, color: SELF_COLOR, lat: selfPos.lat, lng: selfPos.lng };

  const others = FRIENDS.filter((f) => visibleFriendIds.includes(f.id)).map((f) => {
    const pos = positionOf(f.id, f.start, f.durationMs);
    return { id: f.id, name: f.name, color: f.color, lat: pos.lat, lng: pos.lng, arrived: pos.t >= 1 };
  });

  const markers: MapMarker[] = [
    { id: self.id, lat: self.lat, lng: self.lng, label: `${self.name}(自分)`, color: self.color },
    ...others.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, label: p.name, color: p.color })),
  ];

  const distToDest = (lat: number, lng: number) => distanceMeters(lat, lng, DEST.lat, DEST.lng);

  const timeLabel = (d: number) =>
    d >= TRANSIT_MIN_DISTANCE_M
      ? `徒歩${walkingMinutes(d)}分・電車${transitMinutes(d)}分`
      : `徒歩${walkingMinutes(d)}分`;

  const handleSendChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}`, from: "self", name: self.name, text: trimmed, mine: true },
    ]);
    setChatInput("");
    if (visibleFriendIds.length === 0) return;
    if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    replyTimerRef.current = setTimeout(() => {
      const candidates = FRIENDS.filter((f) => visibleFriendIds.includes(f.id));
      const replyFrom = candidates[Math.floor(Math.random() * candidates.length)];
      const text = replyFrom.replies[Math.floor(Math.random() * replyFrom.replies.length)];
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-r`, from: replyFrom.id, name: replyFrom.name, text, mine: false },
      ]);
      if (!chatOpenRef.current) setUnread((n) => n + 1);
    }, AUTO_REPLY_DELAY_MS);
  };

  const handleComplete = () => {
    if (!window.confirm("合流できましたか?位置共有を終了してデータを削除します。")) return;
    setPhase("completed");
  };

  if (phase === "start") {
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

          <button
            onClick={handleStart}
            className="w-full rounded-full bg-slate-900 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] active:bg-slate-800"
          >
            待ち合わせを開始
          </button>
        </div>
      </main>
    );
  }

  if (phase === "completed") {
    return (
      <main className="flex min-h-full flex-col items-center justify-center bg-white px-6 text-center">
        <div className="mb-4 text-4xl">🎉</div>
        <h1 className="mb-2 text-xl font-semibold tracking-tight">合流できました!</h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-400">
          お疲れさまでした。位置情報はすべて削除されました。
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] active:bg-slate-800"
        >
          新しい待ち合わせを作る
        </button>
      </main>
    );
  }

  return (
    <main className="flex h-full flex-col">
      {/* ヘッダー */}
      <header className="border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <Logo className="h-7 w-auto" />
            <span className="text-xs font-medium tabular-nums text-slate-400">
              あと{remainingMin}分
            </span>
          </div>
          <button
            onClick={handleShare}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white active:bg-slate-800"
          >
            {copied ? "コピーしました!" : "URLを相手に送る"}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-slate-50 px-4 py-1 text-xs font-semibold text-red-500">
          <span className="truncate">📍 {DEST.name}</span>
        </div>
      </header>

      {/* 地図 */}
      <div className="relative min-h-0 flex-1">
        <Map markers={markers} destination={DEST} />

        {chatOpen && (
          <div className="absolute inset-x-0 bottom-0 flex max-h-[45%] flex-col rounded-t-2xl border-t border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 pb-1 pt-2">
              <span className="text-xs font-medium text-slate-400">チャット</span>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-400 active:bg-slate-100"
              >
                閉じる ▾
              </button>
            </div>
            <div className="min-h-20 flex-1 space-y-1.5 overflow-y-auto px-4 py-1">
              {messages.length === 0 && (
                <p className="py-3 text-center text-xs text-slate-300">
                  まだメッセージはありません
                </p>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.mine ? "items-end" : "items-start"}`}
                >
                  {!msg.mine && (
                    <span
                      className="mb-0.5 ml-1 text-[10px] font-medium"
                      style={{ color: FRIENDS.find((p) => p.id === msg.from)?.color }}
                    >
                      {msg.name}
                    </span>
                  )}
                  <span
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                      msg.mine
                        ? "rounded-br-md bg-slate-900 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-800"
                    }`}
                  >
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="space-y-2 px-4 pb-3 pt-2">
              <div className="flex gap-2 overflow-x-auto">
                {QUICK_MESSAGES.map((text) => (
                  <button
                    key={text}
                    onClick={() => handleSendChat(text)}
                    className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 active:bg-slate-100"
                  >
                    {text}
                  </button>
                ))}
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat(chatInput);
                }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="メッセージを入力"
                  maxLength={200}
                  className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none transition focus:border-slate-900"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white active:bg-slate-800 disabled:opacity-40"
                >
                  送信
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <footer className="space-y-2 border-t border-slate-100 bg-white px-4 pb-6 pt-2.5">
        {others.length === 0 && !selfMoving ? (
          <p className="text-center text-sm text-slate-500">
            相手の参加を待っています... 上のボタンからURLを送ってください
          </p>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: self.color }} />
              <span className="font-bold text-slate-800">{self.name}</span>
              <span className="text-slate-500">{timeLabel(distToDest(self.lat, self.lng))}</span>
            </span>
            {others.map((p) => (
              <span
                key={p.id}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1.5 text-xs"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                <span className="font-bold text-slate-800">{p.name}</span>
                <span className="text-slate-500">
                  {p.arrived ? "到着!" : timeLabel(distToDest(p.lat, p.lng))}
                </span>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="relative flex-1 rounded-full border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition active:bg-slate-50"
          >
            チャット
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          <button
            onClick={handleComplete}
            className="flex-[2] rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white transition active:scale-[0.98] active:bg-emerald-700"
          >
            合流できた!(共有を終了)
          </button>
        </div>
      </footer>
    </main>
  );
}
