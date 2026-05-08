import { db } from "./db";

const DEFAULT_GD_TOPICS = [
  // ABSTRACT
  { category: "ABSTRACT", topic: "Does money buy happiness?" },
  { category: "ABSTRACT", topic: "Are leaders born or made?" },
  { category: "ABSTRACT", topic: "Can machines be truly creative?" },
  { category: "ABSTRACT", topic: "Is perfection achievable or just a pursuit?" },
  { category: "ABSTRACT", topic: "Does technology make us more or less human?" },
  { category: "ABSTRACT", topic: "Is change always good?" },
  { category: "ABSTRACT", topic: "Can art change the world?" },
  { category: "ABSTRACT", topic: "Does failure lead to success?" },
  // CURRENT_AFFAIRS
  { category: "CURRENT_AFFAIRS", topic: "Impact of AI on employment in India" },
  { category: "CURRENT_AFFAIRS", topic: "Should social media platforms be regulated by the government?" },
  { category: "CURRENT_AFFAIRS", topic: "India's UPI revolution: lessons for the world" },
  { category: "CURRENT_AFFAIRS", topic: "Climate change: is individual action enough?" },
  { category: "CURRENT_AFFAIRS", topic: "Electric vehicles: are we ready for the transition?" },
  { category: "CURRENT_AFFAIRS", topic: "Cryptocurrency: boon or bane for the Indian economy?" },
  { category: "CURRENT_AFFAIRS", topic: "Remote work: permanent shift or temporary trend?" },
  { category: "CURRENT_AFFAIRS", topic: "Mental health crisis among Indian youth" },
  // BUSINESS
  { category: "BUSINESS", topic: "Startups vs. established corporations: who drives innovation?" },
  { category: "BUSINESS", topic: "Is an MBA degree still relevant in the age of startups?" },
  { category: "BUSINESS", topic: "Work-life balance: myth or achievable reality?" },
  { category: "BUSINESS", topic: "Should companies prioritize profit or social responsibility?" },
  { category: "BUSINESS", topic: "Gig economy: disruption or exploitation?" },
  { category: "BUSINESS", topic: "Role of women in leadership positions" },
  { category: "BUSINESS", topic: "Data privacy vs. business growth: where to draw the line?" },
  { category: "BUSINESS", topic: "Brand loyalty: genuine affinity or just habit?" },
  // TECHNICAL
  { category: "TECHNICAL", topic: "AI vs human intelligence: can machines truly think?" },
  { category: "TECHNICAL", topic: "Open source vs proprietary software: which serves users better?" },
  { category: "TECHNICAL", topic: "Cybersecurity in a hyperconnected world" },
  { category: "TECHNICAL", topic: "Blockchain beyond cryptocurrency: real-world applications" },
  { category: "TECHNICAL", topic: "Is coding the new literacy?" },
  { category: "TECHNICAL", topic: "Automation: job destroyer or job creator?" },
  { category: "TECHNICAL", topic: "5G: transforming connectivity or overhyped?" },
  { category: "TECHNICAL", topic: "Quantum computing: how close is the revolution?" },
  // ETHICAL
  { category: "ETHICAL", topic: "Privacy vs national security: where should governments draw the line?" },
  { category: "ETHICAL", topic: "Should organ donation be mandatory?" },
  { category: "ETHICAL", topic: "Capital punishment: justice or state-sanctioned revenge?" },
  { category: "ETHICAL", topic: "Affirmative action: fair policy or reverse discrimination?" },
  { category: "ETHICAL", topic: "Corporate social responsibility: genuine or just PR?" },
  { category: "ETHICAL", topic: "Animal testing in medical research: necessary evil?" },
  { category: "ETHICAL", topic: "Whistleblowing: civic duty or betrayal of trust?" },
  { category: "ETHICAL", topic: "Should voting be made compulsory?" },
] as const;

