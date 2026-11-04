// Shell + DEMO MODE banner when time_scale ≠ 1 (A-9.1).
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { DemoModeBanner } from "../components/DemoModeBanner";

export const metadata: Metadata = {
  title: "Admit · Emergency Hospital Guarantees",
  description: "Instant, verifiable hospital-deposit guarantees from community pools on NEAR",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Read time scale from env if set (e.g. 60 or 3600 for demo mode)
  const timeScale = process.env.NEXT_PUBLIC_TIME_SCALE
    ? parseInt(process.env.NEXT_PUBLIC_TIME_SCALE, 10)
    : 1;

  return (
    <html lang="en" className="dark bg-slate-950 text-slate-100 antialiased">
      <body className="min-h-screen flex flex-col bg-slate-950">
        <DemoModeBanner timeScale={timeScale} />

        {/* Top Navbar */}
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="w-6 h-6 rounded bg-sky-500 flex items-center justify-center text-white font-bold text-xs tracking-tighter">
                +
              </span>
              <span className="font-bold text-base tracking-tight text-white group-hover:text-sky-400 transition-colors">
                Admit
              </span>
            </Link>

            <nav aria-label="Main Navigation" className="flex items-center gap-1 sm:gap-3 text-xs font-medium">
              <Link
                href="/request"
                className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Request
              </Link>
              <Link
                href="/hospital"
                className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Hospital
              </Link>
              <Link
                href="/member"
                className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Member
              </Link>
              <Link
                href="/council"
                className="px-2.5 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                Council
              </Link>
            </nav>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
