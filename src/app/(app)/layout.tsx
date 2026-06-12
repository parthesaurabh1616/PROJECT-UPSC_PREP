import { Shell } from "@/components/Shell";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScroll>
      <Shell>{children}</Shell>
    </SmoothScroll>
  );
}
