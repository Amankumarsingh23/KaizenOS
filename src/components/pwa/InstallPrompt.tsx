"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed]       = useState(false);
  const [installed, setInstalled]       = useState(false);

  useEffect(() => {
    // Check if already dismissed or installed
    if (localStorage.getItem("pwa-install-dismissed")) return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
    }
    setInstallEvent(null);
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  const show = !!installEvent && !dismissed && !installed;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 280, delay: 2 }}
          className="fixed bottom-24 inset-x-4 z-50 md:inset-x-auto md:right-4 md:w-80"
        >
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(45,42,38,0.18)] p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center shrink-0">
                <span className="text-white font-serif font-bold text-lg">K</span>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink font-sans">Add to Home Screen</p>
                <p className="text-xs text-ink/45 font-sans mt-0.5">
                  Install KaizenOS for the best experience — works offline too.
                </p>
              </div>

              {/* Dismiss */}
              <button
                onClick={handleDismiss}
                className="p-1 rounded-lg hover:bg-mist/60 text-ink/30 hover:text-ink/60 shrink-0"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="flex-1 flex items-center justify-center gap-1.5 bg-sage text-white rounded-xl py-2.5 text-xs font-semibold font-sans hover:bg-sage/90 transition-colors"
                style={{ boxShadow: "0 2px 8px rgba(107,143,113,0.30)" }}
              >
                <Download size={13} />
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 rounded-xl bg-mist/60 text-ink/50 text-xs font-sans hover:bg-mist transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
