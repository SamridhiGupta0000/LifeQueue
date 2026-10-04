import { GitFork } from 'lucide-react';

export default function Dependencies() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="p-5 rounded-full bg-slate-800 border border-slate-700">
        <GitFork size={44} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100">Dependencies</h2>
      <p className="text-slate-400 max-w-sm">
        Visualise and manage task dependencies as a directed graph.
        Tasks that block other tasks are surfaced automatically. Coming soon.
      </p>
    </div>
  );
}
