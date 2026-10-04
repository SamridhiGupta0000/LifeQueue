import { useEffect, useState } from 'react';
import { Plus, Trash2, ListTodo } from 'lucide-react';
import { tasksApi } from '../services/api';
import { formatDate, priorityColor, statusBadgeClass } from '../utils/formatters';

export default function Tasks() {
  const [tasks,   setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await tasksApi.list();
      setTasks(res.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">My Tasks</h2>
          <p className="text-slate-400 mt-1">All tasks ranked by priority score</p>
        </div>
        <button
          disabled
          title="Task creation coming soon"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600
                     hover:bg-indigo-500 text-white text-sm font-medium
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse border border-slate-700" />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-red-400">{error}</div>
      ) : tasks.length === 0 ? (
        <div className="py-16 text-center bg-slate-800 rounded-xl border border-slate-700">
          <ListTodo size={44} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">No tasks yet.</p>
          <p className="text-slate-500 text-sm mt-1">Add your first task to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-left">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  className="bg-slate-800/60 hover:bg-slate-700/60 transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">{task.title}</p>
                    {task.description && (
                      <p className="text-slate-500 truncate max-w-xs mt-0.5">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{task.category}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(task.deadline)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${priorityColor(task.priority_score)}`}>
                      {task.priority_score}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(task.id)}
                      aria-label={`Delete task ${task.title}`}
                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
