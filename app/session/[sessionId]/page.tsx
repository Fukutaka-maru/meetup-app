"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { onValue } from "firebase/database";
import type { User } from "firebase/auth";
import Map, { type MapMarker } from "@/components/Map";
import Logo from "@/components/Logo";
import { ensureSignedIn } from "@/lib/firebase";
import {
  completeSession,
  deleteSession,
  joinSession,
  sendMessage,
  sessionRef,
  updateLocation,
  MAX_PARTICIPANTS,
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

/** 最終更新がこれより古い参加者は「位置が古い」表示にする */
const STALE_MS = 30_000;

/** 経過時間の表示用文字列(30秒〜) */
function formatAge(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}秒前`;
  return `${Math.floor(sec / 60)}分前`;
}

/** 自分以外の参加者に割り当てる色(ブランドのオレンジを先頭に) */
const SELF_COLOR = "#2563eb";
const OTHER_COLORS = [
  "#f97316",
  "#16a34a",
  "#9333ea",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#e11d48",
];

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
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [unread, setUnread] = useState(0);
  const [showGeoHelp, setShowGeoHelp] = useState(false);

  const completedRef = useRef(false);
  const expiredRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const pendingPosRef = useRef<GeolocationPosition | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMsgKeyRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const geoHelpShownRef = useRef(false);
  const chatOpenRef = useRef(false);
  const chatListRef = useRef<HTMLDivElement | null>(null);

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
          if (count >= MAX_PARTICIPANTS) return "full";
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
    const send = (pos: GeolocationPosition) => {
      lastSentAtRef.current = Date.now();
      updateLocation(
        sessionId,
        user.uid,
        pos.coords.latitude,
        pos.coords.longitude,
        Math.round(pos.coords.accuracy)
      ).catch(() => {});
    };
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoError(null);
        const elapsed = Date.now() - lastSentAtRef.current;
        if (elapsed >= LOCATION_SEND_INTERVAL_MS) {
          send(pos);
          return;
        }
        // 間引き中は最新位置を保持し、間隔が空き次第送る
        // (立ち止まった直後などwatchPositionが発火しなくなると最後の位置が届かないため)
        pendingPosRef.current = pos;
        if (sendTimerRef.current === null) {
          sendTimerRef.current = setTimeout(() => {
            sendTimerRef.current = null;
            const pending = pendingPosRef.current;
            pendingPosRef.current = null;
            if (pending) send(pending);
          }, LOCATION_SEND_INTERVAL_MS - elapsed);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("位置情報が許可されていません。");
          // 初回だけ設定方法のガイドを自動で開く
          if (!geoHelpShownRef.current) {
            geoHelpShownRef.current = true;
            setShowGeoHelp(true);
          }
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
      if (sendTimerRef.current !== null) {
        clearTimeout(sendTimerRef.current);
        sendTimerRef.current = null;
      }
      pendingPosRef.current = null;
    };
  }, [screen, user, sessionId]);

  // 相手からの新着メッセージ: チャットを閉じていればトースト+未読カウント
  useEffect(() => {
    if (!session?.messages || !user) return;
    const entries = Object.entries(session.messages);
    if (entries.length === 0) return;
    const [key, msg] = entries[entries.length - 1];
    if (key === lastMsgKeyRef.current) return;
    lastMsgKeyRef.current = key;
    if (msg.from === user.uid) return;
    if (chatOpenRef.current) return;
    setUnread((n) => n + 1);
    const senderName =
      session.participants?.[msg.from]?.name ?? "相手";
    setToast(`${senderName}: ${msg.text}`);
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [session, user]);

  // チャット開閉の反映と、開いたときの未読リセット・最下部スクロール
  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  useEffect(() => {
    if (!chatOpen) return;
    const el = chatListRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatOpen, session?.messages]);

  // 残り時間・位置の経過時間表示用の時計
  useEffect(() => {
    if (screen !== "active") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
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
          title: "Dotdot Meet - 待ち合わせ位置共有",
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
        body={`すでに${MAX_PARTICIPANTS}人が参加しています。`}
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
      <main className="flex min-h-full flex-col items-center justify-center bg-white px-6">
        <div className="w-full max-w-xs">
          <div className="mb-8 text-center">
            <Logo className="mx-auto mb-4 h-14 w-auto" />
            <h1 className="text-xl font-semibold tracking-tight">待ち合わせに参加</h1>
            <p className="mt-1 text-sm text-slate-500">
              参加すると、あなたの位置が相手に共有されます。
              <br />
              合流後・1時間後に自動で削除されます。
            </p>
          </div>
          <label className="mb-2 block text-xs font-medium text-slate-500">
            表示名(相手に見える名前)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: ゆき"
            maxLength={20}
            className="mb-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none transition focus:border-slate-900"
          />
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full rounded-full bg-slate-900 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] active:bg-slate-800 disabled:opacity-40"
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
  // uid順で固定して、参加者ごとの色が全員の画面で一致するようにする
  const others = Object.entries(participants)
    .filter(([uid]) => uid !== user?.uid)
    .sort(([a], [b]) => a.localeCompare(b));
  const colorOf = (uid: string) => {
    if (uid === user?.uid) return SELF_COLOR;
    const idx = others.findIndex(([id]) => id === uid);
    if (idx < 0) return "#94a3b8"; // 退出済みなど、一覧にいない参加者
    return OTHER_COLORS[idx % OTHER_COLORS.length];
  };

  const markers: MapMarker[] = Object.entries(participants)
    .filter(([, p]) => p.lat !== undefined && p.lng !== undefined)
    .map(([uid, p]) => {
      const age = now - p.lastUpdate;
      return {
        id: uid,
        lat: p.lat!,
        lng: p.lng!,
        label: uid === user?.uid ? `${p.name}(自分)` : p.name,
        color: colorOf(uid),
        sublabel:
          uid !== user?.uid && age >= STALE_MS ? formatAge(age) : undefined,
      };
    });

  const distanceTo = (p: (typeof others)[number][1]) =>
    self?.lat !== undefined && p.lat !== undefined
      ? distanceMeters(self.lat!, self.lng!, p.lat!, p.lng!)
      : null;

  const remainingMin = session
    ? Math.max(0, Math.ceil((session.expiresAt - now) / 60000))
    : 0;

  const handleSendChat = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    sendMessage(sessionId, user.uid, trimmed).catch(() => {});
    setChatInput("");
  };

  const chatMessages = Object.entries(session?.messages ?? {}).sort(
    ([, a], [, b]) => a.at - b.at
  );

  return (
    <main className="flex h-full flex-col">
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-2.5">
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
          <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
            <span>{geoError}</span>
            <button
              onClick={() => setShowGeoHelp(true)}
              className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold underline-offset-2 active:bg-white/30"
            >
              設定方法
            </button>
          </div>
        )}

        {/* チャットパネル(地図の下部に重ねる。閉じれば地図全面) */}
        {chatOpen && (
          <div className="absolute inset-x-0 bottom-0 flex max-h-[45%] flex-col rounded-t-2xl border-t border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-4 pb-1 pt-2">
              <span className="text-xs font-medium text-slate-400">
                チャット(合流後・1時間後に消えます)
              </span>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded-full px-2 py-1 text-xs font-semibold text-slate-400 active:bg-slate-100"
                aria-label="チャットを閉じる"
              >
                閉じる ▾
              </button>
            </div>
            <div
              ref={chatListRef}
              className="min-h-20 flex-1 space-y-1.5 overflow-y-auto px-4 py-1"
            >
              {chatMessages.length === 0 && (
                <p className="py-3 text-center text-xs text-slate-300">
                  まだメッセージはありません
                </p>
              )}
              {chatMessages.map(([key, msg]) => {
                const mine = msg.from === user?.uid;
                const senderName = participants[msg.from]?.name ?? "退出した参加者";
                return (
                  <div
                    key={key}
                    className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
                  >
                    {!mine && (
                      <span
                        className="mb-0.5 ml-1 text-[10px] font-medium"
                        style={{ color: colorOf(msg.from) }}
                      >
                        {senderName}
                      </span>
                    )}
                    <span
                      className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
                        mine
                          ? "rounded-br-md bg-slate-900 text-white"
                          : "rounded-bl-md bg-slate-100 text-slate-800"
                      }`}
                    >
                      {msg.text}
                    </span>
                  </div>
                );
              })}
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
      <footer className="space-y-3 border-t border-slate-100 bg-white px-4 pb-6 pt-3">
        <div className="text-sm">
          {others.length === 0 ? (
            <p className="text-center text-slate-500">
              相手の参加を待っています... 上のボタンからURLを送ってください
            </p>
          ) : (
            <ul className="max-h-24 space-y-1 overflow-y-auto">
              {others.map(([uid, p]) => {
                const d = distanceTo(p);
                const age = now - p.lastUpdate;
                const stale = age >= STALE_MS;
                return (
                  <li key={uid} className="flex items-center justify-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: colorOf(uid), opacity: stale ? 0.4 : 1 }}
                    />
                    {d === null ? (
                      <span className="text-slate-500">
                        {p.name}さんの位置を取得中...
                      </span>
                    ) : (
                      <span
                        className={`font-bold ${stale ? "text-slate-400" : "text-slate-800"}`}
                      >
                        {p.name}さんまで {formatDistance(d)}
                        <span className="ml-2 font-normal text-slate-500">
                          {stale
                            ? `${formatAge(age)}の位置`
                            : `徒歩約${walkingMinutes(d)}分`}
                        </span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

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

      {showGeoHelp && <GeoHelpModal onClose={() => setShowGeoHelp(false)} />}
    </main>
  );
}

function GeoHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[85%] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-semibold tracking-tight">
          位置情報をオンにするには
        </h2>
        <p className="mb-5 text-xs leading-relaxed text-slate-400">
          このアプリは位置情報が許可されていないと相手に自分の場所を伝えられません。お使いの端末に合わせて設定してください。
        </p>

        <div className="space-y-5 text-sm leading-relaxed text-slate-600">
          <div>
            <h3 className="mb-1.5 font-semibold text-slate-900">
              iPhone(Safari)
            </h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>「設定」アプリ → 「プライバシーとセキュリティ」→「位置情報サービス」をオン</li>
              <li>同じ画面の一覧から「Safari」→「このAppの使用中」を選択</li>
              <li>このページに戻って再読み込み。確認が出たら「許可」を押す</li>
            </ol>
          </div>
          <div>
            <h3 className="mb-1.5 font-semibold text-slate-900">
              Android(Chrome)
            </h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>アドレスバー左の鍵アイコン(または「︙」→「設定」)をタップ</li>
              <li>「権限」→「位置情報」→「許可」を選択</li>
              <li>端末の設定で位置情報(GPS)自体がオンかも確認</li>
            </ol>
          </div>
          <div>
            <h3 className="mb-1.5 font-semibold text-slate-900">パソコン</h3>
            <ol className="list-decimal space-y-1 pl-5">
              <li>アドレスバーの鍵アイコンをクリック</li>
              <li>「位置情報」を「許可」にしてページを再読み込み</li>
            </ol>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-slate-900 py-3 text-sm font-semibold text-white active:bg-slate-800"
        >
          閉じる
        </button>
      </div>
    </div>
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
    <main className="flex min-h-full flex-col items-center justify-center bg-white px-6 text-center">
      <div className="mb-4 text-4xl">{emoji}</div>
      <h1 className="mb-2 text-xl font-semibold tracking-tight">{title}</h1>
      {body && (
        <p className="mb-8 text-sm leading-relaxed text-slate-400">{body}</p>
      )}
      {showHomeLink && (
        <a
          href="/"
          className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98] active:bg-slate-800"
        >
          新しい待ち合わせを作る
        </a>
      )}
    </main>
  );
}
