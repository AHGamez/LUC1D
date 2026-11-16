import { useEffect, useState, type FormEvent } from "react";
import { BarChart3, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/kit";
import type { Poll, PollVote } from "./lib/discard-types";
import { uniqueSuffix } from "./lib/discard-util";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_OPTIONS = 4;

/** Polls posted in this channel during the last 24 hours. Anyone votes; moderators create and delete. */
export function ChannelPolls({ channelId, me, isMod }: { channelId: string; me: string; isMod: boolean }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [making, setMaking] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase
        .from("discard_polls")
        .select("id, question, options, created_at")
        .eq("channel_id", channelId)
        .gt("created_at", new Date(Date.now() - DAY_MS).toISOString())
        .order("created_at", { ascending: false })
        .limit(3);
      setPolls(p ?? []);
      const ids = (p ?? []).map((x) => x.id);
      const { data: v } = ids.length ? await supabase.from("discard_poll_votes").select("poll_id, user_id, option").in("poll_id", ids) : { data: [] as PollVote[] };
      setVotes(v ?? []);
    };
    void load();
    const ch = supabase
      .channel(`polls-${channelId}-${uniqueSuffix()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_polls" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "discard_poll_votes" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [channelId]);

  const vote = async (pollId: string, option: number) => {
    const mine = votes.find((v) => v.poll_id === pollId && v.user_id === me);
    const removing = mine?.option === option;
    setVotes((vs) => [
      ...vs.filter((v) => !(v.poll_id === pollId && v.user_id === me)),
      ...(removing ? [] : [{ poll_id: pollId, user_id: me, option }]),
    ]);
    if (removing) await supabase.from("discard_poll_votes").delete().eq("poll_id", pollId).eq("user_id", me);
    else await supabase.from("discard_poll_votes").upsert({ poll_id: pollId, user_id: me, option });
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleaned.length < 2) return setErr("Add a question and at least 2 options");
    const { error } = await supabase.from("discard_polls").insert({ channel_id: channelId, user_id: me, question: question.trim(), options: cleaned });
    if (error) return setErr(error.message);
    setQuestion("");
    setOptions(["", ""]);
    setErr("");
    setMaking(false);
  };

  const removePoll = async (id: string) => {
    const { error } = await supabase.from("discard_polls").delete().eq("id", id);
    if (error) setErr(error.message);
    else setPolls((ps) => ps.filter((x) => x.id !== id));
  };

  if (!polls.length && !isMod) return null;

  return (
    <div className="shrink-0 space-y-2 border-b border-[var(--d-line)] px-4 py-2.5 text-xs">
      {polls.map((p) => {
        const pv = votes.filter((v) => v.poll_id === p.id);
        const mine = pv.find((v) => v.user_id === me)?.option;
        return (
          <div key={p.id} className="d-card max-w-sm p-3">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <BarChart3 className="size-3.5 shrink-0" />
              <span className="flex-1 truncate">{p.question}</span>
              {isMod && (
                <button type="button" aria-label="Delete poll" title="Delete poll" onClick={() => removePoll(p.id)} className="d-icon-btn size-5 danger">
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
            <div className="space-y-1">
              {p.options.map((o, i) => {
                const n = pv.filter((v) => v.option === i).length;
                const pct = pv.length ? Math.round((n / pv.length) * 100) : 0;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => vote(p.id, i)}
                    aria-pressed={mine === i}
                    className={`relative flex w-full items-center justify-between overflow-hidden rounded-[10px] border px-2.5 py-1.5 text-left transition-colors hover:bg-[var(--d-hover)] ${mine === i ? "border-[var(--d-accent-line)] bg-[var(--d-accent-soft)]" : "border-[var(--d-line)]"}`}
                  >
                    <span className="absolute inset-y-0 left-0 bg-[var(--d-accent-grad)] opacity-25" style={{ width: `${pct}%` }} />
                    <span className="relative truncate">{o}</span>
                    <span className="relative opacity-70">{n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {isMod &&
        (making ? (
          <form onSubmit={create} className="d-card max-w-sm space-y-2 p-3">
            <Input value={question} maxLength={120} onChange={(e) => setQuestion(e.target.value)} placeholder="Poll question" aria-label="Poll question" />
            {options.map((o, i) => (
              <Input
                key={i}
                value={o}
                maxLength={60}
                aria-label={`Option ${i + 1}`}
                onChange={(e) => setOptions((os) => os.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Option ${i + 1}`}
              />
            ))}
            {err && <p role="alert" className="text-destructive">{err}</p>}
            <div className="flex items-center gap-2">
              {options.length < MAX_OPTIONS && (
                <Button type="button" variant="ghost" size="sm" className="d-btn-ghost" onClick={() => setOptions((os) => [...os, ""])}>
                  + Option
                </Button>
              )}
              <span className="flex-1" />
              <Button type="button" variant="ghost" size="sm" className="d-btn-ghost" onClick={() => setMaking(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="d-btn d-btn-primary">
                Post poll
              </Button>
            </div>
          </form>
        ) : (
          <Button type="button" variant="ghost" size="sm" className="d-btn d-btn-ghost" onClick={() => setMaking(true)}>
            <BarChart3 className="size-3.5" /> New poll
          </Button>
        ))}
    </div>
  );
}
