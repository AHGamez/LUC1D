import { useEffect, useState, type FormEvent } from "react";
import { Globe, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { useDiscard } from "./DiscardContext";
import { DiscardEmpty } from "./DiscardEmpty";
import type { Server } from "./lib/discard-types";

const SEARCH_DEBOUNCE_MS = 250;

/** Find a public server by name, or join a private one with its invite code. */
export function FindServers({ joinedIds, onJoined }: { joinedIds: string[]; onJoined: (id: string) => void }) {
  const { me } = useDiscard();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Server[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const term = q.trim();
  const codeLike = /^[A-Za-z0-9]{8}$/.test(term);

  useEffect(() => {
    if (!term) {
      setResults([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("discard_servers")
        .select("id, name, icon, owner_id, is_public, invite_code")
        .eq("is_public", true)
        .ilike("name", `%${term.replace(/[%_]/g, "")}%`)
        .limit(20);
      if (alive) setResults(data ?? []);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term]);

  const joinPublic = async (s: Server) => {
    setBusy(true);
    const { error } = await supabase.from("discard_members").insert({ server_id: s.id, user_id: me });
    setBusy(false);
    if (error && !error.message.includes("duplicate")) return setNote(error.message);
    onJoined(s.id);
  };

  const joinCode = async () => {
    setBusy(true);
    setNote("");
    const { data, error } = await supabase.rpc("discard_join_by_code", { _code: term });
    setBusy(false);
    if (error || !data) return setNote(error?.message.includes("Invalid") ? "No server has that invite code." : (error?.message ?? "Couldn't join."));
    onJoined(data);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (codeLike) void joinCode();
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-6">
      <div>
        <h2 className="text-xl font-bold">Find a server</h2>
        <p className="text-sm opacity-60">Search public servers by name, or enter an 8-character invite code to join a private one.</p>
      </div>
      <form onSubmit={submit} className="flex gap-2">
        <label className="d-field min-w-0 flex-1 h-10">
          <Search className="size-4 opacity-60" />
          <input
            autoFocus
            aria-label="Server name or invite code"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setNote("");
            }}
            placeholder="Server name or invite code"
            className="d-bare-input min-w-0 flex-1 outline-none"
            maxLength={40}
          />
        </label>
        <Button type="submit" disabled={!codeLike || busy} className="d-btn d-btn-primary h-10">
          Join with code
        </Button>
      </form>
      {note && <p role="alert" className="text-sm text-destructive">{note}</p>}
      <div className="space-y-2">
        {term && results.length === 0 && <DiscardEmpty icon={<Search />} title={`No public servers match “${term}”`} help="Try another name, or enter an invite code." />}
        {results.map((s) => {
          const joined = joinedIds.includes(s.id);
          return (
            <div key={s.id} className="d-card flex items-center gap-3 p-3">
              <span className="flex size-11 items-center justify-center rounded-[14px] border border-[var(--d-line)] bg-[var(--d-well)] text-xl">{s.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="flex items-center gap-1 text-xs text-[var(--d-text-faint)]">
                  <Globe className="size-3" /> Public server
                </div>
              </div>
              <Button size="sm" disabled={joined || busy} onClick={() => joinPublic(s)} className={joined ? "d-btn" : "d-btn d-btn-primary"}>
                {joined ? "Joined" : "Join"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
