export interface ParsedPhoneReport {
  date:         Date;
  totalMins:    number;
  unlockCount:  number;
  topApps:      { name: string; mins: number; visits: number }[];
  categories:   { name: string; mins: number; pct: number }[];
}

const MONTHS: Record<string, number> = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
  jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
};

function parseMins(str: string): number {
  const h = str.match(/(\d+)\s+hours?/i)?.[1];
  const m = str.match(/(\d+)\s+minutes?/i)?.[1];
  return (h ? Number(h) * 60 : 0) + (m ? Number(m) : 0);
}

export function parseYourHourText(raw: string): ParsedPhoneReport {
  const text = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // ── Date ──────────────────────────────────────────────────────────────────
  const dateMatch = text.match(
    /Daily Usage Report\s*[-–]\s*(\d{1,2})\s+(\w+),?\s*(\d{2,4})/i
  );
  let date = new Date();
  if (dateMatch) {
    const [, day, mon, yr] = dateMatch;
    const mo = MONTHS[mon.toLowerCase()] ?? 5;
    const year = Number(yr) < 100 ? 2000 + Number(yr) : Number(yr);
    date = new Date(year, mo - 1, Number(day));
  }

  // ── Total screen time ─────────────────────────────────────────────────────
  // Match the MAIN usage block (the large number before the word "Usage")
  const usageHM = text.match(/(\d+)h\s+(\d+)m[\s\S]{0,30}Usage/);
  const usageHOnly = text.match(/(\d+)h[\s\S]{0,20}Usage/);
  let totalMins = 0;
  if (usageHM) {
    totalMins = Number(usageHM[1]) * 60 + Number(usageHM[2]);
  } else if (usageHOnly) {
    totalMins = Number(usageHOnly[1]) * 60;
  }

  // ── Unlocks ───────────────────────────────────────────────────────────────
  const unlockMatch = text.match(/(\d+)\s*times[\s\S]{0,20}Unlocks?/i);
  const unlockCount = unlockMatch ? Number(unlockMatch[1]) : 0;

  // ── Top apps ──────────────────────────────────────────────────────────────
  const appsSection = text.split(/Top\s+5?\s*Used\s+Apps?/i)[1]
    ?.split(/Top\s+Categories?/i)[0] ?? "";

  const topApps: ParsedPhoneReport["topApps"] = [];
  const appLines = appsSection.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < appLines.length; i++) {
    if (/^Usage Time:/i.test(appLines[i])) {
      const mins    = parseMins(appLines[i]);
      const visLine = appLines[i + 1] ?? "";
      const visits  = Number(visLine.replace(/Visits?:/i, "").trim()) || 0;
      // Name is the last non-metadata line before "Usage Time:"
      let name = "";
      for (let k = i - 1; k >= 0; k--) {
        if (!/^(Usage|Visits?)/i.test(appLines[k]) && appLines[k]) {
          name = appLines[k]; break;
        }
      }
      if (name) topApps.push({ name, mins, visits });
      i++;
    }
  }

  // ── Categories ────────────────────────────────────────────────────────────
  const catSection = text.split(/Top\s+Categories?/i)[1] ?? "";
  const categories: ParsedPhoneReport["categories"] = [];
  const catLines = catSection.split("\n").map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < catLines.length; i++) {
    const pctM = catLines[i].match(/^(\d+)%$/);
    if (pctM) {
      const pct     = Number(pctM[1]);
      // look back for time and name
      const timeLine = catLines[i - 1] ?? "";
      const nameLine = catLines[i - 2] ?? "";
      const mins     = parseMins(timeLine);
      if (nameLine && !/^\d/.test(nameLine) && !/hours?|minutes?/i.test(nameLine) && mins > 0) {
        categories.push({ name: nameLine, mins, pct });
      }
    }
  }

  return { date, totalMins, unlockCount, topApps, categories };
}

/** How many hours/day is "too much" — the threshold for the warning zone */
export const SCREEN_TIME_WARNING_MINS = 4 * 60;   // 4 h
export const SCREEN_TIME_DANGER_MINS  = 6 * 60;   // 6 h
export const UNLOCK_WARNING           = 60;