const DEFAULT_INTERVIEW_QUESTIONS = [
  // HR
  { type: "HR", question: "Tell me about yourself." },
  { type: "HR", question: "Why do you want to work for this company?" },
  { type: "HR", question: "Where do you see yourself in 5 years?" },
  { type: "HR", question: "What are your greatest strengths and weaknesses?" },
  { type: "HR", question: "Describe a challenge you faced and how you overcame it." },
  { type: "HR", question: "How do you handle pressure and tight deadlines?" },
  { type: "HR", question: "Why are you leaving your current position?" },
  { type: "HR", question: "What motivates you at work?" },
  { type: "HR", question: "How do you handle conflict with a teammate?" },
  { type: "HR", question: "Describe your ideal work environment." },
  { type: "HR", question: "Why should we hire you over other candidates?" },
  { type: "HR", question: "Describe a time you demonstrated leadership." },
  { type: "HR", question: "How do you prioritize when you have multiple deadlines?" },
  // TECHNICAL
  { type: "TECHNICAL", question: "Explain the difference between a process and a thread." },
  { type: "TECHNICAL", question: "What are SOLID principles? Give examples." },
  { type: "TECHNICAL", question: "Explain REST vs GraphQL — when would you choose each?" },
  { type: "TECHNICAL", question: "What is time complexity? Explain Big O notation with examples." },
  { type: "TECHNICAL", question: "Difference between SQL and NoSQL databases. When to use which?" },
  { type: "TECHNICAL", question: "What is a design pattern? Name and explain 3 common ones." },
  { type: "TECHNICAL", question: "Explain TCP vs UDP and their use cases." },
  { type: "TECHNICAL", question: "What is CORS and how do you handle it?" },
  { type: "TECHNICAL", question: "What is database indexing and when should you use it?" },
  { type: "TECHNICAL", question: "Explain the event loop in JavaScript." },
  { type: "TECHNICAL", question: "What is CI/CD and why is it important?" },
  { type: "TECHNICAL", question: "Explain CAP theorem with a real-world example." },
  { type: "TECHNICAL", question: "How does garbage collection work in modern languages?" },
  // SYSTEM_DESIGN
  { type: "SYSTEM_DESIGN", question: "Design a URL shortener like bit.ly." },
  { type: "SYSTEM_DESIGN", question: "Design Twitter's news feed (post + follow + timeline)." },
  { type: "SYSTEM_DESIGN", question: "Design a rate limiter for an API." },
  { type: "SYSTEM_DESIGN", question: "Design a real-time chat application like WhatsApp." },
  { type: "SYSTEM_DESIGN", question: "Design a ride-sharing system like Uber/Ola." },
  { type: "SYSTEM_DESIGN", question: "Design a notification service (push, email, SMS)." },
  { type: "SYSTEM_DESIGN", question: "Design a distributed key-value store." },
  { type: "SYSTEM_DESIGN", question: "Design a video streaming service like YouTube." },
  { type: "SYSTEM_DESIGN", question: "Design a search autocomplete system." },
  { type: "SYSTEM_DESIGN", question: "Design a parking lot management system." },
] as const;

export async function seedTopicsForUser(userId: string): Promise<void> {
  const [existingGD, existingIQ] = await Promise.all([
    db.gDTopic.count({ where: { userId } }),
    db.interviewQuestion.count({ where: { userId } }),
  ]);

  const ops: Promise<unknown>[] = [];

  if (existingGD === 0) {
    ops.push(
      db.gDTopic.createMany({
        data: DEFAULT_GD_TOPICS.map((t) => ({ ...t, userId })),
        skipDuplicates: true,
      })
    );
  }

  if (existingIQ === 0) {
    ops.push(
      db.interviewQuestion.createMany({
        data: DEFAULT_INTERVIEW_QUESTIONS.map((q) => ({ ...q, userId })),
        skipDuplicates: true,
      })
    );
  }

  if (ops.length) await Promise.all(ops);
}
