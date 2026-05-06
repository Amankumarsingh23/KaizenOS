import path from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter, log: ["error"] });

// ─── GD Topics ────────────────────────────────────────────────────────────────

const gdTopics = [
  // ABSTRACT (10)
  { category: "ABSTRACT" as const, topic: "The pen is mightier than the sword" },
  { category: "ABSTRACT" as const, topic: "Change is the only constant" },
  { category: "ABSTRACT" as const, topic: "Fortune favors the brave" },
  { category: "ABSTRACT" as const, topic: "Knowledge is power" },
  { category: "ABSTRACT" as const, topic: "Beauty lies in the eyes of the beholder" },
  { category: "ABSTRACT" as const, topic: "All that glitters is not gold" },
  { category: "ABSTRACT" as const, topic: "Necessity is the mother of invention" },
  { category: "ABSTRACT" as const, topic: "Time is money" },
  { category: "ABSTRACT" as const, topic: "The glass is half full or half empty" },
  { category: "ABSTRACT" as const, topic: "A rolling stone gathers no moss" },

  // CURRENT_AFFAIRS (10)
  { category: "CURRENT_AFFAIRS" as const, topic: "India's role in global AI development" },
  { category: "CURRENT_AFFAIRS" as const, topic: "Electric vehicle adoption in India: challenges and opportunities" },
  { category: "CURRENT_AFFAIRS" as const, topic: "India's space program and its economic impact" },
  { category: "CURRENT_AFFAIRS" as const, topic: "Digital India initiative: successes and failures" },
  { category: "CURRENT_AFFAIRS" as const, topic: "India's G20 presidency: legacy and impact" },
  { category: "CURRENT_AFFAIRS" as const, topic: "Cryptocurrency regulation in India" },
  { category: "CURRENT_AFFAIRS" as const, topic: "India's demographic dividend: opportunity or challenge?" },
  { category: "CURRENT_AFFAIRS" as const, topic: "Impact of US-China trade war on India" },
  { category: "CURRENT_AFFAIRS" as const, topic: "Climate change and India's net-zero commitments" },
  { category: "CURRENT_AFFAIRS" as const, topic: "Universal Basic Income: is India ready?" },

  // BUSINESS (10)
  { category: "BUSINESS" as const, topic: "Startups vs. established companies: which is better to work for?" },
  { category: "BUSINESS" as const, topic: "Work from home: boon or bane for productivity?" },
  { category: "BUSINESS" as const, topic: "AI will replace more jobs than it creates" },
  { category: "BUSINESS" as const, topic: "Corporate social responsibility: obligation or opportunity?" },
  { category: "BUSINESS" as const, topic: "Entrepreneurship should be taught in schools" },
  { category: "BUSINESS" as const, topic: "Gig economy: the future of work or exploitation?" },
  { category: "BUSINESS" as const, topic: "Globalization: friend or foe for developing nations?" },
  { category: "BUSINESS" as const, topic: "The future of retail in the age of e-commerce" },
  { category: "BUSINESS" as const, topic: "Should companies prioritize profit over people?" },
  { category: "BUSINESS" as const, topic: "Four-day work week: productivity booster or business risk?" },

  // TECHNICAL (10)
  { category: "TECHNICAL" as const, topic: "Artificial intelligence: threat or opportunity for humanity?" },
  { category: "TECHNICAL" as const, topic: "Should social media platforms be regulated by governments?" },
  { category: "TECHNICAL" as const, topic: "Blockchain beyond cryptocurrency: real-world applications" },
  { category: "TECHNICAL" as const, topic: "5G technology: impact on society and economy" },
  { category: "TECHNICAL" as const, topic: "Data privacy vs. national security" },
  { category: "TECHNICAL" as const, topic: "Open-source software vs. proprietary software" },
  { category: "TECHNICAL" as const, topic: "The metaverse: hype or future reality?" },
  { category: "TECHNICAL" as const, topic: "Cybersecurity: individual responsibility or government mandate?" },
  { category: "TECHNICAL" as const, topic: "Electric vehicles: are they truly green?" },
  { category: "TECHNICAL" as const, topic: "Space exploration: necessity or luxury for a developing nation?" },

  // ETHICAL (10)
  { category: "ETHICAL" as const, topic: "Reservations: solution or problem for social equality?" },
  { category: "ETHICAL" as const, topic: "Capital punishment: justified or barbaric?" },
  { category: "ETHICAL" as const, topic: "Brain drain: whose loss, whose gain?" },
  { category: "ETHICAL" as const, topic: "Should euthanasia be legalized in India?" },
  { category: "ETHICAL" as const, topic: "Gender equality in corporate leadership: quotas or merit?" },
  { category: "ETHICAL" as const, topic: "Should voting be made mandatory in India?" },
  { category: "ETHICAL" as const, topic: "Animal testing for medical research: ethical or not?" },
  { category: "ETHICAL" as const, topic: "Whistleblowing: patriotism or betrayal?" },
  { category: "ETHICAL" as const, topic: "Privacy vs. transparency in governance" },
  { category: "ETHICAL" as const, topic: "Social media influencers: responsible role models or toxic culture?" },
];

