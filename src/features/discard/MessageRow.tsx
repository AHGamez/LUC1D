import { useMemo } from "react";
import { Pin, Trash2 } from "lucide-react";
import { ProfileAvatar, ChatTag } from "./ProfileAvatar";
import { ChatImage } from "./ChatImage";
import { NameEffect } from "./NameEffect";
import { radius, useDiscard } from "./DiscardContext";
import { togglePin } from "./lib/discard-messages";
import { splitMentions } from "./lib/chat-mentions";
import { timeLabel } from "./lib/discard-util";
import type { Profile } from "./lib/discard-types";

export interface MessageLike {
  id: string;
  content: string;
  created_at: string;
  image_path: string | null;
  pinned: boolean;
}

/** One chat line. Used by both channels ("channel") and direct messages ("dm"). */
export function MessageRow({
  message,
  authorId,
  kind,
  onPinned,
  onDelete,
}: {
  message: MessageLike;
  authorId: string;
  kind: "channel" | "dm";
  onPinned: (pinned: boolean) => void;
  onDelete: () => void;
}) {
  const { me, look, profiles, nameOf, toast } = useDiscard();
  const author: Profile | undefined = profiles[authorId];
  const names = useMemo(() => Object.values(profiles).map((p) => p.display_name), [profiles]);
  const mine = authorId === me;
  const myName = profiles[me]?.display_name;
  // A message that @mentions the viewer gets a tinted row, so it is easy to find while scrolling.
  const mentionsMe = !mine && !!myName && message.content.includes(`@${myName}`);
  const r = radius(look);

  const pin = async () => {
    const next = await togglePin(kind, message.id);
    if (next === null) toast("Couldn't change the pin. Try again.", "error");
    else onPinned(next);
  };

  const barVisible = message.pinned ? "" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100";

  return (
    <div
      className={`group relative flex gap-3 px-3 py-1.5 transition-colors duration-150 hover:bg-[var(--d-hover)] ${r} ${
        mentionsMe ? "bg-[var(--d-accent-soft)] shadow-[inset_3px_0_0_var(--dc-accent)] hover:bg-[var(--d-accent-soft)]" : ""
      }`}
    >
      {!look.compact && <ProfileAvatar profile={author} className="mt-0.5 size-9" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-[0.95em] font-semibold" style={author?.avatar_color ? { color: author.avatar_color } : undefined}>
            <NameEffect effect={author?.name_effect}>{nameOf(authorId)}</NameEffect>
          </span>
          <ChatTag profile={author} />
          {look.timestamps && <span className="text-[0.75em] text-[var(--d-text-faint)]">{timeLabel(message.created_at)}</span>}
          {message.pinned && <Pin className="size-3 text-[var(--dc-accent)]" aria-label="Pinned" />}
        </div>
        {look.compact ? (
          <span className="break-words leading-relaxed">{renderMentions(message.content, names)}</span>
        ) : (
          <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">{renderMentions(message.content, names)}</p>
        )}
        {message.image_path && <ChatImage path={message.image_path} />}
      </div>
      <div className={`d-action-bar transition-opacity duration-150 ${barVisible}`}>
        <button
          type="button"
          aria-label={message.pinned ? "Unpin message" : "Pin message"}
          title={message.pinned ? "Pinned, won't auto-delete" : "Pin to keep past 2 hours"}
          onClick={pin}
          className={`d-icon-btn size-7 focus-visible:outline-2 focus-visible:outline-ring ${message.pinned ? "accent" : ""}`}
        >
          <Pin className={`size-4 ${message.pinned ? "fill-current" : ""}`} />
        </button>
        {mine && (
          <button type="button" aria-label="Delete message" title="Delete message" onClick={onDelete} className="d-icon-btn danger size-7 focus-visible:outline-2 focus-visible:outline-ring">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/** Highlights "@Name" for any known display name, so a mention stands out in the message. */
function renderMentions(content: string, names: string[]) {
  return splitMentions(content, names).map((s, i) => (s.mention ? <span key={i} className="d-mention">{s.text}</span> : <span key={i}>{s.text}</span>));
}
