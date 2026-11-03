export const metadata = { title: "Privacy notice" };

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8 text-[15px] leading-relaxed">
      <h1 className="font-display text-2xl font-bold tracking-tight">Privacy notice</h1>
      <div className="mt-3 h-1 w-12 rounded bg-accent" />
      <p className="mt-5">
        This Financial Wellness Survey is run by financial advisors of the Supernova Agency of AIA Philippines.
      </p>
      <h2 className="mt-5 font-display font-semibold">What we collect</h2>
      <p>Your answers to the survey and, only if you choose to give them, your name, mobile number, gender, civil status and date of birth.</p>
      <h2 className="mt-5 font-display font-semibold">How we use it</h2>
      <p>
        To understand the financial priorities of the people we serve and, if you agree to be contacted, so the advisor
        who gave you the survey can reach you about your goals. We don&rsquo;t sell your details or share them outside the agency.
      </p>
      <h2 className="mt-5 font-display font-semibold">Your choices</h2>
      <p>
        Giving your contact details is optional. You can ask your advisor at any time to see, correct or delete your
        details, or to stop contacting you. We keep your details only as long as they&rsquo;re needed for these purposes,
        in line with the Data Privacy Act of 2012.
      </p>
    </main>
  );
}
