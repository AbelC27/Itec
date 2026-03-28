import ActiveSessions from "@/components/dashboard/ActiveSessions";
import ConnectedEnvironments from "@/components/dashboard/ConnectedEnvironments";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import InsightCard from "@/components/dashboard/InsightCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentFiles from "@/components/dashboard/RecentFiles";

export default function DashboardPage() {
  return (
    <section className="relative space-y-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10 bg-[radial-gradient(circle_at_top,_rgba(30,58,138,0.2),_transparent_60%)]"
      />
      <DashboardHeader userName="Avery" extensionConnected />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ActiveSessions />
          <RecentFiles />
        </div>
        <aside className="space-y-6">
          <QuickActions />
          <ConnectedEnvironments />
          <InsightCard />
        </aside>
      </div>
    </section>
  );
}
