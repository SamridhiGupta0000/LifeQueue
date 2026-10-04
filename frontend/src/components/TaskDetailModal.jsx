import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { tasksApi } from '../services/api';
import { formatDate, formatMinutes, deadlineBadgeClass, statusBadgeClass } from '../utils/formatters';
import PriorityIndicator from './PriorityIndicator';

export default function TaskDetailModal({
  task,
  onClose,
  onEdit,
  onComplete,
  onDelete,
}) {
  const [loading, setLoading] = useState(false);
  const [localTask, setLocalTask] = useState(task);

  // Update local task when task prop changes
  useEffect(() => {
    setLocalTask(task);
  }, [task]);

  if (!task) return null;

  async function handleComplete() {
    setLoading(true);
    try {
      await onComplete(task);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task? This action cannot be undone.')) return;
    setLoading(true);
    try {
      await onDelete(task);
    } finally {
      setLoading(false);
    }
  }

  const currentTask = localTask || task;
  const isDone = currentTask.status === 'done';
  const isComplete = currentTask.status === 'completed';

  // Build score bars - map API field names
  const scoreItems = [
    { label: 'Urgency', value: currentTask.urgency || 0 },
    { label: 'Impact', value: currentTask.impact_score || (currentTask.impact ? currentTask.impact * 10 : 0) },
    { label: 'Efficiency', value: currentTask.effort_efficiency || currentTask.effortEfficiency || 0 },
    { label: 'Dependency', value: currentTask.dependency_impact || currentTask.dependencyImpact || 0 },
    { label: 'Consequence', value: currentTask.consequence_score || (currentTask.consequence && typeof currentTask.consequence === 'number' ? currentTask.consequence * 10 : 0) },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-slate-100">{currentTask.title}</h2>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(
                  currentTask.status
                )}`}
              >
                {currentTask.status?.replace('_', ' ')}
              </span>
            </div>
            {currentTask.description && (
              <p className="text-slate-400 text-sm">{currentTask.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Priority Score */}
          <div>
            <h3 className="text-lg font-semibold text-slate-100 mb-4">Priority Analysis</h3>
            <div className="flex items-center gap-6 mb-6">
              <PriorityIndicator score={currentTask.priority_score || 0} showLabel={true} size="lg" />
              <div>
                <p className="text-slate-400 text-sm">Priority Score</p>
                <p className="text-3xl font-bold text-slate-100">{Math.round(currentTask.priority_score || 0)}/100</p>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-3">
              {scoreItems.map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-300">{item.label}</span>
                    <span className="text-sm text-slate-400">{Math.round(item.value)}/100</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all rounded-full"
                      style={{ width: `${Math.min(item.value, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Why */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-sm font-semibold text-slate-100 mb-3">Why this priority?</h3>
            {currentTask.explanation && currentTask.explanation.length > 0 ? (
              <ul className="space-y-2">
                {currentTask.explanation.map((line, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-indigo-400 mt-0.5">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 text-sm">No explanation available.</p>
            )}
          </div>

          {/* Details */}
          <div className="border-t border-slate-700 pt-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Details</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase">Category</p>
                <p className="text-sm text-slate-200 mt-1">{currentTask.category}</p>
              </div>

              {currentTask.deadline && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Deadline</p>
                  <p className={`text-sm font-medium mt-1 ${deadlineBadgeClass(currentTask.deadline)}`}>
                    {formatDate(currentTask.deadline)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-xs font-medium text-slate-400 uppercase">Effort</p>
                <p className="text-sm text-slate-200 mt-1">{formatMinutes(currentTask.estimated_minutes)}</p>
              </div>

              {currentTask.created_at && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Created</p>
                  <p className="text-sm text-slate-200 mt-1">{formatDate(currentTask.created_at)}</p>
                </div>
              )}

              {currentTask.completed_at && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase">Completed</p>
                  <p className="text-sm text-slate-200 mt-1">{formatDate(currentTask.completed_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Dependencies */}
          {currentTask.dependencies && currentTask.dependencies.length > 0 && (
            <div className="border-t border-slate-700 pt-6">
              <h3 className="text-sm font-semibold text-slate-100 mb-3">Dependencies</h3>
              <ul className="space-y-2">
                {currentTask.dependencies.map((dep) => (
                  <li key={dep.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-300">{dep.title}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeClass(
                        dep.status
                      )}`}
                    >
                      {dep.status?.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              onClick={() => onEdit(currentTask)}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-slate-700 text-slate-100 font-medium text-sm
                         hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Edit
            </button>

            <button
              onClick={handleComplete}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-green-600/20 text-green-300 font-medium text-sm border border-green-500/30
                         hover:bg-green-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader size={14} className="animate-spin" />}
              {isDone || isComplete ? 'Reopen' : 'Complete'}
            </button>

            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2.5 rounded-lg bg-red-600/20 text-red-300 font-medium text-sm border border-red-500/30
                         hover:bg-red-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader size={14} className="animate-spin" />}
              Delete
            </button>

            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-slate-100 font-medium text-sm
                         hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
