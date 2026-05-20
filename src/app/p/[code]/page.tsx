import type { Metadata } from "next";
import { PublicProfileClient } from "./client";

// ─── Generate OG metadata ──────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ code: string }> }
): Promise<Metadata> {
  const { code } = await params;
  const base     = process.env.NEXTAUTH_URL ?? "https://kaizenos.online";

  let name = "KaizenOS Profile";
  let desc = "Placement preparation tracker — DSA, GD, Mock Interviews and more.";

  try {
    const res = await fetch(`${base}/api/p/${code}`, { cache: "no-store" });
    if (res.ok) {
      const p = await res.json();
      name = `${p.name} — Level ${p.level} ${p.levelTitle}`;
      desc = `${p.totalSessions} sessions · ${p.totalHours}h studied · ${p.earnedBadgesCount} badges · ${p.league.emoji} ${p.league.name} League. Grinding for placements on KaizenOS.`;
    }
  } catch { /* ok */ }

  return {
    title: name,
    description: desc,
    openGraph: {
      title:       name,
      description: desc,
      images:      [{ url: `${base}/api/og/${code}`, width: 1200, height: 630, alt: name }],
      siteName:    "KaizenOS",
      type:        "profile",
    },
    twitter: {
      card:        "summary_large_image",
      title:       name,
      description: desc,
      images:      [`${base}/api/og/${code}`],
    },
  };
}

export default function PublicProfilePage({ params }: { params: Promise<{ code: string }> }) {
  return <PublicProfileClient params={params} />;
}
