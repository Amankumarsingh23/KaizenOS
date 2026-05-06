"use client";

import { useState, useEffect } from "react";

// Legacy hook — Habits were replaced by StudySessions in the new schema.
// Kept as a placeholder; use useDashboard or direct API calls instead.

export function useHabits() {
  const [habits, setHabits]   = useState<object[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => { setLoading(false); }, []);

  return { habits, loading, error, refetch: () => {}, completeHabit: async () => {} };
}
