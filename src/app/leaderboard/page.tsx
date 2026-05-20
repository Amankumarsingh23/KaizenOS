"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Clock, Zap, Copy, Check, UserPlus, X, Trash2, Gift, Swords, CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Skeleton } from "@/components/ui/Skeleton";

interface LeaderRow {
  id: string; name: string; image: string | null;
  code: string; isYou: boolean;
  sessionCount: number; totalMinutes: number;
  activeStreaks: number; topStreak: { category: string; days: number } | null;
}

const RANK_ICONS = ["🥇","🥈","🥉"];
const CAT_SHORT: Record<string,string> = {
  DSA:"DSA",GD:"GD",MOCK_INTERVIEW:"Mock",PROJECT_WORK:"Proj",
  CURRENT_AFFAIRS:"CA",JAPANESE:"JP",COMMUNICATION:"Comm",READING:"Read",
};

function Avatar({ name, image, size=40 }: { name:string; image:string|null; size?:number }) {
  if (image) return <img src={image} alt={name} className="rounded-full object-cover" style={{width:size,height:size}} />;
  return (
    <div className="rounded-full bg-gradient-to-br from-gold to-sage flex items-center justify-center text-white font-semibold font-serif"
      style={{width:size,height:size,fontSize:size*0.4}}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

function CodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex items-center gap-2 bg-cream border border-mist rounded-2xl px-4 py-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-ink/40 font-sans">Your Friend Code</p>
        <p className="font-mono text-xl font-bold text-ink tracking-wider mt-0.5">{code}</p>
        <p className="text-[10px] text-ink/30 font-sans mt-0.5">Share this with friends so they can add you</p>
      </div>
      <button onClick={copy}
        className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold font-sans transition-all ${copied ? "bg-sage/15 text-sage" : "bg-white border border-mist text-ink/50 hover:text-ink"}`}>
        {copied ? <><Check size={12}/> Copied!</> : <><Copy size={12}/> Copy</>}
      </button>
    </div>
  );
}

function AddFriendPanel({ onAdded }: { onAdded: (row: LeaderRow) => void }) {
  const [open, setOpen]     = useState(false);
  const [code, setCode]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  async function submit() {
    if (code.trim().length < 6) { setError("Code must be at least 6 characters"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/friends", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Something went wrong"); setLoading(false); return; }
    onAdded({ ...data, isYou: false, sessionCount: 0, totalMinutes: 0, activeStreaks: 0, topStreak: null });
    setCode(""); setOpen(false); setLoading(false);
  }

  return (
    <div className="mb-5">
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-mist rounded-2xl py-4 text-sm font-sans text-ink/40 hover:border-sage/40 hover:text-sage transition-all">
          <UserPlus size={16}/> Add a Friend by Code
        </button>
      ) : (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
          className="bg-white border border-mist/60 rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink font-sans">Add Friend</p>
            <button onClick={() => {setOpen(false);setCode("");setError("");}}><X size={16} className="text-ink/30"/></button>
          </div>
          <p className="text-xs text-ink/40 font-sans mb-3">Ask your friend for their 8-character code from their leaderboard page</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. CM4F9B2A"
              maxLength={8}
              className="flex-1 bg-cream border border-mist rounded-xl px-3 py-2.5 font-mono text-sm text-ink focus:outline-none focus:ring-2 focus:ring-sage/30 uppercase placeholder:normal-case placeholder:font-sans placeholder:text-ink/25"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <button onClick={submit} disabled={loading || code.length < 6}
              className="px-4 py-2.5 bg-sage text-white rounded-xl text-sm font-semibold font-sans disabled:opacity-40 hover:bg-sage/90 transition-colors">
              {loading ? "…" : "Add"}
            </button>
          </div>
          {error && <p className="text-xs text-terracotta font-sans mt-2">{error}</p>}
        </motion.div>
      )}
    </div>
  );
}

function GiftButton({ friendId, friendName }: { friendId: string; friendName: string }) {
  const [open, setOpen]     = useState(false);
  const [amount, setAmount] = useState(100);
  const [msg, setMsg]       = useState("");
  const [sending, setSend]  = useState(false);
  const [sent, setSent]     = useState(false);

  async function sendGift() {
    setSend(true);
    const res = await fetch("/api/coins/gift", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: friendId, amount, message: msg }),
    });
    if (res.ok) { setSent(true); setTimeout(() => { setSent(false); setOpen(false); setMsg(""); }, 2000); }
    setSend(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="p-1 text-ink/20 hover:text-amber-500 transition-colors" title="Send coins">
        <Gift size={13}/>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]" onClick={() => setOpen(false)}/>
            <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:16}}
              className="fixed bottom-24 left-4 right-4 z-50 bg-white rounded-3xl p-5 shadow-2xl max-w-sm mx-auto">
              <p className="font-serif text-base font-semibold text-ink mb-1">Gift {friendName}</p>
              <div className="flex gap-2 mb-3">
                {[50,100,200,500].map((a) => (
                  <button key={a} onClick={() => setAmount(a)}
                    className={`flex-1 py-2 rounded-xl text-sm font-mono font-semibold transition-all ${amount === a ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-mist/40 text-ink/50"}`}>
                    {a}🪙
                  </button>
                ))}
              </div>
              <input value={msg} onChange={(e) => setMsg(e.target.value.slice(0,50))} placeholder="Message (optional, 50 chars)"
                className="w-full bg-cream border border-mist rounded-xl px-3 py-2 text-sm font-sans text-ink placeholder:text-ink/25 focus:outline-none mb-3"/>
              <div className="flex gap-2">
                <button onClick={() => setOpen(false)} className="flex-1 py-2.5 rounded-2xl border border-mist text-sm text-ink/50 font-sans">Cancel</button>
                <button onClick={sendGift} disabled={sending || sent}
                  className="flex-1 py-2.5 rounded-2xl bg-amber-500 text-white text-sm font-semibold font-sans disabled:opacity-50">
                  {sent ? "Sent! 🎉" : sending ? "Sending…" : `Send ${amount}🪙`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Challenges Tab ───────────────────────────────────────────────────────────

interface Challenge {
  id: string; status: string; isChallenger: boolean;
  challengerXp: number; challengedXp: number;
  challenger: { id: string; name: string | null; image: string | null };
  challenged: { id: string; name: string | null; image: string | null };
}

function ChallengesTab({ friends }: { friends: LeaderRow[] }) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading]       = useState(true);
  const [challenging, setChallenging] = useState<string | null>(null);
  const [actionId, setActionId]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/challenges")
      .then((r) => r.json())
      .then((d) => setChallenges(Array.isArray(d) ? d : []))
      .catch(() => setChallenges([]))
      .finally(() => setLoading(false));
  }, []);

  async function sendChallenge(friendId: string) {
    setChallenging(friendId);
    const res = await fetch("/api/challenges", {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ challengedId: friendId }),
    });
    if (res.ok) {
      const c = await res.json();
      setChallenges((prev) => [{ ...c, isChallenger: true, challengerXp: 0, challengedXp: 0 }, ...prev]);
    }
    setChallenging(null);
  }

  async function respond(challengeId: string, action: "accept" | "decline") {
    setActionId(challengeId);
    const res = await fetch("/api/challenges", {
      method: "PATCH", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ challengeId, action }),
    });
    if (res.ok) {
      setChallenges((prev) => prev.map((c) =>
        c.id === challengeId ? { ...c, status: action === "accept" ? "ACTIVE" : "DECLINED" } : c
      ).filter((c) => c.status !== "DECLINED"));
    }
    setActionId(null);
  }

  const pending  = challenges.filter((c) => c.status === "PENDING" && !c.isChallenger);
  const sent     = challenges.filter((c) => c.status === "PENDING" && c.isChallenger);
  const active   = challenges.filter((c) => c.status === "ACTIVE");

  // Friends who can be challenged (not in an active/pending challenge already)
  const activeChallengedIds = new Set(challenges.flatMap((c) => [c.challenger.id, c.challenged.id]));
  const challengeable = friends.filter((f) => !f.isYou && !activeChallengedIds.has(f.id));

  if (loading) return (
    <div className="space-y-3">{[0,1,2].map((i) => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse"/>)}</div>
  );

  return (
    <div className="space-y-5">
      {/* Pending received */}
      {pending.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-terracotta font-sans font-medium mb-3">
            ⚔️ Challenges received ({pending.length})
          </p>
          <div className="space-y-3">
            {pending.map((c) => (
              <motion.div key={c.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={c.challenger.name ?? "?"} image={c.challenger.image} size={36}/>
                  <div className="flex-1">
                    <p className="text-sm font-semibold font-sans text-ink">{c.challenger.name ?? "Someone"} challenged you!</p>
                    <p className="text-xs text-ink/40 font-sans">7-day XP duel · whoever earns more XP wins</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => respond(c.id, "decline")} disabled={actionId === c.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-mist text-xs text-ink/50 font-sans hover:border-terracotta/30 hover:text-terracotta transition-colors">
                    <XCircle size={12}/> Decline
                  </button>
                  <button onClick={() => respond(c.id, "accept")} disabled={actionId === c.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sage text-white text-xs font-semibold font-sans shadow-[0_2px_8px_rgba(107,143,113,0.30)] hover:bg-sage/90 transition-colors">
                    <CheckCircle2 size={12}/> Accept ⚔️
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Active challenges */}
      {active.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-sage font-sans font-medium mb-3">
            🔥 Active duels ({active.length})
          </p>
          <div className="space-y-3">
            {active.map((c) => {
              const myXp     = c.isChallenger ? c.challengerXp : c.challengedXp;
              const theirXp  = c.isChallenger ? c.challengedXp : c.challengerXp;
              const opponent = c.isChallenger ? c.challenged : c.challenger;
              const maxXp    = Math.max(myXp, theirXp, 1);
              const leading  = myXp >= theirXp;
              return (
                <div key={c.id} className={`bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] border ${leading ? "border-sage/20" : "border-terracotta/15"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Swords size={14} className={leading ? "text-sage" : "text-terracotta"}/>
                    <p className="text-xs font-semibold font-sans text-ink">vs {opponent.name ?? "Friend"}</p>
                    <span className={`ml-auto text-[10px] font-sans font-medium ${leading ? "text-sage" : "text-terracotta"}`}>
                      {leading ? "You're leading ⚡" : "They're ahead 🔥"}
                    </span>
                  </div>
                  {/* XP bars */}
                  <div className="space-y-2">
                    {[
                      { label: "You", xp: myXp, color: "bg-sage", leading: myXp >= theirXp },
                      { label: opponent.name?.split(" ")[0] ?? "Friend", xp: theirXp, color: "bg-terracotta", leading: theirXp >= myXp },
                    ].map(({ label, xp, color, leading: l }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[10px] text-ink/40 font-sans mb-1">
                          <span className={l ? "font-semibold text-ink/70" : ""}>{label}</span>
                          <span className="font-mono">{xp} XP</span>
                        </div>
                        <div className="h-2 bg-mist/40 rounded-full overflow-hidden">
                          <motion.div
                            initial={{width:0}} animate={{width:`${(xp/maxXp)*100}%`}}
                            className={`h-full rounded-full ${color} opacity-70`}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sent (waiting) */}
      {sent.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-ink/40 font-sans font-medium mb-3">Waiting for response</p>
          <div className="space-y-2">
            {sent.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-3 shadow-[0_1px_4px_rgba(45,42,38,0.06)] flex items-center gap-3">
                <Avatar name={c.challenged.name ?? "?"} image={c.challenged.image} size={32}/>
                <p className="text-xs font-sans text-ink/60 flex-1">Challenge sent to <span className="font-semibold">{c.challenged.name}</span></p>
                <span className="text-[10px] text-gold font-sans">⏳ Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Challenge a friend */}
      {challengeable.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest text-ink/40 font-sans font-medium mb-3">⚔️ Challenge a friend</p>
          <div className="space-y-2">
            {challengeable.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl p-3 shadow-[0_1px_4px_rgba(45,42,38,0.06)] flex items-center gap-3">
                <Avatar name={f.name} image={f.image} size={36}/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold font-sans text-ink truncate">{f.name}</p>
                  <p className="text-[10px] text-ink/35 font-sans">{Math.round(f.totalMinutes/60*10)/10}h this week</p>
                </div>
                <button
                  onClick={() => sendChallenge(f.id)}
                  disabled={challenging === f.id}
                  className="flex items-center gap-1.5 bg-ink text-cream rounded-xl px-3 py-2 text-xs font-semibold font-sans hover:bg-ink/90 transition-colors disabled:opacity-40 shrink-0">
                  <Swords size={11}/> {challenging === f.id ? "…" : "Challenge"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!pending.length && !active.length && !sent.length && challengeable.length === 0 && (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">⚔️</p>
          <p className="text-sm font-sans text-ink/30">No challenges yet</p>
          <p className="text-xs font-sans text-ink/20 mt-1">Add friends to start a duel</p>
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab, setTab]         = useState<"board" | "challenges">("board");
  const [rows, setRows]       = useState<LeaderRow[]>([]);
  const [myCode, setMyCode]   = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => { setRows(d.rows ?? []); setMyCode(d.myCode ?? ""); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function removeFriend(friendId: string) {
    await fetch("/api/friends", { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ friendId }) });
    setRows((prev) => prev.filter((r) => r.id !== friendId));
  }

  const maxMinutes = Math.max(...rows.map((r) => r.totalMinutes), 1);

  return (
    <AppShell>
      <div className="mb-5">
        <h1 className="font-serif text-3xl font-semibold text-ink">Accountability <em>Board.</em></h1>
        <p className="text-sm text-ink/40 font-sans mt-1">This week · only you and friends you've added</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-mist/50 rounded-2xl p-1 mb-5">
        {([
          { key: "board" as const,      label: "🏆 Board"      },
          { key: "challenges" as const, label: "⚔️ Challenges" },
        ]).map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className="relative flex-1 py-2.5 text-sm font-medium font-sans rounded-xl"
            style={{ color: tab === key ? "#2D2A26" : "#8B8075" }}>
            {tab === key && (
              <motion.div layoutId="lb-tab"
                className="absolute inset-0 bg-white rounded-xl shadow-[0_1px_4px_rgba(45,42,38,0.10)]"
                transition={{ type:"spring", damping:20, stiffness:300 }}/>
            )}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      {tab === "challenges" && <ChallengesTab friends={rows} />}

      {tab === "board" && <>
      {/* Your code */}
      {!loading && myCode && <div className="mb-5"><CodeBadge code={myCode} /></div>}

      {/* Add friend */}
      <AddFriendPanel onAdded={(row) => {
        setRows((prev) => {
          const next = [...prev, row].sort((a,b) => b.totalMinutes - a.totalMinutes || b.sessionCount - a.sessionCount);
          return next;
        });
      }} />

      {/* How it works */}
      <div className="bg-parchment border border-mist/60 rounded-2xl p-4 mb-6">
        <p className="text-xs font-semibold text-ink/60 font-sans mb-2">How to add friends</p>
        <ol className="space-y-1.5">
          {[
            "Share your code above via WhatsApp or anywhere",
            "Ask your friend to open their Leaderboard page",
            "They enter your code in \"Add a Friend\" — done",
            "Both of you need to add each other to see each other",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink/40 font-sans">
              <span className="w-4 h-4 rounded-full bg-mist flex items-center justify-center text-[9px] font-semibold text-ink/50 shrink-0 mt-0.5">{i+1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Board */}
      {loading ? (
        <div className="space-y-3">{[0,1,2].map((i) => <Skeleton key={i} className="h-20" rounded="lg"/>)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-ink/30 font-sans">No one on the board yet</p>
          <p className="text-xs text-ink/20 font-sans mt-1">Add a friend using their code to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {rows.map((row, i) => {
              const rank = i + 1;
              const isTop3 = rank <= 3;
              const hoursStr = `${Math.round(row.totalMinutes / 60 * 10) / 10}h`;
              return (
                <motion.div key={row.id}
                  initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}}
                  transition={{delay: i * 0.05}}
                  className={`bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(45,42,38,0.06)] border ${
                    row.isYou ? "border-sage/30" : "border-transparent"
                  }`}>
                  <div className="flex items-center gap-3">
                    {/* Rank */}
                    <div className="w-8 text-center shrink-0">
                      {isTop3
                        ? <span className="text-xl">{RANK_ICONS[rank-1]}</span>
                        : <span className="font-serif text-lg font-semibold text-ink/30">{rank}</span>}
                    </div>

                    <Avatar name={row.name} image={row.image} size={38} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a href={row.isYou ? "/profile" : `/profile/${row.code.toLowerCase()}`}
                          className="text-sm font-semibold font-sans text-ink truncate hover:text-sage transition-colors">
                          {row.name}
                        </a>
                        {row.isYou && <span className="text-[10px] bg-sage/15 text-sage px-2 py-0.5 rounded-full font-sans font-medium">You</span>}
                        <span className="text-[10px] font-mono text-ink/20 hidden sm:block">{row.code}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] text-ink/40 font-sans"><Clock size={10}/> {hoursStr}</span>
                        <span className="flex items-center gap-1 text-[11px] text-ink/40 font-sans"><Zap size={10}/> {row.sessionCount} sessions</span>
                        {row.topStreak && row.topStreak.days > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-gold font-sans">
                            <Flame size={10}/> {row.topStreak.days}d {CAT_SHORT[row.topStreak.category] ?? row.topStreak.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Streaks + Remove */}
                    <div className="flex items-center gap-2 shrink-0">
                      {row.activeStreaks > 0 && (
                        <span className="text-base">{"🔥".repeat(Math.min(row.activeStreaks, 3))}</span>
                      )}
                      {!row.isYou && (
                        <>
                          <GiftButton friendId={row.id} friendName={row.name} />
                          <button onClick={() => removeFriend(row.id)}
                            className="p-1 text-ink/15 hover:text-terracotta transition-colors"
                            title="Remove friend">
                            <Trash2 size={13}/>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 h-1 bg-mist rounded-full overflow-hidden">
                    <motion.div
                      initial={{width:0}}
                      animate={{width:`${(row.totalMinutes / maxMinutes) * 100}%`}}
                      transition={{delay: i * 0.05 + 0.2, duration:0.6}}
                      className="h-full rounded-full"
                      style={{background: isTop3 ? ["#C4A35A","#94A3B8","#C47D5A"][rank-1] : row.isYou ? "#6B8F71" : "#D4CEC5"}}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      </>}
    </AppShell>
  );
}
