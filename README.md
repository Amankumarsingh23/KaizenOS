<div align="center">

# ⚡ KaizenOS

### *Your Personal Growth Operating System*

**Built for placement-season warriors. Not another habit tracker.**

[![Live Demo](https://img.shields.io/badge/Live-kaizenos.online-6B8F71?style=for-the-badge&logo=vercel&logoColor=white)](https://kaizenos.online)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq AI](https://img.shields.io/badge/Groq_AI-F55036?style=for-the-badge&logo=groq&logoColor=white)](https://groq.com)

**[→ Read the full development journey](./JOURNEY.md)**

</div>

---

## What is KaizenOS?

KaizenOS started as a simple placement prep tracker and evolved into a full personal operating system — real-time session logging, AI coaching after every session, GD practice with reflection logs, interview prep with attempt history, company pipeline tracking, Codeforces integration, LeetCode stats, GitHub activity dashboards, friend accountability boards, and weekly AI-generated PDF reports.

Every single feature exists because it was **actually needed** during real placement preparation.

---

## ✨ Features

### 🧠 Study Engine
| Feature | What it does |
|---|---|
| **Session Timer** | Category-aware timer (DSA, GD, Mock, etc.) with offline queue — never lose a session |
| **AI Daily Score** | Groq analyses every session and scores your day 0–10 with specific strengths, gaps, and tomorrow's actions |
| **Streak Tracking** | Per-category streaks with best-streak history and visual consistency tracking |
| **Monthly Targets** | Set goals; progress updates automatically as sessions are logged |

### 📊 Analytics
| Feature | What it does |
|---|---|
| **Dashboard** | Today's sessions, AI score, active streaks, morning plan, live timer shortcut |
| **4-Tab Analytics** | Score trends · Weekly breakdown · Monthly progress · Session quality curves |
| **Placement Health Score** | 6-dimension weighted radar — DSA (30%), Communication (20%), HR (20%), Projects (15%), Consistency (10%), Breadth (5%) |
| **Weekly Review** | Auto-generated every Sunday — day-by-day stats, category grid, mood chart |
| **Narrative Timeline** | Month-by-month chronicle of your entire preparation journey with auto-detected milestones |

### 🎤 GD & Interview
| Feature | What it does |
|---|---|
| **GD Topic Bank** | 40 pre-seeded topics across 5 categories, personalized per user |
| **GD Session Logging** | Score, duration, group size, key argument, initiated/concluded tracking |
| **Interview Question Bank** | 36 pre-seeded questions (HR · Technical · System Design) |
| **Multi-attempt Notes** | Log every practice attempt — rating, what went well, what to improve |
| **Analytics Tab** | Score trend curves, category performance, most-improved questions |

### 🏢 Placement Pipeline
| Feature | What it does |
|---|---|
| **Company Tracker** | Full status flow: APPLIED → OA → Interviews → Offer/Rejected |
| **Round Logging** | Log each interview round with outcome (Cleared / Rejected / Pending) |
| **Funnel Analytics** | Conversion rates, application timeline, source breakdown |
| **Resume Label** | Track which resume version you sent to each company |

### 🏆 Competitive Programming
| Feature | What it does |
|---|---|
| **CF Upcoming Contests** | Live countdowns, push notification reminders (1h before) |
| **CF Rating History** | Full rating curve with colored difficulty band overlays |
| **Problem Stats** | Difficulty breakdown, tag performance, 365-day submission heatmap |
| **Auto-Sync Skills** | CF tag history auto-fills your DSA Skill Map (1-5 → Practicing to Mastered) |
| **LeetCode Tab** | Toggle between CF and LC — solved by difficulty, streak, recent AC, 30-day calendar |

### 🛠 Projects
| Feature | What it does |
|---|---|
| **Milestone Tracker** | Phases, Gantt-like timeline, status flow per milestone |
| **GitHub Integration** | Link a repo → see commit history, stars, language, weekly activity in your project dashboard |

### 📖 Personal
| Feature | What it does |
|---|---|
| **Daily Journal** | Mood/energy log, edit/delete, analytics and mood-score correlation insights |
| **DSA Skill Map** | 28-topic self-rating grid (Unexplored → Mastered), auto-filled from CF tag history |
| **Friend Leaderboard** | Share 8-char code → friends appear on your board — weekly study hours ranking |
| **Weekly AI Report** | Groq-generated comprehensive review: narrative, strengths, gaps, 7-day plan — **downloadable as PDF** |

---

## 🛠 Tech Stack

```
Frontend    Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts
Backend     Next.js API Routes · Prisma v7 · @prisma/adapter-pg
Database    PostgreSQL (Supabase free tier)
Auth        NextAuth v4 · GitHub OAuth · JWT sessions
AI          Groq API · Llama 3.3 70B (free tier)
Infra       Vercel Hobby · kaizenos.online via Cloudflare
Push        Web Push API · VAPID
External    Codeforces API · LeetCode GraphQL · GitHub REST API
```

---

## 📁 Pages

```
/                Dashboard
/timer           Log a study session
/analytics       Analytics (4 tabs + Health Score radar)
/weekly          Weekly performance review
/topics          GD topics + Interview Q bank + Analytics curves
/projects        Project + milestone tracker + GitHub activity
/streaks         Streak history per category
/journal         Daily journal + mood analytics
/placement       Company pipeline + round tracking + funnel
/contests        CF contests + LC stats (tabbed)
/skills          DSA skill map (28 topics)
/timeline        Narrative preparation journey
/leaderboard     Friend accountability board
/reports         Daily AI reports + Weekly PDF reports
/settings        Profile, targets, notifications, CF/LC/GitHub handles
```

---

## 🚀 Getting Started

```bash
git clone https://github.com/Amankumarsingh23/KaizenOS.git
cd KaizenOS
npm install
```

Create `.env.local`:

```env
# Supabase
DATABASE_URL=postgresql://postgres.xxxx:pass@pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.xxxx:pass@pooler.supabase.com:5432/postgres

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32

# GitHub OAuth (create at github.com/settings/developers)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret

# AI (free at console.groq.com)
GROQ_API_KEY=gsk_...

# Push Notifications (npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

```bash
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗 Architecture

**Why no SQLite?** — Built directly on PostgreSQL from day one via Supabase. Production-grade from the first commit.

**Prisma v7 Driver Adapter** — Uses `@prisma/adapter-pg` for serverless-friendly connection pooling. Each Vercel function gets a pg Pool instead of a long-lived connection.

**JWT Sessions** — Stateless. No session table writes on every request.

**Fire-and-forget AI** — Daily reports generate via Next.js `after()` hook. Session saves respond instantly; AI runs in the background after the response is sent.

**PDF via Print API** — Weekly reports use `window.print()` with `@media print` CSS. Zero dependencies, pixel-perfect output matching the app's design.

---

## 📜 The Journey

This project was not architected upfront. It was built in real-time during placement preparation — feature by feature, crisis by crisis. Prisma v7 breaking changes, PostgreSQL SSL fights, service worker cache disasters, Cloudflare propagation hell, auth loop debugging at 2 AM, and everything in between.

**[Read the full story — JOURNEY.md →](./JOURNEY.md)**

---

<div align="center">

Made with obsession by [Aman Kumar Singh](https://github.com/Amankumarsingh23)

*Continuous improvement, one session at a time.*

**[kaizenos.online](https://kaizenos.online)**

</div>
