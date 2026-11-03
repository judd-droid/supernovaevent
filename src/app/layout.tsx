import type { Metadata, Viewport } from "next";
import { Poppins, Roboto } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["500", "600", "700"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Financial Wellness Survey",
  description: "Supernova's booth survey.",
  appleWebApp: { capable: true, title: "Wellness Survey", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${roboto.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
