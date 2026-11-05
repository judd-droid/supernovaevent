"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { QrCode, X } from "lucide-react";

type Info = { name: string; active: boolean; path: string; isLeader: boolean };

// The signed-in advisor's own QR code for the event this device is set to. Scans
// of it are this advisor's leads. Shown on screen only, with the advisor's name and
// the event in large type so a wrong advisor or event is caught before a scan.
export function MyQr({ eventId, advisor, mobile, onClose }: {
  eventId: string; advisor: string; mobile: string; onClose: () => void;
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    const q = new URLSearchParams({ id: eventId, advisor, mobile });
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
  }, [eventId, advisor, mobile]);

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
        <h1 className="mt-4 font-display text-2xl font-bold leading-snug tracking-tight">
          {info?.name ?? " "} <span className="whitespace-nowrap">via {advisor}</span>
        </h1>
        <div className="mx-auto mt-3 h-1 w-12 rounded bg-accent" />

        {error && <p className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>}
        {info && !info.active && (
          <p className="mt-6 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            This event is closed, so this code won&rsquo;t open the survey. Tap the calendar icon to choose today&rsquo;s event.
          </p>
        )}

        <p className="mt-6 inline-block rounded-lg bg-accent px-4 py-2 font-semibold text-white">
          Get your FREE Financial Wellness Snapshot!
        </p>
        {qr ? <img src={qr} alt={`QR code for ${advisor}'s survey`} className="mt-4 w-full max-w-[360px]" />
          : <div className="mt-4 aspect-square w-full max-w-[360px] rounded-xl bg-background" />}
        <p className="mt-3 text-sm text-muted">Scan with your phone camera to answer the survey.</p>

        {info?.isLeader && (
          <a href={`/event-qr/${eventId}`} target="_blank" rel="noopener"
            className="mt-8 inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-sm">
            <QrCode size={15} /> Booth QR code (team leader&rsquo;s)
          </a>
        )}
      </div>
    </div>
  );
}
