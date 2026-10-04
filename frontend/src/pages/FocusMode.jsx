import { Crosshair } from 'lucide-react';

export default function FocusMode() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="p-5 rounded-full bg-slate-800 border border-slate-700">
        <Crosshair size={44} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100">Focus Mode</h2>
      <p className="text-slate-400 max-w-sm">
        Focus Mode will surface your single highest-priority task and help you
        work through it distraction-free. Coming soon.
      </p>
    </div>
  );
}