// ─── HR Interview Questions ───────────────────────────────────────────────────

const hrQuestions = [
  "Tell me about yourself.",
  "What are your greatest strengths?",
  "What is your greatest weakness?",
  "Why do you want to work for this company?",
  "Where do you see yourself in 5 years?",
  "Tell me about a time you faced a major challenge and how you overcame it.",
  "Describe a situation where you worked effectively in a team.",
  "Tell me about a time you demonstrated leadership.",
  "What motivates you at work?",
  "How do you handle stress and pressure?",
  "Tell me about a time you failed and what you learned from it.",
  "How do you prioritize tasks when you have multiple competing deadlines?",
  "Tell me about a time you disagreed with your manager and how you handled it.",
  "What is your greatest professional achievement so far?",
  "Describe a time you went above and beyond your job requirements.",
  "How do you handle constructive criticism?",
  "Tell me about a time you had to adapt to a significant change at work.",
  "Why should we hire you over other candidates?",
  "Describe a situation where you had to influence someone without direct authority.",
  "Tell me about a time you had to learn something new quickly under pressure.",
];

// ─── Monthly Targets ──────────────────────────────────────────────────────────

type TargetSeed = {
  month: number;
  year: number;
  category: "DSA" | "GD" | "MOCK_INTERVIEW" | "COMMUNICATION";
  targetValue: number;
  unit: string;
};

