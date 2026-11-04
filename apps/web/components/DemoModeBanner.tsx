import React from "react";

export interface DemoModeBannerProps {
  timeScale?: number;
}

export function DemoModeBanner({ timeScale = 1 }: DemoModeBannerProps) {
  if (!timeScale || timeScale === 1) {
    return null;
  }

  return (
    <aside
      aria-label="Demo mode warning"
      className="bg-amber-500 text-black font-semibold text-xs sm:text-sm px-4 py-1.5 text-center flex items-center justify-center gap-2 shadow-sm"
    >
      <span className="inline-block px-1.5 py-0.5 bg-black text-amber-400 rounded text-[10px] font-bold tracking-wider uppercase">
        DEMO MODE
      </span>
      <span>
        DEMO MODE ×{timeScale}: Contract time-scale is accelerated for testing. Timers elapse faster than real time.
      </span>
    </aside>
  );
}
