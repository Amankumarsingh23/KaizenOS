import webpush from "web-push";

const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     ?? "mailto:admin@kaizenos.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export { webpush };

export interface PushPayload {
  title:   string;
  body:    string;
  icon?:   string;
  badge?:  string;
  tag?:    string;
  url?:    string;
  data?:   Record<string, unknown>;
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload
): Promise<{ ok: boolean; error?: string }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({ icon: "/icon.svg", badge: "/icon.svg", ...payload }),
      { urgency: "normal", TTL: 86400 }
    );
    return { ok: true };
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode;
    return { ok: false, error: String(err), ...(code && { code }) };
  }
}
