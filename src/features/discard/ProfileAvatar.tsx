import { useState, type CSSProperties, type ReactNode } from "react";
import { Crown, Shield } from "lucide-react";
import { cn } from "../../lib/cn";
import { AvatarDecoration } from "./AvatarDecoration";
import { useOnline } from "./lib/discard-presence";
import { chatTag } from "./lib/discard-profile";
import { shopTag } from "./lib/club-items";
import type { Profile } from "./lib/discard-types";

/** Profile picture (or the first letter on the avatar colour), the decoration ring, and the online dot. */
export function ProfileAvatar({ profile, className = "size-8", showStatus = true }: { profile?: Profile | undefined; className?: string; showStatus?: boolean }) {
  const online = useOnline(profile?.user_id);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const name = profile?.display_name ?? "User";
  const url = profile?.avatar_url && failedUrl !== profile.avatar_url ? profile.avatar_url : null;
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className="flex size-full items-center justify-center overflow-hidden rounded-full text-sm font-bold text-[var(--d-on-accent)] shadow-[inset_0_1px_0_var(--d-highlight)]"
        style={{ background: profile?.avatar_color || "var(--d-avatar)" }}
      >
        {url ? (
          <img src={url} alt={`${name}'s profile picture`} className="size-full object-cover" onError={() => setFailedUrl(url)} />
        ) : (
          <span aria-hidden="true">{name.trim()[0]?.toUpperCase() ?? "?"}</span>
        )}
      </span>
      <AvatarDecoration decoration={profile?.avatar_decoration} />
      {showStatus && (
        <span
          role="img"
          aria-label={online ? "Online" : "Offline"}
          title={online ? "Online" : "Offline"}
          className="d-status absolute -bottom-0.5 -right-0.5 z-10 size-[38%] min-h-2.5 min-w-2.5 rounded-full"
          style={{ backgroundColor: online ? "var(--d-online)" : "var(--d-offline)" }}
        />
      )}
    </span>
  );
}

function Pill({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("d-chip", className)} style={style}>
      {children}
    </span>
  );
}

/** Verified role, day-one badge and Club Bird chat tag shown beside a name. */
export function ChatTag({ profile }: { profile?: Profile | undefined }) {
  const label = chatTag(profile?.tag);
  const owner = label === "Owner";
  const staff = label === "Co-Owner" || label === "Mod";
  const bird = shopTag(profile?.shopTag);
  // Mod Management is a separate verified flag (discard_chat_tags), so it can sit beside a Mod or Co-Owner rank.
  const modMgmt = !!profile?.modMgmt;
  return (
    <span className="inline-flex flex-wrap items-center gap-1 align-middle">
      {modMgmt && (
        <span className="d-flame">
          <Shield className="size-3" />
          Mod Management
        </span>
      )}
      {(label !== "Member" || !modMgmt) && (
        <Pill className={owner ? "!border-transparent" : staff ? "d-chip-accent" : ""} style={owner ? { background: "var(--d-accent-grad)", color: "var(--d-on-accent)" } : undefined}>
          {owner && <Crown className="size-3" />}
          {staff && <Shield className="size-3" />}
          {label}
        </Pill>
      )}
      {profile?.dayOne && <Pill style={{ color: "var(--color-primary)", borderColor: "var(--color-primary)" }}>Day 1</Pill>}
      {bird && <Pill className="font-bold" style={{ color: bird.swatch, borderColor: bird.swatch }}>{bird.name}</Pill>}
    </span>
  );
}
