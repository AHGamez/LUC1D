import { useState, type KeyboardEvent } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner, Textarea } from "@/components/ui/kit";
import { supabase } from "@/lib/supabase";
import { worldSchema, type Block } from "../lublox";
import { MAX_AI_PROMPT } from "./aiWorld";

export const AI_ROUTE = "/api/lublox/ai";
const FAILED = "AI helper failed. Try again.";

export interface AiBuildPanelProps {
  /** The world as it is now. Sent with the request so the helper edits it instead of starting over. */
  blocks: Block[];
  /**
   * Called with the new world when the helper finishes. `status` is a line for the Studio's message bar.
   * The Studio keeps its own undo history: push `blocks` there before replacing it.
   */
  onApply(next: Block[], status: string): void;
  /** Reports when a request starts and ends, so the Studio can lock its editor while the helper works. */
  onBusyChange?(busy: boolean): void;
  disabled?: boolean;
}

interface AiReply {
  reply: string;
  blocks: Block[];
  left: number;
}

/**
 * Asks the server's AI helper to build or change the world. The server checks the Lublox builder role and
 * the daily limit in the database; this panel only sends the request and shows the answer.
 */
export default function AiBuildPanel({ blocks, onApply, onBusyChange, disabled = false }: AiBuildPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setBusyState = (next: boolean) => {
    setBusy(next);
    onBusyChange?.(next);
  };

  const ask = async () => {
    const text = prompt.trim();
    if (!text || busy || disabled) return;
    setBusyState(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in first.");
      const res = await fetch(AI_ROUTE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: text, blocks }),
      });
      const body = (await res.json().catch(() => null)) as Partial<AiReply> & { error?: unknown } | null;
      if (!res.ok) throw new Error(typeof body?.error === "string" ? body.error : FAILED);
      const next = worldSchema.safeParse(body?.blocks);
      if (!next.success) throw new Error("The helper's answer was garbled. Try again.");
      const left = typeof body?.left === "number" ? body.left : 0;
      const count = next.data.length;
      setReply(typeof body?.reply === "string" ? body.reply : "");
      setPrompt("");
      onApply(next.data, `AI helper made ${count} blocks. Use Undo if you don't like it. ${left} AI messages left today.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : FAILED);
    } finally {
      setBusyState(false);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask();
    }
  };

  return (
    <section aria-label="AI helper" className="space-y-2 rounded-[var(--radius-card)] border border-border bg-card/60 p-3 shadow-[var(--surface-highlight)]">
      <h3 className="flex items-center gap-1.5 text-body font-semibold text-foreground">
        <Sparkles aria-hidden className="size-4 text-primary" /> AI helper
      </h3>
      <Textarea
        aria-label="Ask the AI helper"
        value={prompt}
        maxLength={MAX_AI_PROMPT}
        rows={3}
        disabled={busy || disabled}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={onKey}
        placeholder="e.g. add a lava jump section and a spiral tower to the goal"
        className="text-body"
      />
      <Button size="sm" className="w-full" disabled={busy || disabled || !prompt.trim()} onClick={() => void ask()}>
        {busy ? <Spinner className="size-3.5" /> : null}
        {busy ? "Building…" : "Ask AI"}
      </Button>
      {reply && <p className="text-caption text-muted-foreground">{reply}</p>}
      {error && (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
