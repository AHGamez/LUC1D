import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/kit";
import { supabase } from "../../lib/supabase";

const SIGNED_URL_SECONDS = 3600;
const REFRESH_MS = 45 * 60 * 1000;

/**
 * A picture attached to a message. The bucket is private, so the URL is a signed one that is refreshed
 * while the message is on screen. Storage read policies decide whether the viewer may see it.
 */
export function ChatImage({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const { data, error } = await supabase.storage.from("discard-chat-images").createSignedUrl(path, SIGNED_URL_SECONDS);
      if (!live) return;
      setUrl(data?.signedUrl ?? "");
      setFailed(Boolean(error) || !data);
    };
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [path]);

  if (failed) return <p className="mt-1 text-xs opacity-60">Picture unavailable</p>;
  if (!url) return <p className="mt-1 text-xs opacity-60">Loading picture…</p>;

  return (
    <>
      <button type="button" aria-label="View chat picture" onClick={() => setOpen(true)} className="mt-2 block max-w-full rounded-lg focus-visible:outline-2 focus-visible:outline-ring">
        <img src={url} alt="Chat attachment" onError={() => setFailed(true)} className="max-h-64 max-w-full rounded-xl border border-[var(--d-line)] object-contain" />
      </button>
      <Modal open={open} title="Chat picture" onClose={() => setOpen(false)}>
        <img src={url} alt="Chat attachment enlarged" className="max-h-[70%] w-full object-contain" />
      </Modal>
    </>
  );
}
