import {
  Hero, StatRow, Countdown, Heatmap, TodayFocus,
  AIInsights, SubjectMastery, QuickLinks,
} from "@/components/dashboard";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-5">
      <div className="animate-fade-up">
        <Hero />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "60ms" }}>
        <StatRow />
      </div>

      <div
        className="grid animate-fade-up grid-cols-[1.55fr_1fr] gap-5"
        style={{ animationDelay: "120ms" }}
      >
        <Countdown />
        <AIInsights />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
        <Heatmap />
      </div>

      <div
        className="grid animate-fade-up grid-cols-[1.4fr_1fr] gap-5"
        style={{ animationDelay: "240ms" }}
      >
        <TodayFocus />
        <SubjectMastery />
      </div>

      <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
        <QuickLinks />
      </div>
    </div>
  );
}
