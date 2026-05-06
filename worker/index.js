// Custom service worker code merged by next-pwa into sw.js
// Handles: push notifications, notification clicks, background sync

// ─── Push Notifications ────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: "KaizenOS", body: event.data.text() }; }

  const {
    title = "KaizenOS",
    body  = "",
    icon  = "/icon.svg",
    badge = "/icon.svg",
    tag   = "kaizen-notification",
    url   = "/",
    data  = {},
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { url, ...data },
    })
  );
});

// ─── Notification Click ────────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      // Focus existing window if open
      for (const win of wins) {
        if (win.url.includes(self.location.origin) && "focus" in win) {
          win.postMessage({ type: "NOTIFICATION_CLICK", url: targetUrl });
          return win.focus();
        }
      }
      // Open a new window
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

// ─── Background Sync (session queue) ──────────────────────────────────────────

self.addEventListener("sync", (event) => {
  if (event.tag === "sync-sessions") {
    event.waitUntil(syncQueuedSessions());
  }
});

async function syncQueuedSessions() {
  // The main app handles the actual sync via the useOfflineQueue hook
  // This sends a message to the active client to trigger sync
  const allClients = await clients.matchAll({ type: "window" });
  for (const client of allClients) {
    client.postMessage({ type: "SYNC_OFFLINE_QUEUE" });
  }
}

// ─── Install / Activate ────────────────────────────────────────────────────────

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});
