"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Clock, Zap, Copy, Check, UserPlus, X, Trash2 } from "lucide-react";
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

export default function LeaderboardPage() {
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
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold text-ink">Accountability <em>Board.</em></h1>
        <p className="text-sm text-ink/40 font-sans mt-1">This week · only you and friends you've added</p>
      </div>

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
                        <p className="text-sm font-semibold font-sans text-ink truncate">{row.name}</p>
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
                        <button onClick={() => removeFriend(row.id)}
                          className="p-1 text-ink/15 hover:text-terracotta transition-colors"
                          title="Remove friend">
                          <Trash2 size={13}/>
                        </button>
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
    </AppShell>
  );
}
