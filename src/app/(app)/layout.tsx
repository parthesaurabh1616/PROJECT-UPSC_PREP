import { Shell } from "@/components/Shell";

// SmoothScroll (Lenis) removed — it conflicts with the Shell's internal overflow-y-auto
// and prevents mouse-wheel scrolling on the main content area.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Shell>{children}</Shell>;
}
