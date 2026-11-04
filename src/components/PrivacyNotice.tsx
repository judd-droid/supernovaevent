"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// The privacy notice text, shared by the in-survey pop-up and the /privacy page.
export function PrivacyText() {
  return (
    <div className="text-[15px] leading-relaxed">
      <p>
        This Financial Wellness Survey is run by financial advisors of the Supernova Agency of AIA Philippines.
      </p>
      <h3 className="mt-5 font-display font-semibold">What we collect</h3>
      <p>Your answers to the survey and, only if you choose to give them, your name, mobile number, gender, civil status and date of birth.</p>
      <h3 className="mt-5 font-display font-semibold">How we use it</h3>
      <p>
        To understand the financial priorities of the people we serve and, if you agree to be contacted, so the advisor
        who gave you the survey can reach you about your goals. We don&rsquo;t sell your details or share them outside the agency.
      </p>
      <h3 className="mt-5 font-display font-semibold">Your choices</h3>
      <p>
        Giving your contact details is optional. You can ask your advisor at any time to see, correct or delete your
        details, or to stop contacting you. We keep your details only as long as they&rsquo;re needed for these purposes,
        in line with the Data Privacy Act of 2012.
      </p>
    </div>
  );
}

// The notice as a pop-up over the survey, so respondents never leave the page.
export function PrivacyPopup({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="privacy-title" onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
      <div onClick={(e) => e.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl">
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted active:bg-background">
          <X size={20} />
        </button>
        <h2 id="privacy-title" className="pr-10 font-display text-xl font-bold tracking-tight">Privacy notice</h2>
        <div className="mt-2 h-1 w-10 rounded bg-accent" />
        <div className="mt-4"><PrivacyText /></div>
      </div>
    </div>
  );
}