const monthlyTargets: TargetSeed[] = [
  // May 2026
  { month: 5, year: 2026, category: "GD",            targetValue: 20,  unit: "sessions" },
  { month: 5, year: 2026, category: "COMMUNICATION",  targetValue: 10,  unit: "STAR stories" },
  { month: 5, year: 2026, category: "DSA",            targetValue: 30,  unit: "problems" },

  // June 2026
  { month: 6, year: 2026, category: "GD",            targetValue: 60,  unit: "sessions" },
  { month: 6, year: 2026, category: "MOCK_INTERVIEW", targetValue: 12,  unit: "mocks" },
  { month: 6, year: 2026, category: "DSA",            targetValue: 90,  unit: "problems" },

  // July 2026
  { month: 7, year: 2026, category: "GD",            targetValue: 30,  unit: "sessions" },
  { month: 7, year: 2026, category: "MOCK_INTERVIEW", targetValue: 12,  unit: "mocks" },
  { month: 7, year: 2026, category: "DSA",            targetValue: 90,  unit: "problems" },

  // August 2026
  { month: 8, year: 2026, category: "GD",            targetValue: 30,  unit: "sessions" },
  { month: 8, year: 2026, category: "DSA",            targetValue: 70,  unit: "problems" },

  // Sep–Dec 2026: maintenance mode
  { month: 9,  year: 2026, category: "GD",            targetValue: 20,  unit: "sessions" },
  { month: 9,  year: 2026, category: "MOCK_INTERVIEW", targetValue: 8,   unit: "mocks" },
  { month: 9,  year: 2026, category: "DSA",            targetValue: 50,  unit: "problems" },

  { month: 10, year: 2026, category: "GD",            targetValue: 20,  unit: "sessions" },
  { month: 10, year: 2026, category: "MOCK_INTERVIEW", targetValue: 8,   unit: "mocks" },
  { month: 10, year: 2026, category: "DSA",            targetValue: 50,  unit: "problems" },

  { month: 11, year: 2026, category: "GD",            targetValue: 15,  unit: "sessions" },
  { month: 11, year: 2026, category: "MOCK_INTERVIEW", targetValue: 8,   unit: "mocks" },
  { month: 11, year: 2026, category: "DSA",            targetValue: 50,  unit: "problems" },

  { month: 12, year: 2026, category: "GD",            targetValue: 15,  unit: "sessions" },
  { month: 12, year: 2026, category: "MOCK_INTERVIEW", targetValue: 8,   unit: "mocks" },
  { month: 12, year: 2026, category: "DSA",            targetValue: 40,  unit: "problems" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding database...");

  // Seed user (owner of targets/streaks)
  const seedUser = await prisma.user.upsert({
    where: { email: "seed@kaizen.local" },
    update: {},
    create: {
      email: "seed@kaizen.local",
      name: "KaizenOS User",
    },
  });
  console.log(`Seed user: ${seedUser.id}`);

  // GD topics — clear and recreate for idempotency
  await prisma.gDTopic.deleteMany();
  await prisma.gDTopic.createMany({ data: gdTopics });
  console.log(`Created ${gdTopics.length} GD topics`);

  // Interview questions — clear and recreate
  await prisma.interviewQuestion.deleteMany();
  await prisma.interviewQuestion.createMany({
    data: hrQuestions.map((q) => ({
      type: "HR" as const,
      question: q,
      practiced: false,
      practiceCount: 0,
    })),
  });
  console.log(`Created ${hrQuestions.length} HR interview questions`);

  // Monthly targets — upsert per unique key
  for (const t of monthlyTargets) {
    await prisma.target.upsert({
      where: {
        userId_month_year_category: {
          userId: seedUser.id,
          month: t.month,
          year: t.year,
          category: t.category,
        },
      },
      update: { targetValue: t.targetValue, unit: t.unit },
      create: {
        userId: seedUser.id,
        month: t.month,
        year: t.year,
        category: t.category,
        targetValue: t.targetValue,
        currentValue: 0,
        unit: t.unit,
      },
    });
  }
  console.log(`Upserted ${monthlyTargets.length} monthly targets`);

  // ─── Database Engine Project ───────────────────────────────────────────────

  await prisma.milestone.deleteMany({ where: { userId: seedUser.id, projectName: "Database Engine" } });
  await prisma.project.deleteMany({ where: { userId: seedUser.id, name: "Database Engine" } });

  const project = await prisma.project.create({
    data: {
      userId:      seedUser.id,
      name:        "Database Engine",
      description: "Building a relational database from scratch — B-tree storage, SQL parser, WAL, and an interactive REPL.",
      color:       "#5B8FD4",
    },
  });

  // Week offsets from May 6, 2026
  const W = (n: number) => {
    const d = new Date("2026-05-06T00:00:00.000Z");
    d.setDate(d.getDate() + n * 7);
    return d;
  };

  const milestoneSeed = [
    // Phase 1: B-Tree Storage Engine (Weeks 1–4)
    { phase: "Phase 1: B-Tree Storage Engine",    title: "Implement page/block manager",         description: "Design and implement the disk page manager, block allocation, and buffer pool.", start: W(0), target: W(1), order: 1 },
    { phase: "Phase 1: B-Tree Storage Engine",    title: "Build B-tree insert/search/delete",    description: "Implement the core B-tree data structure with insert, point lookup, and delete operations.", start: W(1), target: W(2), order: 2 },
    { phase: "Phase 1: B-Tree Storage Engine",    title: "Add disk persistence",                 description: "Serialize B-tree nodes to disk pages and implement crash-safe durability.", start: W(2), target: W(3), order: 3 },
    { phase: "Phase 1: B-Tree Storage Engine",    title: "Write comprehensive tests",             description: "Unit + integration tests for all storage engine operations including edge cases.", start: W(3), target: W(4), order: 4 },

    // Phase 2: SQL Parser & Query Engine (Weeks 5–8)
    { phase: "Phase 2: SQL Parser & Query Engine", title: "Lexer + parser for basic SQL",        description: "Implement tokenizer and recursive-descent parser for CREATE, SELECT, INSERT, UPDATE, DELETE.", start: W(4), target: W(5), order: 5 },
    { phase: "Phase 2: SQL Parser & Query Engine", title: "SELECT, INSERT, UPDATE, DELETE",      description: "Wire the parser output to the storage engine for all four DML operations.", start: W(5), target: W(6), order: 6 },
    { phase: "Phase 2: SQL Parser & Query Engine", title: "WHERE clause filtering",              description: "Implement predicate evaluation with comparison operators and AND/OR logic.", start: W(6), target: W(7), order: 7 },
    { phase: "Phase 2: SQL Parser & Query Engine", title: "Query execution engine",              description: "Build the query planner and execution pipeline with full-scan and index-scan strategies.", start: W(7), target: W(8), order: 8 },

    // Phase 3: WAL & Crash Recovery (Weeks 9–10)
    { phase: "Phase 3: WAL & Crash Recovery",     title: "Write-ahead logging",                  description: "Implement WAL with log-sequence numbers; ensure atomicity for multi-page writes.", start: W(8), target: W(9), order: 9 },
    { phase: "Phase 3: WAL & Crash Recovery",     title: "Recovery from crash",                  description: "Implement REDO recovery to replay the WAL after a crash and restore consistency.", start: W(9), target: W(9.5), order: 10 },
    { phase: "Phase 3: WAL & Crash Recovery",     title: "Checkpointing",                        description: "Implement periodic checkpoints to bound recovery time and truncate the WAL.", start: W(9.5), target: W(10), order: 11 },

    // Phase 4: REPL & Polish (Weeks 11–12)
    { phase: "Phase 4: REPL & Polish",            title: "Interactive REPL interface",           description: "Build a readline-based REPL with command history, tab completion, and pretty-printed results.", start: W(10), target: W(11), order: 12 },
    { phase: "Phase 4: REPL & Polish",            title: "Error handling & edge cases",          description: "Harden all error paths, add helpful error messages, and stress-test with large datasets.", start: W(11), target: W(11.5), order: 13 },
    { phase: "Phase 4: REPL & Polish",            title: "Documentation & README",               description: "Write architecture docs, API reference, and a README with build/run instructions and examples.", start: W(11.5), target: W(12), order: 14 },
    { phase: "Phase 4: REPL & Polish",            title: "Performance benchmarking",             description: "Benchmark insert/lookup throughput vs SQLite; profile and optimize hot paths.", start: W(11.5), target: W(12), order: 15 },
  ];

  await prisma.milestone.createMany({
    data: milestoneSeed.map((m) => ({
      userId:       seedUser.id,
      projectId:    project.id,
      projectName:  "Database Engine",
      phase:        m.phase,
      title:        m.title,
      description:  m.description,
      startDate:    m.start,
      targetDate:   m.target,
      status:       "PENDING" as const,
      displayOrder: m.order,
    })),
  });
  console.log(`Created Database Engine project with ${milestoneSeed.length} milestones`);

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
