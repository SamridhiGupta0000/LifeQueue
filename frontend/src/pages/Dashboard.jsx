import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ListTodo, Zap, Clock, TrendingUp, AlertCircle, RefreshCw, Target, PlayCircle, Trophy } from 'lucide-react';
import { tasksApi, analyticsApi, focusApi } from '../services/api';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import PriorityIndicator from '../components/PriorityIndicator';
import { formatMinutes, formatRelativeDeadline } from '../utils/formatters';

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const [prioritizedTasks, setPrioritizedTasks] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('recommended');
  const [focusState, setFocusState] = useState({ loading: false, success: false, error: null, taskId: null });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, analyticsRes] = await Promise.all([
        tasksApi.prioritized(),
        analyticsApi.get(),
      ]);
      setPrioritizedTasks(tasksRes.data ?? []);
      setAnalytics(analyticsRes.data ?? null);
    } catch (e) {
      setError(e.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute stats
  const incompleteTasks = prioritizedTasks.filter(t => t.status !== 'completed');
  const topTask = incompleteTasks[0] ?? null;

  const tasksToday = prioritizedTasks.filter(t => {
    if (t.status === 'completed') return false;
    const created = new Date(t.created_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return created >= dayAgo;
  }).length || (analytics?.pending_tasks ?? 0) + (analytics?.in_progress_tasks ?? 0);

  const highPriority = prioritizedTasks.filter(
    t => t.priority_score >= 70 && t.status !== 'completed'
  ).length;

  const availableTimeMs = incompleteTasks.reduce((s, t) => s + (t.estimated_minutes || 0), 0);

  const productivityScore = analytics?.avg_priority_score ? Math.round(analytics.avg_priority_score) : 0;

  // Sort queue client-side
  const sortedQueue = useMemo(() => {
    const list = incompleteTasks.slice(0, 8);
    if (sortBy === 'deadline') {
      return [...list].sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    }
    if (sortBy === 'effort') {
      return [...list].sort((a, b) => (a.estimated_minutes || 0) - (b.estimated_minutes || 0));
    }
    return list; // recommended: already sorted by priority_score desc from API
  }, [incompleteTasks, sortBy]);

  // Focus start handler
  const handleStartFocus = async (taskId) => {
    setFocusState({ loading: true, success: false, error: null, taskId });
    try {
      await focusApi.start(taskId);
      setFocusState({ loading: false, success: true, error: null, taskId });
      setTimeout(() => setFocusState(s => ({ ...s, success: false })), 3000);
    } catch (e) {
      setFocusState({ loading: false, success: false, error: e.message || 'Failed to start focus session', taskId });
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-100">{getGreeting()} 👋</h2>
          <p className="text-slate-400 mt-1">Here's what deserves your attention today.</p>
        </div>
        <button
          disabled
          title="Coming soon"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Add Task
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1 px-3 py-1 text-xs rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/60 rounded-2xl animate-pulse border border-slate-700/50" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tasks Today" value={tasksToday} icon={ListTodo} color="text-indigo-400" />
          <StatCard label="High Priority" value={highPriority} icon={Zap} color="text-orange-400" />
          <StatCard label="Available Time" value={formatMinutes(availableTimeMs)} icon={Clock} color="text-blue-400" />
          <StatCard label="Productivity Score" value={productivityScore} icon={TrendingUp} color="text-green-400" />
        </div>
      )}

      {/* Top Task - "What Should I Do Now?" */}
      {loading ? (
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 animate-pulse h-64" />
      ) : topTask ? (
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-6">
            <Target className="inline mr-2" size={16} />
            What Should I Do Now?
          </h3>

          <div className="space-y-6">
            {/* Title and Score */}
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-100">{topTask.title}</h2>
              <PriorityIndicator score={topTask.priority_score ?? 0} showLabel={false} size="lg" />
            </div>

            {/* Details row */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {topTask.deadline && (
                <div className="px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300">
                  📅 {formatRelativeDeadline(topTask.deadline)?.label}
                </div>
              )}
              {topTask.estimated_minutes && (
                <div className="px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300">
                  ⏱️ {formatMinutes(topTask.estimated_minutes)}
                </div>
              )}
              {topTask.category && (
                <div className="px-3 py-1.5 rounded-full bg-slate-700/50 text-slate-300">
                  {topTask.category}
                </div>
              )}
            </div>

            {/* Explanation / Priority breakdown */}
            {topTask.priority_breakdown?.explanation && (
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <p className="text-xs font-semibold text-slate-400 uppercase">Why this task?</p>
                <ul className="space-y-1">
                  {Array.isArray(topTask.priority_breakdown.explanation) ? (
                    topTask.priority_breakdown.explanation.map((item, idx) => (
                      <li key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-slate-300 text-sm flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span>{topTask.priority_breakdown.explanation}</span>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleStartFocus(topTask.id)}
                disabled={focusState.loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                <PlayCircle size={18} />
                {focusState.loading ? 'Starting...' : 'Start Focus'}
              </button>
              <button
                disabled
                title="Coming soon"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/50 text-slate-300 font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Task
              </button>
            </div>

            {/* Focus feedback */}
            {focusState.success && focusState.taskId === topTask.id && (
              <div className="text-sm text-green-400">✓ Focus session started</div>
            )}
            {focusState.error && focusState.taskId === topTask.id && (
              <div className="text-sm text-red-400">{focusState.error}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12 text-center">
          <Trophy size={48} className="mx-auto text-green-400 mb-4" />
          <p className="text-lg font-semibold text-slate-100">All caught up!</p>
          <p className="text-slate-400 mt-2">Great job. Take a break. 🎉</p>
        </div>
      )}

      {/* Priority Queue */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-100">Your Priority Queue</h3>

          {/* Sort buttons */}
          <div className="flex gap-2">
            {['recommended', 'deadline', 'priority', 'effort'].map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  sortBy === option
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-100'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-800/60 rounded-2xl animate-pulse border border-slate-700/50" />
            ))}
          </div>
        ) : incompleteTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl">
            <ListTodo size={40} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-300 font-medium">No tasks yet.</p>
            <p className="text-slate-500 text-sm mt-1">
              Head to <span className="text-indigo-400">My Tasks</span> to add your first task.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedQueue.map((task, idx) => (
              <TaskCard
                key={task.id}
                task={task}
                rank={idx + 1}
                onFocusStart={() => handleStartFocus(task.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
