import { BarChart2 } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="p-5 rounded-full bg-slate-800 border border-slate-700">
        <BarChart2 size={44} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100">Analytics</h2>
      <p className="text-slate-400 max-w-sm">
        Charts and trends powered by Recharts — task completion rates, priority
        distributions, effort vs. impact scatter plots. Coming soon.
      </p>
    </div>
  );
}
