import { NextResponse } from "next/server";
import webpush, { type PushSubscription, WebPushError } from "web-push";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  const { sessionId, uid } = (await request.json()) as {
    sessionId?: string;
    uid?: string;
  };
  if (!sessionId || !uid) {
    return NextResponse.json({ error: "invalid-request" }, { status: 400 });
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "vapid-not-configured" }, { status: 500 });
  }
  webpush.setVapidDetails("mailto:noreply@dotdotmeet.app", vapidPublic, vapidPrivate);

  const db = getAdminDb();
  const participantRef = db.ref(`sessions/${sessionId}/participants/${uid}`);
  const snapshot = await participantRef.get();
  const subscription = snapshot.val()?.pushSubscription as PushSubscription | undefined;
  if (!subscription) {
    return NextResponse.json({ skipped: true });
  }

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "Dotdot Meet",
        body: "位置情報の更新が止まっています。アプリを開いて更新してください。",
        url: `/session/${sessionId}`,
      })
    );
    return NextResponse.json({ sent: true });
  } catch (err) {
    if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
      await participantRef.child("pushSubscription").remove();
    }
    return NextResponse.json({ error: "send-failed" }, { status: 502 });
  }
}
