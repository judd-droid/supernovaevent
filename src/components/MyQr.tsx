"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, QrCode, Share2, X } from "lucide-react";

type Info = { name: string; active: boolean; path: string; isLeader: boolean };

// The signed-in advisor's own QR code. Scans of it are this advisor's leads. With an
// event, the code is for that event; "No event" gives their personal code, tied to no
// event (its leads carry no event name), and comes with its link to copy or share
// (chats, posts). Event codes are shown on screen only. The advisor's name and the
// event sit under the code so a wrong advisor or event is caught before a scan.
export function MyQr({ eventId, eventName, advisor, mobile, onClose, onReconfirm }: {
  eventId?: string; eventName?: string; advisor: string; mobile: string; onClose: () => void;
  /** Opens the agent-code step, for a device that hasn't confirmed this advisor yet. */
  onReconfirm?: () => void;
}) {
  const [reconfirm, setReconfirm] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [personal, setPersonal] = useState(!eventId);
  const id = personal ? "" : eventId ?? "";
  const [copied, setCopied] = useState(false);
  const choose = (p: boolean) => { if (p === personal) return; setInfo(null); setQr(""); setError(""); setCopied(false); setPersonal(p); };
  const link = info && typeof window !== "undefined" ? `${window.location.origin}${info.path}` : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { window.prompt("Copy your survey link:", link); }
  };
  const share = () => navigator.share?.({ title: "Free Financial Wellness Snapshot", text: "Answer a short survey and get your free Financial Wellness Snapshot:", url: link }).catch(() => {});

  useEffect(() => {
    const q = new URLSearchParams({ id, advisor, mobile });
    fetch(`/api/my-qr?${q}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setReconfirm(!!d.reconfirm); return setError(d.error ?? "Couldn't load your QR code."); }
        setInfo(d as Info);
        setQr(await QRCode.toDataURL(`${window.location.origin}${d.path}`, {
          errorCorrectionLevel: "M", margin: 2, width: 900, color: { dark: "#14181c", light: "#ffffff" },
        }));
      })
      .catch(() => setError("Couldn't reach the server. Your QR code needs an internet connection."));
  }, [id, advisor, mobile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label="Your QR code" className="fixed inset-0 z-50 overflow-y-auto bg-surface">
      <button type="button" onClick={onClose} aria-label="Close" title="Close"
        className="fixed right-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted">
        <X size={20} />
      </button>
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center px-6 py-10 text-center">

        {eventId && (
          <div className="inline-flex rounded-full border border-line p-1 text-sm" role="tablist" aria-label="Which code">
            <button type="button" role="tab" aria-selected={!personal} onClick={() => choose(false)}
              className={`h-9 max-w-52 truncate rounded-full px-4 ${!personal ? "bg-foreground font-medium text-white" : "text-muted"}`}>
              {eventName || "This event"}
            </button>
            <button type="button" role="tab" aria-selected={personal} onClick={() => choose(true)}
              className={`h-9 rounded-full px-4 ${personal ? "bg-foreground font-medium text-white" : "text-muted"}`}>
              No event
            </button>
          </div>
        )}

        {error && <p className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>}
        {error && reconfirm && onReconfirm && (
          <button type="button" onClick={onReconfirm} className="mt-3 h-11 rounded-full bg-foreground px-5 text-sm font-medium text-white">
            Confirm my agent code
          </button>
        )}
        {info && !personal && !info.active && (
          <p className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            This event is closed, so this code won&rsquo;t open the survey. Tap the calendar icon to choose today&rsquo;s event.
          </p>
        )}

        <p className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 font-semibold text-white">
          Get your FREE Financial Wellness Snapshot!
        </p>
        {qr ? <img src={qr} alt={`QR code for ${advisor}'s survey`} className="mt-4 w-full max-w-[360px]" />
          : <div className="mt-4 aspect-square w-full max-w-[360px] rounded-xl bg-background" />}
        <p className="mt-3 text-sm text-muted">Scan with your phone camera to answer the survey.</p>
        {personal && link && (
          <div className="mt-5 w-full max-w-[360px] border-t border-line pt-5 text-left">
            <p className="text-xs font-medium text-muted">Or use this link</p>
            <div className="mt-1 break-all rounded-lg border border-line bg-background px-3 py-2 text-xs">{link}</div>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={copy} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-line text-sm font-medium">
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy link</>}
              </button>
              {typeof navigator !== "undefined" && "share" in navigator && (
                <button type="button" onClick={share} className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-foreground text-sm font-medium text-white">
                  <Share2 size={15} /> Share
                </button>
              )}
            </div>
          </div>
        )}
        {info && !personal && <p className="mt-2 text-xs text-muted">{info.name} via {advisor}</p>}

        {!personal && info?.isLeader && (
          <a href={`/event-qr/${eventId}`} target="_blank" rel="noopener"
            className="mt-8 inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm">
            <QrCode size={15} /> Booth QR code (team leader&rsquo;s)
          </a>
        )}
      </div>
    </div>
  );
}
