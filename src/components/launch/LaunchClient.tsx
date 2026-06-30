"use client";

import dynamic from "next/dynamic";

/* WebGL must be browser-only — never server-render the Canvas. */
const CommandCenter = dynamic(() => import("./CommandCenter"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 grid place-items-center bg-[#02060d]">
      <p className="animate-pulse font-mono text-[10px] uppercase tracking-[0.34em]" style={{ color: "#3f6b8f" }}>
        Initialising command center…
      </p>
    </div>
  ),
});

export default function LaunchClient() {
  return <CommandCenter />;
}
