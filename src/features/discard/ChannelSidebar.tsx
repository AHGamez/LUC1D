import { useState } from "react";
import { Copy, Globe, Hash, LogOut, Plus, Settings2, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ProfileAvatar } from "./ProfileAvatar";
import { ConfirmDialog, NameDialog } from "./Dialogs";
import { useDiscard, radius } from "./DiscardContext";
import type { Channel, Profile, Server } from "./lib/discard-types";

/** Server header (invite code, public toggle, delete or leave), channel list, and the signed-in user's panel. */
export function ChannelSidebar({
  me,
  server,
  channels,
  channelId,
  profile,
  onSelectChannel,
  onChannelCreated,
  onServerChanged,
  onServerRemoved,
  onSettings,
}: {
  me: string;
  server: Server | undefined;
  channels: Channel[];
  channelId: string;
  profile: Profile | undefined;
  onSelectChannel: (id: string) => void;
  onChannelCreated: (c: Channel) => void;
  onServerChanged: () => void;
  onServerRemoved: () => void;
  onSettings: () => void;
}) {
  const { look, toast } = useDiscard();
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "leave" | null>(null);
  const r = radius(look);
  const isOwner = !!server && server.owner_id === me;
  const hasOwner = !!server?.owner_id;

  const togglePublic = async () => {
    if (!server) return;
    const { error } = await supabase.from("discard_servers").update({ is_public: !server.is_public }).eq("id", server.id);
    if (error) return toast(error.message, "error");
    onServerChanged();
  };

  const copyInvite = async () => {
    if (!server) return;
    try {
      await navigator.clipboard.writeText(server.invite_code);
      toast("Invite code copied", "success");
    } catch {
      toast(`Invite code: ${server.invite_code}`, "info");
    }
  };

  const createChannel = async (raw: string): Promise<string | void> => {
    const name = raw.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
    const { data, error } = await supabase.from("discard_channels").insert({ server_id: server?.id ?? "", name }).select().single();
    if (error) return error.message;
    onChannelCreated(data);
  };

  return (
    <aside className="d-surface flex w-56 shrink-0 flex-col border-r border-[var(--d-line)]">
      <div className="d-header">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold">
          {server?.is_public && <Globe className="size-3.5 shrink-0 text-[var(--d-text-faint)]" aria-label="Public server" />}
          <span className="truncate">{server?.name ?? "Discard"}</span>
        </span>
        {isOwner && (
          <button type="button" aria-label="Delete server" title="Delete server" onClick={() => setConfirm("delete")} className="d-icon-btn danger">
            <Trash2 className="size-4" />
          </button>
        )}
        {server && !isOwner && hasOwner && (
          <button type="button" aria-label="Leave server" title="Leave server" onClick={() => setConfirm("leave")} className="d-icon-btn">
            <LogOut className="size-4" />
          </button>
        )}
      </div>

      {server && hasOwner && (
        <div className="space-y-2 border-b border-[var(--d-line)] px-3 py-3 text-xs">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--d-text-faint)]">Invite code</div>
          <button type="button" onClick={copyInvite} className={`d-field flex h-8 w-full justify-between px-2.5 font-mono text-[13px] tracking-widest hover:bg-[var(--d-active)] ${r}`}>
            {server.invite_code}
            <Copy className="size-3 text-[var(--d-text-faint)]" />
          </button>
          {isOwner && (
            <label className="flex items-center gap-2 text-[var(--d-text-muted)]">
              <input type="checkbox" checked={server.is_public} onChange={togglePublic} className="accent-[var(--dc-accent)]" /> Public (findable by name)
            </label>
          )}
        </div>
      )}

      <nav aria-label="Channels" className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        <div className="d-label">Channels</div>
        {channels.map((c) => {
          const active = c.id === channelId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectChannel(c.id)}
              aria-current={active ? "true" : undefined}
              className="d-row text-[13px]"
            >
              <Hash className={`size-4 shrink-0 ${active ? "text-[var(--dc-accent)]" : "text-[var(--d-text-faint)]"}`} />
              <span className="truncate">{c.name}</span>
            </button>
          );
        })}
        {isOwner && (
          <button type="button" onClick={() => setNewChannelOpen(true)} className="d-row text-[13px] text-[var(--d-text-faint)] hover:text-[var(--dc-text)]">
            <Plus className="size-4" /> Add channel
          </button>
        )}
      </nav>

      <div className="m-2 flex items-center gap-2.5 rounded-[14px] border border-[var(--d-line)] bg-[var(--d-card)] p-2 shadow-[inset_0_1px_0_var(--d-highlight)]">
        <ProfileAvatar profile={profile} className="size-8" />
        <div className="min-w-0 flex-1 text-xs">
          <div className="truncate font-semibold">{profile?.display_name ?? "…"}</div>
          <div className="truncate text-[var(--d-text-muted)]">{profile?.status || "Online"}</div>
        </div>
        <button type="button" aria-label="Discard settings" title="Discard settings" onClick={onSettings} className="d-icon-btn">
          <Settings2 className="size-4" />
        </button>
      </div>

      <NameDialog
        open={newChannelOpen}
        title="New channel"
        label="Channel name"
        placeholder="general"
        submitLabel="Create channel"
        maxLength={32}
        onSubmit={createChannel}
        onClose={() => setNewChannelOpen(false)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        title="Delete server"
        body={`Delete ${server?.name ?? "this server"} for everyone? Its channels and messages will be removed.`}
        confirmLabel="Delete server"
        destructive
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!server) return;
          const { error } = await supabase.from("discard_servers").delete().eq("id", server.id);
          if (error) return error.message;
          onServerRemoved();
        }}
      />
      <ConfirmDialog
        open={confirm === "leave"}
        title="Leave server"
        body={`Leave ${server?.name ?? "this server"}? You can rejoin with an invite code or from Find a server.`}
        confirmLabel="Leave"
        destructive
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!server) return;
          const { error } = await supabase.from("discard_members").delete().eq("server_id", server.id).eq("user_id", me);
          if (error) return error.message;
          onServerRemoved();
        }}
      />
    </aside>
  );
}
