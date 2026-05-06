"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export function OfflineBanner() {
  const [isOnline, setIsOnline]       = useState(true);
  const [showBack, setShowBack]       = useState(false);
  const [hasQueue, setHasQueue]       = useState(false);
  const [syncing, setSyncing]         = useState(false);

  useEffect(() => {
    // Initial state
    setIsOnline(navigator.onLine);

    const queueRaw = localStorage.getItem("kaizen-offline-queue");
    if (queueRaw) {
      try { setHasQueue(JSON.parse(queueRaw).length > 0); } catch { /* ignore */ }
    }

    const goOnline = async () => {
      setIsOnline(true);
      setShowBack(true);
      await processQueue();
      setTimeout(() => setShowBack(false), 3500);
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also listen for queue updates
  useEffect(() => {
    const check = () => {
      const raw = localStorage.getItem("kaizen-offline-queue");
      try { setHasQueue(raw ? JSON.parse(raw).length > 0 : false); } catch { /* ignore */ }
    };
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  async function processQueue() {
    const raw = localStorage.getItem("kaizen-offline-queue");
    if (!raw) return;
    let queue: object[] = [];
    try { queue = JSON.parse(raw); } catch { return; }
    if (!queue.length) return;

    setSyncing(true);
    const failed: object[] = [];
    for (const session of queue) {
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session),
        });
        if (!res.ok) failed.push(session);
      } catch {
        failed.push(session);
      }
    }
    localStorage.setItem("kaizen-offline-queue", JSON.stringify(failed));
    setHasQueue(failed.length > 0);
    setSyncing(false);
  }

  const showOffline = !isOnline;
  const showOnline  = isOnline && showBack;

  return (
    <AnimatePresence>
      {(showOffline || showOnline) && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className={[
            "fixed top-0 inset-x-0 z-50 px-4 py-3 flex items-center gap-3",
            showOffline
              ? "bg-terracotta/95 text-white"
              : "bg-sage/95 text-white",
            "backdrop-blur-sm shadow-lg",
          ].join(" ")}
        >
          {showOffline ? (
            <WifiOff size={16} className="shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="shrink-0" />
          )}
          <p className="text-sm font-sans font-medium flex-1">
            {showOffline
              ? hasQueue
                ? "You're offline — sessions will sync when you reconnect"
                : "You're offline — sessions will be queued"
              : syncing
                ? "Back online — syncing queued sessions…"
                : "Back online! All sessions synced."}
          </p>
          {showOffline && (
            <button
              onClick={() => window.location.reload()}
              className="shrink-0 flex items-center gap-1 text-xs opacity-70 hover:opacity-100"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
