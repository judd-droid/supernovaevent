import { PrivacyText } from "@/components/PrivacyNotice";

export const metadata = { title: "Privacy notice" };

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Privacy notice</h1>
      <div className="mt-3 mb-5 h-1 w-12 rounded bg-accent" />
      <PrivacyText />
    </main>
  );
}
