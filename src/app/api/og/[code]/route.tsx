import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const base = req.nextUrl.origin;

  // Fetch public profile data
  let profile: {
    name: string; image?: string; level: number; levelTitle: string;
    xp: number; weeklyXp: number; league: { name: string; emoji: string };
    totalSessions: number; totalHours: number; avgScore: number | null;
    earnedBadgesCount: number; activeDays90: number;
    bestStreaks: { category: string; current: number; active: boolean }[];
    featuredBadges: { emoji: string; name: string }[];
  } | null = null;

  try {
    const res = await fetch(`${base}/api/p/${code}`);
    if (res.ok) profile = await res.json();
  } catch { /* ok */ }

  if (!profile) {
    return new ImageResponse(
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F0E8" }}>
        <p style={{ color: "#8B8075", fontFamily: "sans-serif" }}>Profile not found</p>
      </div>,
      { width: 1200, height: 630 }
    );
  }

  const topStreak = profile.bestStreaks.find((s) => s.active && s.current > 0);

  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        background: "linear-gradient(135deg, #F5F0E8 0%, #FAF7F0 100%)",
        padding: "60px",
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: "40px" }}>
        {profile.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.image} width={96} height={96}
            style={{ borderRadius: "50%", marginRight: "24px", border: "4px solid white" }} />
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <p style={{ fontSize: 40, fontWeight: "bold", color: "#2D2A26", margin: 0 }}>{profile.name}</p>
          <p style={{ fontSize: 20, color: "#6B8F71", margin: "4px 0 0 0", fontFamily: "sans-serif" }}>
            Level {profile.level} · {profile.levelTitle}
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <p style={{ fontSize: 28, margin: 0 }}>{profile.league.emoji}</p>
          <p style={{ fontSize: 18, color: "#8B8075", fontFamily: "sans-serif", margin: "4px 0 0 0" }}>{profile.league.name} League</p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "36px" }}>
        {[
          { label: "Sessions",    value: profile.totalSessions.toString() },
          { label: "Hours",       value: `${profile.totalHours}h` },
          { label: "Avg Score",   value: profile.avgScore ? `${profile.avgScore}/100` : "—" },
          { label: "Active Days", value: `${profile.activeDays90}` },
          { label: "XP",          value: profile.xp.toLocaleString() },
          { label: "Badges",      value: profile.earnedBadgesCount.toString() },
        ].map(({ label, value }) => (
          <div key={label} style={{
            flex: 1, background: "white", borderRadius: 16, padding: "16px 20px",
            display: "flex", flexDirection: "column", alignItems: "center",
            boxShadow: "0 2px 8px rgba(45,42,38,0.08)",
          }}>
            <p style={{ fontSize: 26, fontWeight: "bold", color: "#2D2A26", margin: 0 }}>{value}</p>
            <p style={{ fontSize: 13, color: "#8B8075", fontFamily: "sans-serif", margin: "4px 0 0 0" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Bottom: streak + badges + watermark */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {topStreak && (
            <p style={{ fontSize: 22, color: "#C4A35A", fontFamily: "sans-serif", margin: 0 }}>
              🔥 {topStreak.current}-day {topStreak.category.replace(/_/g," ")} streak
            </p>
          )}
          {profile.featuredBadges.length > 0 && (
            <div style={{ display: "flex", gap: "12px" }}>
              {profile.featuredBadges.map((b) => (
                <div key={b.name} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <p style={{ fontSize: 36, margin: 0 }}>{b.emoji}</p>
                  <p style={{ fontSize: 11, color: "#8B8075", fontFamily: "sans-serif", margin: "2px 0 0 0" }}>{b.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <p style={{ fontSize: 16, color: "#6B8F71", fontFamily: "sans-serif", margin: 0 }}>⚡ KaizenOS</p>
          <p style={{ fontSize: 13, color: "#C4C0BB", fontFamily: "sans-serif", margin: "4px 0 0 0" }}>
            kaizenos.online/p/{code.toLowerCase()}
          </p>
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
