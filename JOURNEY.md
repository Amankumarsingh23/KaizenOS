# The KaizenOS Journey

> *How a placement prep tracker became a personal operating system — built entirely during the pressure of placement season.*

---

## The Origin

It started with a simple frustration: every productivity app was either too generic or too complex. There was nothing built specifically for the chaos of Indian placement season — where you need to track DSA problems, GD practice, mock interviews, current affairs, and company applications all at once, while also maintaining your mental health.

So Aman Kumar Singh — a student at IIT Kanpur preparing for tech placements — decided to build it himself.

The stack was chosen deliberately: **Next.js 16** with App Router (because the docs exist), **Prisma v7** (because it was the latest), **Supabase PostgreSQL** (because SQLite on Vercel doesn't scale), and **Tailwind CSS v4** (because it was brand new and interesting). Each of these choices would later create their own unique form of suffering.

---

## Chapter 1 — The Foundation

**Commit: `f87bffd` — Initial commit from Create Next App**

Day one. A blank Next.js project. The vision was simple: a timer, session logging, and streaks. Build fast. Ship something.

The first major architectural decision: **skip SQLite entirely**. Most tutorials start with SQLite for simplicity. This project was born production-ready — Supabase PostgreSQL from day one. This turned out to be both the right call and the source of many future battles.

The design system was built first — a warm, parchment-inspired palette (`cream #F5F0E8`, `ink #2D2A26`, `sage #6B8F71`, `gold #C4A35A`, `terracotta #C47D5A`) with Newsreader (serif), DM Sans (body), and JetBrains Mono (code). The goal: feel like a premium notebook, not a corporate dashboard.

---

## Chapter 2 — Deployment Hell (Act One)

**Commit: `2023402` — chore: prepare for production**

The first attempt at deployment revealed something nobody tells you: **Prisma v7 is not the Prisma you know from tutorials.**

The schema had `url` and `directUrl` inside the `datasource` block. Prisma v7 moved these to `prisma.config.ts`. Every deployment failed with `P1012`. Three hours of debugging a configuration file nobody documents well.

Then: the SQLite → PostgreSQL migration. The old schema had `@@map("Session")` on `StudySession` to avoid naming conflicts with NextAuth. The migration history was SQLite. The new database was PostgreSQL. `migration_lock.toml` refused to let us proceed. Solution: delete all migrations, start fresh with `prisma migrate dev --name init`.

It worked. Then immediately broke again — the `datasource` block still had `url` and `directUrl` in the schema file. Vercel was running a fresh `prisma generate` on every build and hitting the same error.

**Fixes shipped in rapid succession:**
- Moved connection URLs to `prisma.config.ts`
- Added `@prisma/adapter-pg` for serverless PostgreSQL connections
- Rebuilt the entire DB client in `db.ts` with proper SSL configuration

---

## Chapter 3 — The SSL War

**Commits: `de44dd4`, `8cc09fa`, `327f845`**

With the schema fixed, data still wasn't saving. A health endpoint (`/api/health`) was added to diagnose:

```json
{
  "db": "error",
  "message": "Error opening a TLS connection: self-signed certificate in certificate chain"
}
```

Supabase uses a self-signed certificate in their chain. The `pg` library rejects it by default. The `sslmode=require` parameter in the DATABASE_URL was conflicting with the explicit `ssl` options passed to the Pool.

The fix took three iterations:
1. Add `ssl: { rejectUnauthorized: false }` to the Pool — still failing
2. Strip `pgbouncer` and `connection_limit` params — better, still SSL error
3. Also strip `sslmode` from the URL — works

The database connected. Sessions started saving. The SSL war was over (for now — it would return later in a more brutal form).

---

## Chapter 4 — Auth Loop Nightmare

**Commits: `04ff3be`, `91eea70`, `dd1ff96`, `327f845`**

Login worked on mobile data. Broke on WiFi. Every other browser. Every incognito window. `error=Callback` on loop.

The `@next-auth/prisma-adapter` — which had been faithfully adapted from tutorials — was incompatible with Prisma v7's driver adapter model. It created its own Prisma client internally, without the SSL bypass, and hit the same SSL error during `getUserByAccount`.

The investigation path:
1. Added `debug: true` to NextAuth — more logs, same error
2. Tried fixing the model ID (`claude-sonnet-4-6` → `claude-3-5-sonnet-20241022`) — different problem
3. Removed `PrismaAdapter` entirely — replaced with manual user upsert in JWT callback
4. Decoupled auth from database entirely — JWT callback stores email as token ID, `getUserId()` helper creates users lazily on first API request
5. Rewrote all 18 API routes to use `getUserId(session)` instead of `session.user.id`

Login worked. Sessions saved. Users created. The app was alive on mobile data.

---

## Chapter 5 — The Service Worker Trap

**Commits: `f418ae5`, `3576bd2`, `4e018be`**

Deployed a new feature. Nothing changed. Deployed it again. Still nothing. The app was stuck in time.

The PWA service worker — configured with `next-pwa` and a single wildcard `NetworkFirst` rule — was caching everything, including API routes, with a 10-second fallback. Every new deployment served stale JavaScript from cache. Users were running code from a week ago while the server had the latest.

The fix: rewrote the `next.config.ts` caching rules — `NetworkOnly` for all `/api/*` routes, `CacheFirst` for static assets, short timeout for pages.

When even that wasn't enough: removed `next-pwa` entirely and added a `SwKiller` component that unregisters all service workers and clears all caches on every page load. Nuclear but effective.

---

## Chapter 6 — Feature Velocity

*May 2026 — the productive weeks*

With the infrastructure stable, features shipped fast:

**Week 1:**
- GD Topics personalized per user (seeded 40 topics × 8 categories)
- Interview Question bank (36 pre-seeded questions across HR/Technical/System Design)
- Monthly analytics fixed — Target vs Actual now shows even without targets set
- Growth Wheel (radar chart) fixed to use default targets as fallback
- AI switched from Anthropic (insufficient credits) to Groq free tier (Llama 3.3 70B)
- Auto-report generation using Next.js `after()` — fires after every session save

**Week 2:**
- Placement Pipeline — company tracker with round logging, status flow, analytics funnel
- GD Session Logging — score, duration, group size, initiated/concluded tracking
- Interview Attempt History — multi-attempt notes, rating trends
- Friend Leaderboard — 8-char friend codes, weekly study hours ranking
- Preparation Health Score — 6-dimension weighted radar
- DSA Skill Map — 28-topic self-rating grid
- Narrative Timeline — month-by-month journey

**Week 3:**
- Codeforces Integration — upcoming contests, live countdowns, push reminders, rating history
- CF Phase 3 — problem stats, difficulty breakdown, 365-day submission calendar, tag performance
- Auto-sync CF tag history → DSA Skill Map
- LeetCode Stats via GraphQL — toggle on contests page
- GitHub Activity per Project — link a repo, see commit history in project dashboard
- Weekly AI Report — comprehensive Sunday retrospective, downloadable as PDF via `window.print()`

---

## Chapter 7 — The Custom Domain Saga

*May 13-14, 2026 — the final boss*

`kaizenos.online` was purchased on GoDaddy. The plan: Cloudflare proxy → Vercel → SSL everywhere → WiFi routing fixed.

**The sequence of failures:**

1. Nameservers transferred to Cloudflare → DNS propagation begins
2. Cloudflare proxy turned on too early → `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`
3. SSL mode set to Flexible → HTTPS between browser and Cloudflare, HTTP between Cloudflare and Vercel → broken auth
4. Turn proxy off → site loads → turn proxy on with SSL=Full → works
5. GitHub OAuth callback URL still pointing to old Vercel subdomain → `error=Callback` loop
6. Updated GitHub OAuth + `NEXTAUTH_URL` → deployed → same error
7. Discovered: **Vercel's build cache was serving the old bundle on every deploy** — chunk IDs `__0~q6vs5` and `__0sz14jb` remained identical across 8 consecutive deployments
8. Project deleted, redeployed fresh → cache gone → new deployment actually runs new code
9. `OAuthAccountNotLinked` — old user records in DB had no linked Account row
10. Added `allowDangerousEmailAccountLinking: true` → login works
11. 🎉

**Total time on auth alone: approximately 12 hours across multiple days.**

---

## Chapter 8 — What Was Built

When it was all done, KaizenOS had:

- **15 distinct pages** with full mobile responsiveness
- **40+ API routes** covering sessions, analytics, AI, placement, contests, GitHub, LeetCode, leaderboard, friends, GD, interview, journal, projects, settings
- **16 database models** across users, study sessions, daily/weekly reports, streaks, targets, GD topics/sessions, interview questions/attempts, companies/rounds, DSA skills, friendships, contest reminders, projects/milestones
- **3 external API integrations** (Codeforces, LeetCode GraphQL, GitHub REST)
- **Full AI pipeline** (Groq Llama 3.3 70B → daily coaching + weekly comprehensive reports)
- **2 Vercel cron jobs** (daily contest reminders at 1:30 PM IST, weekly reports every Sunday at 7:30 PM IST)
- **Web Push notifications** for contest reminders
- **PDF report downloads** via `window.print()` with print-optimized CSS

---

## Lessons

**1. Read the changelog.** Prisma v7 broke almost every tutorial. Next.js 16 Turbopack has subtle differences. Tailwind v4 moves config to CSS. None of these are documented where you'd look first.

**2. Infrastructure first.** The SSL bug, the service worker cache, the auth loop — all infrastructure. No amount of feature work matters when the foundation is leaking. Fix the boring stuff before it becomes a crisis.

**3. Debug with data, not assumptions.** The auth loop was guessed at for hours. Adding one logger line revealed the exact error in seconds. `[NEXTAUTH_ERROR] adapter_getUserByAccount`. That's it. That's the whole diagnosis.

**4. Vercel build cache is real.** Eight identical deployments serving stale code because of build cache. The fix was deleting the project entirely. Sometimes nuclear is correct.

**5. Ship features, but ship them working.** Every feature in this app was shipped, broke something, got fixed, and got shipped again. The git history reads like a battle report. That's fine. That's how it works.

---

## The Stack in Retrospect

Would we change anything?

**Keep:** Next.js App Router (powerful), Supabase (free tier is genuinely good), Groq (surprisingly fast and capable for free), Framer Motion (worth every byte), Tailwind v4 (after the learning curve, better than v3).

**Change:** Prisma v7 with driver adapter is complex — for a simpler setup, Drizzle ORM would be lighter. The PWA setup caused more problems than it solved for a web app that needs real-time data.

**Proud of:** The `getUserId` lazy user creation pattern, the fire-and-forget AI with `after()`, the PDF via `window.print()` approach, the friend code system without a third-party service.

---

## Timeline

| Date | Milestone |
|---|---|
| Early May 2026 | Initial commit, base UI, SQLite → PostgreSQL |
| May 6, 2026 | First working migration, Supabase connected |
| May 9, 2026 | Auth decoupled from DB, sessions saving, AI working |
| May 9-11, 2026 | Feature sprint — analytics, GD, interview, placement, health score, skill map, leaderboard, contests |
| May 13, 2026 | Custom domain kaizenos.online, Cloudflare setup |
| May 14, 2026 | Auth loop resolved, `OAuthAccountNotLinked` fixed |
| May 14, 2026 | **KaizenOS goes live** ✅ |

---

<div align="center">

*"Continuous improvement, one session at a time."*

**[kaizenos.online](https://kaizenos.online)** · [GitHub](https://github.com/Amankumarsingh23/KaizenOS)

</div>
