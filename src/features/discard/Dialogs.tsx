import { useState, type FormEvent } from "react";
import { Modal, Input, Label } from "../../components/ui/kit";
import { Button } from "../../components/ui/Button";

/** Single text field dialog, used for naming servers channels and friends. */
export function NameDialog({
  open,
  title,
  label,
  placeholder,
  submitLabel,
  maxLength = 40,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  maxLength?: number;
  /** Returns an error message to show, or nothing when the dialog can close. */
  onSubmit: (value: string) => Promise<string | void>;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    setBusy(true);
    const err = await onSubmit(trimmed);
    setBusy(false);
    if (err) return setError(err);
    setValue("");
    setError("");
    onClose();
  };
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Label>{label}</Label>
        <Input autoFocus value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => { setValue(e.target.value); setError(""); }} />
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="d-btn-ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !value.trim()} className="d-btn d-btn-primary">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** New server: name, icon emoji and whether it is listed publicly. */
export function CreateServerDialog({
  open,
  onCreate,
  onClose,
}: {
  open: boolean;
  onCreate: (name: string, icon: string, isPublic: boolean) => Promise<string | void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("💬");
  const [isPublic, setPublic] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const err = await onCreate(name.trim().slice(0, 40), icon.trim().slice(0, 4) || "💬", isPublic);
    setBusy(false);
    if (err) return setError(err);
    setName(""); setIcon("💬"); setPublic(false); setError("");
    onClose();
  };
  return (
    <Modal open={open} title="Create a server" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[4rem_1fr] gap-3">
          <Label>Icon<Input aria-label="Server icon" value={icon} maxLength={4} onChange={(e) => setIcon(e.target.value)} className="mt-1 text-center text-lg" /></Label>
          <Label>Name<Input autoFocus aria-label="Server name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="My server" className="mt-1" /></Label>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setPublic(e.target.checked)} className="mt-1" />
          <span>Make it public<span className="block text-xs opacity-60">Anyone can find it by name. Off means private, joined by invite code only.</span></span>
        </label>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="d-btn-ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy || !name.trim()} className="d-btn d-btn-primary">Create server</Button>
        </div>
      </form>
    </Modal>
  );
}

/** Yes/no confirmation. The action may fail; the error is shown and the dialog stays open. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  destructive = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<string | void>;
  onClose: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const err = await onConfirm();
    setBusy(false);
    if (err) return setError(err);
    setError("");
    onClose();
  };
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm opacity-80">{body}</p>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="d-btn-ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy} className={destructive ? "d-btn d-btn-danger" : "d-btn d-btn-primary"} onClick={run}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
