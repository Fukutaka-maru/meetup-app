import {
  ref,
  set,
  get,
  update,
  remove,
  push,
} from "firebase/database";
import { customAlphabet } from "nanoid";
import { getDb } from "./firebase";

/** セッション有効期限: 1時間 */
export const SESSION_TTL_MS = 60 * 60 * 1000;
/** 1セッションの最大参加人数 */
export const MAX_PARTICIPANTS = 8;

const generateId = customAlphabet(
  "abcdefghijkmnpqrstuvwxyz23456789", // 紛らわしい文字(l/1/o/0)を除外
  12
);

export type Participant = {
  name: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  lastUpdate: number;
  pushSubscription?: PushSubscriptionJSON;
};

export type Message = {
  from: string;
  text: string;
  at: number;
};

export type SessionData = {
  createdAt: number;
  expiresAt: number;
  status: "active" | "completed";
  participants?: Record<string, Participant>;
  messages?: Record<string, Message>;
};

export function sessionRef(sessionId: string) {
  return ref(getDb(), `sessions/${sessionId}`);
}

/** セッションを作成し、自分を最初の参加者として登録する */
export async function createSession(
  uid: string,
  name: string
): Promise<string> {
  const sessionId = generateId();
  const now = Date.now();
  const data: SessionData = {
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
    status: "active",
    participants: {
      [uid]: { name, lastUpdate: now },
    },
  };
  await set(sessionRef(sessionId), data);
  return sessionId;
}

/** セッションに参加する(満員・期限切れならエラー) */
export async function joinSession(
  sessionId: string,
  uid: string,
  name: string
): Promise<void> {
  const snapshot = await get(sessionRef(sessionId));
  const session = snapshot.val() as SessionData | null;
  if (!session) throw new Error("session-not-found");
  if (session.status !== "active") throw new Error("session-completed");
  if (session.expiresAt < Date.now()) throw new Error("session-expired");

  const participants = session.participants ?? {};
  if (!participants[uid] && Object.keys(participants).length >= MAX_PARTICIPANTS) {
    throw new Error("session-full");
  }
  await set(ref(getDb(), `sessions/${sessionId}/participants/${uid}`), {
    name,
    lastUpdate: Date.now(),
  } satisfies Participant);
}

/** 自分の現在位置を更新する */
export async function updateLocation(
  sessionId: string,
  uid: string,
  lat: number,
  lng: number,
  accuracy: number
): Promise<void> {
  await update(ref(getDb(), `sessions/${sessionId}/participants/${uid}`), {
    lat,
    lng,
    accuracy,
    lastUpdate: Date.now(),
  });
}

/** プッシュ通知の購読情報を保存する */
export async function savePushSubscription(
  sessionId: string,
  uid: string,
  subscription: PushSubscriptionJSON
): Promise<void> {
  await update(ref(getDb(), `sessions/${sessionId}/participants/${uid}`), {
    pushSubscription: subscription,
  });
}

/** 定型文メッセージを送る */
export async function sendMessage(
  sessionId: string,
  uid: string,
  text: string
): Promise<void> {
  await push(ref(getDb(), `sessions/${sessionId}/messages`), {
    from: uid,
    text,
    at: Date.now(),
  } satisfies Message);
}

/** 合流完了: statusを更新してから少し待ってセッションごと削除する */
export async function completeSession(sessionId: string): Promise<void> {
  await update(sessionRef(sessionId), { status: "completed" });
  // 相手のクライアントがstatus変更を受信する猶予を置いてから削除
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await remove(sessionRef(sessionId));
}

/** 期限切れセッションを削除する */
export async function deleteSession(sessionId: string): Promise<void> {
  await remove(sessionRef(sessionId));
}
