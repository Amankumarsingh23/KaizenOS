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
  baseElapsed: number;
  lastStartTime: number | null;
}

interface ServerSession {
  category: string;
  startedAt: string;
  lastResumedAt: string;
  baseElapsed: number;
  isPaused: boolean;
}

interface TimerContextValue {
  status: TimerStatus;
  elapsed: number;
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

// Fire-and-forget: sync active session state to server for cross-device hand-off.
// Silently fails when offline — localStorage is the authoritative source for the
// current device; the server is only needed when picking up on another device.
function syncActiveSession(data: ServerSession | null) {
  if (typeof window === "undefined") return;
  if (data === null) {
    fetch("/api/sessions/active", { method: "DELETE" }).catch(() => {});
  } else {
    fetch("/api/sessions/active", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => {});
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus]       = useState<TimerStatus>("idle");
  const [elapsed, setElapsed]     = useState(0);
  const [category, setCategory]   = useState<Category | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const baseElapsed    = useRef(0);
  const lastStartTime  = useRef<number | null>(null);
  const startTimeRef   = useRef<Date | null>(null);
  const workerRef      = useRef<Worker | null>(null);

  // Keep startTimeRef in sync so sync calls in callbacks always have the latest value
  useEffect(() => { startTimeRef.current = startTime; }, [startTime]);

  // ── Boot: restore from localStorage, then check server for cross-device sync ─
  useEffect(() => {
    const saved = loadPersisted();

    if (saved && saved.status !== "idle") {
      setCategory(saved.category);

      if (saved.status === "running" && saved.lastStartTime !== null) {
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
      // Local state wins — no need to check server
      return;
    }

    // No local session — check server (cross-device hand-off)
    fetch("/api/sessions/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((serverSession: ServerSession | null) => {
        if (!serverSession) return;
        const cat          = serverSession.category as Category;
        const startedAt    = new Date(serverSession.startedAt);
        const lastResumedMs = new Date(serverSession.lastResumedAt).getTime();

        if (serverSession.isPaused) {
          baseElapsed.current = serverSession.baseElapsed;
          setElapsed(serverSession.baseElapsed);
          setStartTime(startedAt);
          setCategory(cat);
          setStatus("paused");
          savePersisted({ status: "paused", category: cat, baseElapsed: serverSession.baseElapsed, lastStartTime: null });
        } else {
          const additionalSecs  = Math.floor((Date.now() - lastResumedMs) / 1000);
          const restoredElapsed = serverSession.baseElapsed + additionalSecs;
          baseElapsed.current   = serverSession.baseElapsed;
          lastStartTime.current = lastResumedMs;
          setElapsed(restoredElapsed);
          setStartTime(startedAt);
          setCategory(cat);
          setStatus("running");
          startWorker();
          savePersisted({ status: "running", category: cat, baseElapsed: serverSession.baseElapsed, lastStartTime: lastResumedMs });
        }
      })
      .catch(() => {}); // silent fail if offline
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Visibility sync ─────────────────────────────────────────────────────────
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

  // ── Persist on every meaningful change ──────────────────────────────────────
  useEffect(() => {
    if (status === "idle") { clearPersisted(); return; }
    savePersisted({
      status,
      category,
      baseElapsed: baseElapsed.current,
      lastStartTime: lastStartTime.current,
    });
  }, [status, category, elapsed]);

  // ── Worker ──────────────────────────────────────────────────────────────────
  function startWorker() {
    if (workerRef.current) stopWorker();
    const w = new Worker("/timer-worker.js");
    w.onmessage = (e) => {
      if (e.data.type === "TICK") setElapsed((prev) => prev + 1);
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
    syncActiveSession({ category, startedAt: new Date(now).toISOString(), lastResumedAt: new Date(now).toISOString(), baseElapsed: 0, isPaused: false });
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
    syncActiveSession({ category: cat, startedAt: new Date(now).toISOString(), lastResumedAt: new Date(now).toISOString(), baseElapsed: 0, isPaused: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const pause = useCallback(() => {
    if (status !== "running") return;
    stopWorker();
    baseElapsed.current   = elapsed;
    lastStartTime.current = null;
    setStatus("paused");
    if (category && startTimeRef.current) {
      syncActiveSession({
        category,
        startedAt:     startTimeRef.current.toISOString(),
        lastResumedAt: new Date().toISOString(),
        baseElapsed:   elapsed,
        isPaused:      true,
      });
    }
  }, [status, elapsed, category]);

  const resume = useCallback(() => {
    if (status !== "paused") return;
    const now = Date.now();
    lastStartTime.current = now;
    setStatus("running");
    startWorker();
    if (category && startTimeRef.current) {
      syncActiveSession({
        category,
        startedAt:     startTimeRef.current.toISOString(),
        lastResumedAt: new Date(now).toISOString(),
        baseElapsed:   baseElapsed.current,
        isPaused:      false,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category]);

  const stop = useCallback(() => {
    if (status !== "running" && status !== "paused") return;
    stopWorker();
    baseElapsed.current   = elapsed;
    lastStartTime.current = null;
    setStatus("stopped");
    // Don't sync "stopped" — server keeps "paused/running" so another device
    // doesn't pick up a session that's already in the save dialog
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
    syncActiveSession(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSession = useCallback(async (payload: SavePayload) => {
    if (!category || !startTime) return;
    const endTime         = new Date();
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
      const QUEUE_KEY = "kaizen-offline-queue";
      const raw = localStorage.getItem(QUEUE_KEY) ?? "[]";
      let queue: object[] = [];
      try { queue = JSON.parse(raw); } catch { /* ignore */ }
      queue.push({ ...body, queuedAt: new Date().toISOString() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      window.dispatchEvent(new Event("storage"));
      syncActiveSession(null);
      reset();
      return;
    }

    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch("/api/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        signal:  controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res!.ok) {
      throw new Error(`Save failed (${res!.status})`);
    }

    // Success — clean up
    syncActiveSession(null);
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
