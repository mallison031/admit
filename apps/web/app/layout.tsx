// Shell + DEMO MODE banner when time_scale ≠ 1 (A-9.1).
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "Admit", description: "Instant hospital-deposit guarantees" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* TODO(A-9.1): DemoModeBanner reading pool.params.time_scale */}
        {children}
      </body>
    </html>
  );
}
