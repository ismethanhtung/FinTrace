import PageLayout from "../../components/PageLayout";
import { Database, Terminal, Cpu, History, Bell, Info } from "lucide-react";

export default function PlaceholderPage({ params }: { params: { slug: string } }) {
  const title = params.slug.charAt(0).toUpperCase() + params.slug.slice(1);
  return (
    <PageLayout title={title}>
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-secondary rounded-3xl flex items-center justify-center border border-main shadow-sm">
          <Info size={32} className="text-accent" />
        </div>
        <div className="space-y-2">
          <h2 className="text-[24px] font-bold">{title} View</h2>
          <p className="text-muted max-w-sm">This section is currently under development. Stay tuned for advanced features and updates.</p>
        </div>
        <button className="px-8 py-2.5 bg-accent text-white rounded-xl text-[14px] font-semibold hover:bg-accent/90 transition-all shadow-md">
          Back to Dashboard
        </button>
      </div>
    </PageLayout>
  );
}
