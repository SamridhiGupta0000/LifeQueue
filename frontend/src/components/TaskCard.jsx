/**
 * Reusable card for a task in the priority queue.
 */
import PriorityIndicator from './PriorityIndicator';
import { formatMinutes, formatRelativeDeadline, deadlineBadgeClass } from '../utils/formatters';
import { AlertCircle } from 'lucide-react';

export default function TaskCard({ task, rank, onFocusStart }) {
  const deadline = formatRelativeDeadline(task.deadline);
  const statusDotColor = {
    'in_progress': 'bg-blue-400',
    'pending': 'bg-slate-500',
    'completed': 'bg-green-400',
  }[task.status] || 'bg-slate-500';

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-indigo-500/40 transition-all duration-200">
      <div className="flex items-start gap-4">
        {/* Rank Badge */}
        <div className="flex-shrink-0">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-bold">
            #{rank}
          </span>
        </div>

        {/* Title and Category */}
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-slate-100 font-medium truncate">{task.title}</h3>
            <div className={`flex-shrink-0 w-2 h-2 rounded-full ${statusDotColor}`} />
          </div>
          {task.category && (
            <span className="inline-block text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-300">
              {task.category}
            </span>
          )}
        </div>

        {/* Priority Score on the right */}
        <div className="flex-shrink-0">
          <PriorityIndicator score={task.priority_score ?? 0} showLabel={false} size="sm" />
        </div>
      </div>

      {/* Bottom row: deadline, effort, details */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {deadline && (
          <div className={`px-2.5 py-1 rounded-full ${deadlineBadgeClass(task.deadline)}`}>
            {deadline.label}
          </div>
        )}

        {task.estimated_minutes && (
          <div className="px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-300">
            {formatMinutes(task.estimated_minutes)}
          </div>
        )}
      </div>
    </div>
  );
}
