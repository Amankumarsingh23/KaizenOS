"use client";

import { useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark";

function applyTheme(t: Theme, animated = false) {
  const html = document.documentElement;
  if (animated) {
    html.classList.add("theme-transitioning");
    setTimeout(() => html.classList.remove("theme-transitioning"), 320);
  }
  html.setAttribute("data-theme", t);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");

  useEffect(() => {
    const saved = (localStorage.getItem("kaizen-theme") ?? "light") as Theme;
    setThemeState(saved);
    applyTheme(saved, false); // no transition on initial load
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("kaizen-theme", t);
    applyTheme(t, true); // smooth transition when user manually changes
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
