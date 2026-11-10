"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";

type Info = { name: string; active: boolean; path: string; isLeader: boolean };

// The signed-in advisor's own QR code. Scans of it are this advisor's leads. With an
// event, the code is for that event; "No event" gives their personal code, tied to no
// event (its leads carry no event name). Shown on screen only, with the advisor's
// name and the event under the code so a wrong advisor or event is caught before a scan.
export function MyQr({ eventId, eventName, advisor, mobile, onClose }: {
  eventId?: string; eventName?: string; advisor: string; mobile: string; onClose: () => void;
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");
  const [personal, setPersonal] = useState(!eventId);
  const id = personal ? "" : eventId ?? "";
  const choose = (p: boolean) => { if (p === personal) return; setInfo(null); setQr(""); setError(""); setPersonal(p); };

  useEffect(() => {
    const q = new URLSearchParams({ id, advisor, mobile });
    fetch(`/api/my-qr?${q}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return setError(d.error ?? "Couldn't load your QR code.");
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
        {info && <p className="mt-2 text-xs text-muted">{personal ? `${advisor}'s personal code, for any time (no event)` : `${info.name} via ${advisor}`}</p>}

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
