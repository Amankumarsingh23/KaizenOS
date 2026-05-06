"use client";

import { useEffect, useCallback } from "react";

const QUEUE_KEY = "kaizen-offline-queue";

interface QueuedSession {
  category:        string;
  subcategory?:    string | null;
  startTime:       string;
  endTime?:        string | null;
  durationMinutes: number;
  notes:           string;
  selfRating:      number;
  metadata?:       string | null;
  queuedAt:        string;
}

export function useOfflineQueue() {
  // Attempt to sync on mount and when back online
  const sync = useCallback(async () => {
    if (!navigator.onLine) return;

    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    let queue: QueuedSession[] = [];
    try { queue = JSON.parse(raw); } catch { return; }
    if (!queue.length) return;

    const failed: QueuedSession[] = [];
    for (const session of queue) {
      try {
        const res = await fetch("/api/sessions", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(session),
        });
        if (!res.ok) failed.push(session);
      } catch {
        failed.push(session);
      }
    }

    if (failed.length < queue.length) {
      // Some synced — update storage
      localStorage.setItem(QUEUE_KEY, JSON.stringify(failed));
      window.dispatchEvent(new Event("storage"));
    }
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("online", sync);

    // Listen for SW SYNC_OFFLINE_QUEUE message
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "SYNC_OFFLINE_QUEUE") sync();
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", sync);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, [sync]);

  const enqueue = useCallback((session: Omit<QueuedSession, "queuedAt">) => {
    const raw = localStorage.getItem(QUEUE_KEY) ?? "[]";
    let queue: QueuedSession[] = [];
    try { queue = JSON.parse(raw); } catch { /* ignore */ }

    queue.push({ ...session, queuedAt: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("storage"));

    // Request background sync if available
    if ("serviceWorker" in navigator && "sync" in ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready
        .then((reg) => (reg as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register("sync-sessions"))
        .catch(() => {/* ignore */});
    }
  }, []);

  const queueLength = useCallback((): number => {
    const raw = localStorage.getItem(QUEUE_KEY) ?? "[]";
    try { return (JSON.parse(raw) as unknown[]).length; } catch { return 0; }
  }, []);

  return { enqueue, sync, queueLength };
}
