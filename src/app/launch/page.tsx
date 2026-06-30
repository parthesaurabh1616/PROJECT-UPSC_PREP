import type { Metadata } from "next";
import LaunchClient from "@/components/launch/LaunchClient";

export const metadata: Metadata = {
  title: "Command Center · Conquer Capital",
  description: "Strategic Intelligence Platform — global command center.",
};

/* Immersive, full-screen launch experience. Lives outside the (app)
   shell so there is no sidebar/chrome — just the globe and the HUD. */
export default function LaunchPage() {
  return <LaunchClient />;
}
