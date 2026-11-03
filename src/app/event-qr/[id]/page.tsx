"use client";

import { use, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";

type Info = { name: string; token: string; leader: string | null; active: boolean };

// The event's QR code, to print or show on a screen at the booth. Respondents scan
// it to answer the survey on their own phones.
export default function EventQr({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [qr, setQr] = useState("");

  useEffect(() => {
    fetch(`/api/event-qr?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return setError(d.error ?? "Couldn't load this event.");
        setInfo(d as Info);
        const link = `${window.location.origin}/e/${d.token}`;
        setQr(await QRCode.toDataURL(link, { errorCorrectionLevel: "M", margin: 2, width: 1024, color: { dark: "#14181c", light: "#ffffff" } }));
      })
      .catch(() => setError("Couldn't reach the server."));
  }, [id]);

  const link = info && typeof window !== "undefined" ? `${window.location.origin}/e/${info.token}` : "";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center px-6 py-10 text-center print:py-0">
      {error && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">{error}</p>}
      {info && (
        <>
          {(!info.leader || !info.active) && (
            <p className="mb-6 rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent print:hidden">
              {!info.active ? "This event is closed, so the QR code won't open the survey."
                : "This event has no team leader yet, so the QR code won't open the survey. Ask Judd to assign one in admin."}
            </p>
          )}
          <img src="/supernova-logo.png" alt="Supernova Financial" className="h-10 w-auto" />
          <h1 className="mt-8 font-display text-4xl font-bold tracking-tight">Financial Wellness Survey</h1>
          <div className="mx-auto mt-3 h-1 w-14 rounded bg-accent" />
          <p className="mt-4 text-xl">Scan with your phone camera to answer in a few minutes.</p>
          <p className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 text-lg font-semibold text-white [print-color-adjust:exact]">
            Get your FREE Financial Wellness Snapshot!
          </p>
          {qr ? <img src={qr} alt="QR code for the survey" className="mt-8 w-full max-w-[420px]" />
            : <div className="mt-8 aspect-square w-full max-w-[420px] rounded-xl bg-background" />}
          <p className="mt-6 text-sm text-muted">{info.name}</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3 print:hidden">
            <button onClick={() => window.print()} className="inline-flex h-11 items-center gap-2 rounded-lg bg-foreground px-5 font-medium text-white">
              <Printer size={17} /> Print
            </button>
            {qr && (
              <a href={qr} download={`QR - ${info.name.replace(/[\\/:*?"<>|]+/g, "-")}.png`}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-surface px-5 font-medium">
                <Download size={17} /> Download image
              </a>
            )}
          </div>
          {link && <p className="mt-4 break-all text-xs text-muted print:hidden">{link}</p>}
        </>
      )}
    </main>
  );
}
