"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { onValue } from "firebase/database";
import type { User } from "firebase/auth";
import Map, { type MapMarker } from "@/components/Map";
import { ensureSignedIn } from "@/lib/firebase";
import {
  completeSession,
  deleteSession,
  joinSession,
  sendMessage,
  sessionRef,
  updateLocation,
  type SessionData,
} from "@/lib/session";
import { distanceMeters, formatDistance, walkingMinutes } from "@/lib/distance";

type Screen =
  | "loading"
  | "join"
  | "active"
  | "completed"
  | "expired"
  | "notfound"
  | "full"
  | "error";

const QUICK_MESSAGES = [
  "今向かってます🚶",
  "着きました!",
  "少し遅れます🙏",
  "どこにいますか?",
];

const LOCATION_SEND_INTERVAL_MS = 3000;

export default function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);

  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [name, setName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const completedRef = useRef(false);
  const expiredRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const lastMsgKeyRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // 匿名ログイン
  useEffect(() => {
    ensureSignedIn()
      .then(setUser)
      .catch(() => setScreen("error"));
  }, []);

  // セッション購読
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onValue(
      sessionRef(sessionId),
      (snapshot) => {
        const data = snapshot.val() as SessionData | null;
        if (!data) {
          // 合流・期限切れ直後の削除は該当画面を維持する
          if (completedRef.current) setScreen("completed");
          else if (expiredRef.current) setScreen("expired");
          else setScreen("notfound");
          setSession(null);
          return;
        }
        if (data.status === "completed") {
          completedRef.current = true;
          setScreen("completed");
          setSession(data);
          return;
        }
        if (data.expiresAt < Date.now()) {
          expiredRef.current = true;
          setScreen("expired");
          deleteSession(sessionId).catch(() => {});
          return;
        }
        setSession(data);
        setScreen((prev) => {
          const isParticipant = !!data.participants?.[user.uid];
          if (isParticipant) return "active";
          const count = Object.keys(data.participants ?? {}).length;
          if (count >= 2) return "full";
          return prev === "loading" || prev === "join" ? "join" : prev;
        });
      },
      () => setScreen("error")
    );
    return unsubscribe;
  }, [user, sessionId]);

  // 参加中は位置情報を監視して送信
  useEffect(() => {
    if (screen !== "active" || !user) return;
    if (!navigator.geolocation) {
      setGeoError("このブラウザは位置情報に対応していません。");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        const nowMs = Date.now();
        if (nowMs - lastSentAtRef.current < LOCATION_SEND_INTERVAL_MS) return;
        lastSentAtRef.current = nowMs;
        updateLocation(
          sessionId,
          user.uid,
          pos.coords.latitude,
          pos.coords.longitude,
          Math.round(pos.coords.accuracy)
        ).catch(() => {});
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError(
            "位置情報が許可されていません。ブラウザの設定から許可してください。"
          );
        } else {
          setGeoError("位置情報を取得できません。電波状況を確認してください。");
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [screen, user, sessionId]);

  // 相手からの定型文メッセージをトースト表示
  useEffect(() => {
    if (!session?.messages || !user) return;
    const entries = Object.entries(session.messages);
    if (entries.length === 0) return;
    const [key, msg] = entries[entries.length - 1];
    if (key === lastMsgKeyRef.current) return;
    lastMsgKeyRef.current = key;
    if (msg.from === user.uid) return;
    const senderName =
      session.participants?.[msg.from]?.name ?? "相手";
    setToast(`${senderName}: ${msg.text}`);
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [session, user]);

  // 残り時間表示・期限チェック用の時計
  useEffect(() => {
    if (screen !== "active") return;
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, [screen]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    setJoinError(null);
    try {
      const displayName = name.trim() || "参加者";
      localStorage.setItem("displayName", displayName);
      await joinSession(sessionId, user.uid, displayName);
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "session-full") setScreen("full");
      else if (code === "session-expired") setScreen("expired");
      else if (code === "session-not-found") setScreen("notfound");
      else setJoinError("参加に失敗しました。もう一度お試しください。");
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("displayName");
    if (saved) setName(saved);
  }, []);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "待ち合わせ位置共有",
          text: "このURLを開くと待ち合わせ中の位置を共有できます(1時間で消えます)",
          url,
        });
        return;
      } catch {
        // キャンセル時はフォールバックしない
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleComplete = async () => {
    if (!window.confirm("合流できましたか?位置共有を終了してデータを削除します。")) {
      return;
    }
    completedRef.current = true;
    setScreen("completed");
    completeSession(sessionId).catch(() => {});
  };

  // ---- 画面ごとの描画 ----

  if (screen === "loading") {
    return <CenterMessage emoji="⏳" title="読み込み中..." />;
  }
  if (screen === "notfound") {
    return (
      <CenterMessage
        emoji="🔍"
        title="待ち合わせが見つかりません"
        body="URLが間違っているか、すでに終了して削除されています。"
        showHomeLink
      />
    );
  }
  if (screen === "expired") {
    return (
      <CenterMessage
        emoji="⏰"
        title="有効期限が切れました"
        body="この待ち合わせは1時間の期限を過ぎたため、位置情報は削除されました。"
        showHomeLink
      />
    );
  }
  if (screen === "completed") {
    return (
      <CenterMessage
        emoji="🎉"
        title="合流できました!"
        body="お疲れさまでした。位置情報はすべて削除されました。"
        showHomeLink
      />
    );
  }
  if (screen === "full") {
    return (
      <CenterMessage
        emoji="🚫"
        title="この待ち合わせは満員です"
        body="すでに2人が参加しています。"
        showHomeLink
      />
    );
  }
  if (screen === "error") {
    return (
      <CenterMessage
        emoji="⚠️"
        title="エラーが発生しました"
        body="通信環境を確認して、ページを再読み込みしてください。"
      />
    );
  }

  if (screen === "join") {
    return (
      <main className="flex min-h-full flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 text-center">
            <div className="mb-2 text-4xl">📍</div>
            <h1 className="text-xl font-bold">待ち合わせに参加</h1>
            <p className="mt-1 text-sm text-slate-500">
              参加すると、あなたの位置が相手に共有されます。
              <br />
              合流後・1時間後に自動で削除されます。
            </p>
          </div>
          <label className="mb-1.5 block text-sm font-medium text-slate-600">
            表示名(相手に見える名前)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ゆき"
            maxLength={20}
            className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500"
          />
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-base font-bold text-white transition active:bg-blue-700 disabled:opacity-50"
          >
            {joining ? "参加中..." : "位置を共有して参加"}
          </button>
          {joinError && <p className="mt-3 text-sm text-red-600">{joinError}</p>}
        </div>
      </main>
    );
  }

  // ---- active: 地図画面 ----

  const participants = session?.participants ?? {};
  const self = user ? participants[user.uid] : undefined;
  const otherEntry = Object.entries(participants).find(
    ([uid]) => uid !== user?.uid
  );
  const other = otherEntry?.[1];

  const markers: MapMarker[] = Object.entries(participants)
    .filter(([, p]) => p.lat !== undefined && p.lng !== undefined)
    .map(([uid, p]) => ({
      id: uid,
      lat: p.lat!,
      lng: p.lng!,
      label: uid === user?.uid ? `${p.name}(自分)` : p.name,
      isSelf: uid === user?.uid,
    }));

  const bothLocated =
    self?.lat !== undefined && other?.lat !== undefined;
  const distance = bothLocated
    ? distanceMeters(self!.lat!, self!.lng!, other!.lat!, other!.lng!)
    : null;

  const remainingMin = session
    ? Math.max(0, Math.ceil((session.expiresAt - now) / 60000))
    : 0;

  const handleSendQuick = (text: string) => {
    if (!user) return;
    sendMessage(sessionId, user.uid, text).catch(() => {});
    setToast(`送信: ${text}`);
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <main className="flex h-full flex-col">
      {/* ヘッダー */}
      <header className="flex items-center justify-between bg-white px-4 py-2.5 shadow-sm">
        <div className="text-sm font-medium text-slate-600">
          ⏱ あと{remainingMin}分
        </div>
        <button
          onClick={handleShare}
          className="rounded-full bg-blue-50 px-4 py-1.5 text-sm font-bold text-blue-600 active:bg-blue-100"
        >
          {copied ? "コピーしました!" : "URLを相手に送る"}
        </button>
      </header>

      {/* 地図 */}
      <div className="relative min-h-0 flex-1">
        <Map markers={markers} />
        {toast && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-slate-900/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        )}
        {geoError && (
          <div className="absolute inset-x-4 top-4 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
            {geoError}
          </div>
        )}
      </div>

      {/* フッター */}
      <footer className="space-y-3 bg-white px-4 pb-6 pt-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="text-center text-sm">
          {!other ? (
            <span className="text-slate-500">
              相手の参加を待っています... 上のボタンからURLを送ってください
            </span>
          ) : distance === null ? (
            <span className="text-slate-500">
              {other.name}さんの位置を取得中...
            </span>
          ) : (
            <span className="font-bold text-slate-800">
              {other.name}さんまで {formatDistance(distance)}
              <span className="ml-2 font-normal text-slate-500">
                徒歩約{walkingMinutes(distance)}分
              </span>
            </span>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_MESSAGES.map((text) => (
            <button
              key={text}
              onClick={() => handleSendQuick(text)}
              disabled={!other}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 active:bg-slate-100 disabled:opacity-40"
            >
              {text}
            </button>
          ))}
        </div>

        <button
          onClick={handleComplete}
          className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition active:bg-emerald-700"
        >
          🤝 合流できた!(共有を終了)
        </button>
      </footer>
    </main>
  );
}

function CenterMessage({
  emoji,
  title,
  body,
  showHomeLink,
}: {
  emoji: string;
  title: string;
  body?: string;
  showHomeLink?: boolean;
}) {
  return (
    <main className="flex min-h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <h1 className="mb-2 text-xl font-bold">{title}</h1>
      {body && (
        <p className="mb-6 text-sm leading-relaxed text-slate-500">{body}</p>
      )}
      {showHomeLink && (
        <a
          href="/"
          className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white active:bg-blue-700"
        >
          新しい待ち合わせを作る
        </a>
      )}
    </main>
  );
}
