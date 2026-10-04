import { Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="p-5 rounded-full bg-slate-800 border border-slate-700">
        <SettingsIcon size={44} className="text-indigo-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100">Settings</h2>
      <p className="text-slate-400 max-w-sm">
        Configure scoring weights, notification preferences, categories, and
        theme options. Coming soon.
      </p>
    </div>
  );
}
