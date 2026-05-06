"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, Loader2 } from "lucide-react";

type Permission = "default" | "granted" | "denied";
type SetupState = "idle" | "requesting" | "subscribing" | "done" | "error";

async function subscribe(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

  // Get VAPID public key
  const keyRes  = await fetch("/api/notifications/subscribe");
  const { publicKey } = await keyRes.json();
  if (!publicKey) return false;

  const reg     = await navigator.serviceWorker.ready;
  const sub     = await reg.pushManager.subscribe({
    userVisibleOnly:       true,
    applicationServerKey:  publicKey,
  });

  const json    = sub.toJSON();
  const saveRes = await fetch("/api/notifications/subscribe", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      endpoint: json.endpoint,
      keys:     { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    }),
  });

  return saveRes.ok;
}

export function NotificationSetup() {
  const [permission, setPermission] = useState<Permission>("default");
  const [state, setState]           = useState<SetupState>("idle");
  const [dismissed, setDismissed]   = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission as Permission);
    if (localStorage.getItem("notif-prompt-dismissed")) setDismissed(true);
  }, []);

  async function handleEnable() {
    setState("requesting");
    const perm = await Notification.requestPermission();
    setPermission(perm as Permission);

    if (perm !== "granted") {
      setState("error");
      return;
    }

    setState("subscribing");
    const ok = await subscribe();
    setState(ok ? "done" : "error");
    if (ok) {
      localStorage.setItem("notif-prompt-dismissed", "1");
      setTimeout(() => setDismissed(true), 2000);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("notif-prompt-dismissed", "1");
  }

  const show =
    !dismissed &&
    (permission as string) === "default" &&
    typeof window !== "undefined" &&
    "Notification" in window &&
    !localStorage.getItem("notif-prompt-dismissed");

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ delay: 4, duration: 0.25 }}
          className="fixed bottom-28 inset-x-4 z-40 md:inset-x-auto md:right-4 md:w-80"
        >
          <div className="bg-parchment border border-mist/60 rounded-2xl shadow-[0_4px_24px_rgba(45,42,38,0.12)] p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-sage/10 flex items-center justify-center shrink-0">
                <Bell size={15} className="text-sage" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink font-sans">Enable notifications?</p>
                <p className="text-[11px] text-ink/45 font-sans mt-0.5 leading-relaxed">
                  Get morning plans, streak alerts, and your evening summary.
                </p>
              </div>
              <button onClick={handleDismiss} className="p-1 text-ink/25 hover:text-ink/50">
                <X size={13} />
              </button>
            </div>

            {state === "done" ? (
              <p className="text-xs text-sage font-sans font-medium text-center py-1.5">
                ✓ Notifications enabled!
              </p>
            ) : state === "error" ? (
              <p className="text-xs text-terracotta font-sans text-center py-1.5">
                {(permission as string) === "denied"
                  ? "Blocked in browser settings — please enable manually"
                  : "Something went wrong. Try again later."}
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleEnable}
                  disabled={state !== "idle"}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-sage text-white rounded-xl py-2 text-xs font-semibold font-sans disabled:opacity-60"
                >
                  {state !== "idle" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Bell size={12} />
                  )}
                  {state === "requesting"  ? "Requesting…" :
                   state === "subscribing" ? "Setting up…" : "Enable"}
                </button>
                <button onClick={handleDismiss}
                  className="flex items-center gap-1 px-3 rounded-xl bg-mist/60 text-ink/40 text-xs font-sans hover:bg-mist">
                  <BellOff size={11} /> Skip
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
