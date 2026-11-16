import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { CHAT_IMAGE_LIMIT, chatImageExtension } from "./lib/chat-image";
import { filterOptions, mentionState, type MentionOption, type MentionState } from "./lib/chat-mentions";

const BUCKET = "discard-chat-images";

export type MentionMember = { id: string; name: string };
export type MentionTag = { id: string; name: string; swatch?: string | undefined };

/**
 * Message box shared by channels and DMs. Uploads an optional picture to the user's own folder
 * first, then calls `onSend` with the path. A failed send removes the orphaned upload.
 *
 * Typing "@" opens a picker of members to mention. Typing "@t" opens the chat tags you own, and
 * picking one wears it (the database refuses tags you do not own).
 */
export function ChatComposer({
  me,
  placeholder,
  disabled = false,
  onSend,
  members = [],
  tags = [],
  wearingTag = "",
  onPickTag,
}: {
  me: string;
  placeholder: string;
  disabled?: boolean;
  onSend: (content: string, imagePath: string | null) => Promise<void>;
  members?: MentionMember[] | undefined;
  tags?: MentionTag[] | undefined;
  wearingTag?: string;
  onPickTag?: ((id: string) => void) | undefined;
}) {
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mention, setMention] = useState<MentionState | null>(null);
  const [closedAt, setClosedAt] = useState<{ start: number; key: string } | null>(null);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const text = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (next?: File) => {
    if (!next) return;
    if (!chatImageExtension(next.type)) return setError("Choose a PNG, JPG, WebP or GIF picture.");
    if (next.size > CHAT_IMAGE_LIMIT) return setError("Choose a picture smaller than 5 MB.");
    setFile(next);
    setError("");
  };

  // "@t…" lists the tags this person owns; a plain "@…" lists members to mention.
  const sync = (value: string, caret: number) => {
    const m = mentionState(value, caret);
    if (!m) {
      setMention(null);
      return;
    }
    const token = value.slice(m.start, caret);
    if (closedAt && closedAt.start === m.start && token.startsWith(closedAt.key)) {
      setMention(null);
      return;
    }
    setMention(m);
    setSel(0);
  };

  const options = useMemo<MentionOption[]>(() => {
    if (!mention) return [];
    if (mention.mode === "tags") {
      const owned = filterOptions(tags, mention.query, "tags");
      if (owned.length) return owned;
    }
    return filterOptions(members, mention.memberQuery, "members");
  }, [mention, tags, members]);

  const choose = (opt?: MentionOption) => {
    const el = text.current;
    if (!opt || !el) return;
    const caret = el.selectionStart ?? draft.length;
    const start = mention?.start ?? 0;
    const before = draft.slice(0, start);
    const after = draft.slice(caret);
    let next: number;
    if (opt.kind === "tags") {
      onPickTag?.(opt.id);
      setDraft(before + after);
      next = before.length;
    } else {
      const inserted = `@${opt.name} `;
      setDraft(`${before}${inserted}${after}`);
      next = before.length + inserted.length;
    }
    setMention(null);
    setClosedAt(null);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next, next);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!options.length || !mention) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => (s + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => (s - 1 + options.length) % options.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      choose(options[sel]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      const el = e.currentTarget;
      setClosedAt({ start: mention.start, key: el.value.slice(mention.start, el.selectionStart ?? el.value.length) });
      setMention(null);
    }
  };

  const send = async () => {
    if (busy || disabled || (!draft.trim() && !file)) return;
    setBusy(true);
    setError("");
    let path: string | null = null;
    try {
      if (file) {
        const ext = chatImageExtension(file.type);
        path = `${me}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
      }
      await onSend(draft.trim() || "📷", path);
      setDraft("");
      setFile(null);
    } catch (e) {
      if (path) await supabase.storage.from(BUCKET).remove([path]);
      setError(e instanceof Error ? e.message : "Couldn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const image = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (image) {
      e.preventDefault();
      pick(image);
    }
  };

  const canSend = !busy && !disabled && (!!draft.trim() || !!file);
  const listLabel = mention?.mode === "tags" ? "Tags you can wear" : "Members to mention";

  return (
    <form onSubmit={onSubmit} className="relative shrink-0 px-3 pb-3 pt-2">
      {options.length > 0 && (
        <ul
          role="listbox"
          aria-label={listLabel}
          className="d-popover absolute bottom-full left-3 z-20 mb-2 max-h-56 w-64 overflow-y-auto p-1.5 text-sm"
        >
          {options.map((o, i) => (
            <li key={`${o.kind}-${o.id}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === sel}
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(o);
                }}
                onMouseEnter={() => setSel(i)}
                className={`flex w-full items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-left transition-colors duration-150 ${
                  i === sel ? "bg-[var(--d-active)]" : "hover:bg-[var(--d-hover)]"
                }`}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: o.swatch ?? (o.kind === "tags" ? "var(--primary)" : "var(--muted-foreground)") }}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{o.name}</span>
                {o.kind === "tags" && o.id === wearingTag ? (
                  <span className="d-chip d-chip-accent shrink-0">wearing</span>
                ) : (
                  <span className="shrink-0 text-[10px] text-[var(--d-text-faint)]">{o.kind === "tags" ? "wear" : "@"}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <div className="mb-2 flex items-start gap-2">
          <img src={preview} alt="Picture ready to send" className="h-20 max-w-40 rounded-xl border border-[var(--d-line)] object-contain" />
          <Button variant="ghost" size="icon" disabled={busy} aria-label="Remove attachment" title="Remove attachment" onClick={() => setFile(null)} className="d-icon-btn">
            <X />
          </Button>
        </div>
      )}
      {error && <p role="alert" className="mb-2 text-xs text-destructive">{error}</p>}
      <div className="d-composer">
        <input ref={input} aria-label="Chat image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <Button type="button" variant="ghost" size="icon" title="Attach picture" aria-label="Attach picture" disabled={busy || disabled} onClick={() => input.current?.click()} className="d-icon-btn size-8">
          <ImagePlus />
        </Button>
        <input
          ref={text}
          aria-label={placeholder}
          value={draft}
          disabled={busy || disabled}
          onPaste={onPaste}
          onChange={(e) => {
            setDraft(e.target.value);
            sync(e.target.value, e.target.selectionStart ?? e.target.value.length);
          }}
          onKeyUp={(e) => {
            if (e.key.startsWith("Arrow")) sync(e.currentTarget.value, e.currentTarget.selectionStart ?? 0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setMention(null)}
          maxLength={2000}
          placeholder={placeholder}
          className="d-bare-input h-9 min-w-0 flex-1 text-sm text-[var(--dc-text)] outline-none placeholder:text-[var(--d-text-faint)] disabled:opacity-50"
        />
        <Button
          type="submit"
          size="icon"
          aria-label="Send"
          title={busy ? "Sending…" : "Send"}
          disabled={!canSend}
          className="d-send"
          style={{ background: "var(--d-accent-grad)", color: "var(--d-on-accent)", boxShadow: canSend ? "0 6px 16px -8px var(--d-accent-glow)" : undefined }}
        >
          <Send className={busy ? "animate-pulse" : undefined} />
        </Button>
      </div>
    </form>
  );
}
