"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import type { Category } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TimerStatus = "idle" | "running" | "paused" | "stopped";

export interface SavePayload {
  notes: string;
  selfRating: number;
  subcategory?: string;
  metadata?: Record<string, string>;
}

interface PersistedState {
  status: TimerStatus;
  category: Category | null;
  baseElapsed: number;   // seconds before the last start/resume
  lastStartTime: number | null; // epoch ms of last start/resume
}

interface TimerContextValue {
  status: TimerStatus;
  elapsed: number;        // live seconds
  category: Category | null;
  startTime: Date | null;
  selectCategory: (cat: Category) => void;
  start: () => void;
  startWithCategory: (cat: Category) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  saveSession: (payload: SavePayload) => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "kaizen-timer";

function loadPersisted(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function savePersisted(state: PersistedState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearPersisted() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus]     = useState<TimerStatus>("idle");
  const [elapsed, setElapsed]   = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  // baseElapsed is the elapsed count before the current running segment
  const baseElapsed    = useRef(0);
  const lastStartTime  = useRef<number | null>(null);
  const workerRef      = useRef<Worker | null>(null);

  // ── Boot: restore persisted state ──────────────────────────────────────────
  useEffect(() => {
    const saved = loadPersisted();
    if (!saved) return;

    setCategory(saved.category);

    if (saved.status === "running" && saved.lastStartTime !== null) {
      // Recalculate elapsed including the time the tab was closed
      const additionalSecs = Math.floor((Date.now() - saved.lastStartTime) / 1000);
      const restoredElapsed = saved.baseElapsed + additionalSecs;
      baseElapsed.current   = saved.baseElapsed;
      lastStartTime.current = saved.lastStartTime;
      setElapsed(restoredElapsed);
      setStartTime(new Date(saved.lastStartTime - saved.baseElapsed * 1000));
      setStatus("running");
      startWorker();
    } else if (saved.status === "paused") {
      baseElapsed.current = saved.baseElapsed;
      setElapsed(saved.baseElapsed);
      setStartTime(
        saved.lastStartTime
          ? new Date(saved.lastStartTime - saved.baseElapsed * 1000)
          : null
      );
      setStatus("paused");
    } else if (saved.status === "stopped") {
      baseElapsed.current = saved.baseElapsed;
      setElapsed(saved.baseElapsed);
      setStatus("stopped");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Visibility sync: re-calc elapsed when tab comes back into focus ─────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && status === "running" && lastStartTime.current !== null) {
        const additionalSecs = Math.floor((Date.now() - lastStartTime.current) / 1000);
        setElapsed(baseElapsed.current + additionalSecs);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [status]);

  // ── Persist on every meaningful change ─────────────────────────────────────
  useEffect(() => {
    if (status === "idle") { clearPersisted(); return; }
    savePersisted({
      status,
      category,
      baseElapsed: baseElapsed.current,
      lastStartTime: lastStartTime.current,
    });
  }, [status, category, elapsed]);

  // ── Worker management ───────────────────────────────────────────────────────
  function startWorker() {
    if (workerRef.current) stopWorker();
    const w = new Worker("/timer-worker.js");
    w.onmessage = (e) => {
      if (e.data.type === "TICK") {
        setElapsed((prev) => prev + 1);
      }
    };
    w.postMessage({ type: "START" });
    workerRef.current = w;
  }

  function stopWorker() {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: "STOP" });
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }

  useEffect(() => () => stopWorker(), []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const selectCategory = useCallback((cat: Category) => {
    if (status !== "idle") return;
    setCategory(cat);
  }, [status]);

  const start = useCallback(() => {
    if (!category || status !== "idle") return;
    const now = Date.now();
    baseElapsed.current   = 0;
    lastStartTime.current = now;
    setElapsed(0);
    setStartTime(new Date(now));
    setStatus("running");
    startWorker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status]);

  const startWithCategory = useCallback((cat: Category) => {
    if (status !== "idle") return;
    const now = Date.now();
    baseElapsed.current   = 0;
    lastStartTime.current = now;
    setCategory(cat);
    setElapsed(0);
    setStartTime(new Date(now));
    setStatus("running");
    startWorker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const pause = useCallback(() => {
    if (status !== "running") return;
    stopWorker();
    // Freeze baseElapsed at current elapsed
    baseElapsed.current = elapsed;
    lastStartTime.current = null;
    setStatus("paused");
  }, [status, elapsed]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    const now = Date.now();
    lastStartTime.current = now;
    setStatus("running");
    startWorker();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const stop = useCallback(() => {
    if (status !== "running" && status !== "paused") return;
    stopWorker();
    baseElapsed.current = elapsed;
    lastStartTime.current = null;
    setStatus("stopped");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, elapsed]);

  const reset = useCallback(() => {
    stopWorker();
    baseElapsed.current   = 0;
    lastStartTime.current = null;
    setElapsed(0);
    setStartTime(null);
    setCategory(null);
    setStatus("idle");
    clearPersisted();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSession = useCallback(async (payload: SavePayload) => {
    if (!category || !startTime) return;
    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));

    const body = {
      category,
      subcategory:     payload.subcategory ?? null,
      startTime:       startTime.toISOString(),
      endTime:         endTime.toISOString(),
      durationMinutes,
      notes:           payload.notes,
      selfRating:      payload.selfRating,
      metadata:        payload.metadata ? JSON.stringify(payload.metadata) : null,
    };

    if (!navigator.onLine) {
      // Queue for later sync
      const QUEUE_KEY = "kaizen-offline-queue";
      const raw = localStorage.getItem(QUEUE_KEY) ?? "[]";
      let queue: object[] = [];
      try { queue = JSON.parse(raw); } catch { /* ignore */ }
      queue.push({ ...body, queuedAt: new Date().toISOString() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new Event("storage")); // trigger OfflineBanner update
    } else {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    reset();
  }, [category, startTime, elapsed, reset]);

  return (
    <TimerContext.Provider value={{
      status, elapsed, category, startTime,
      selectCategory, start, startWithCategory, pause, resume, stop, reset, saveSession,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}
