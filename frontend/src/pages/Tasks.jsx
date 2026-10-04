import { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, ListTodo, Search, Filter, Loader } from 'lucide-react';
import { tasksApi } from '../services/api';
import { formatDate, formatMinutes, formatRelativeDeadline, deadlineBadgeClass, statusBadgeClass } from '../utils/formatters';
import PriorityIndicator from '../components/PriorityIndicator';
import AddTaskModal from '../components/AddTaskModal';
import TaskDetailModal from '../components/TaskDetailModal';

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'effort', label: 'Effort' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Completed' },
];

export default function Tasks() {
  // Data
  const [tasks, setTasks] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('priority');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Load tasks on mount
  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await tasksApi.prioritized();
      setTasks(res.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by search query (title or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          (t.description && t.description.toLowerCase().includes(query))
      );
    }

    // Filter by status
    if (filterBy !== 'all') {
      result = result.filter((t) => t.status === filterBy);
    } else {
      // When showing all, exclude archived and done
      result = result.filter((t) => t.status !== 'archived' && t.status !== 'done');
    }

    // Sort
    if (sortBy === 'deadline') {
      result.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    } else if (sortBy === 'effort') {
      result.sort((a, b) => {
        const aEffort = a.estimated_minutes || 0;
        const bEffort = b.estimated_minutes || 0;
        return aEffort - bEffort;
      });
    } else {
      // priority (default) - already sorted by API
      // but re-sort just in case
      result.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));
    }

    return result;
  }, [tasks, searchQuery, filterBy, sortBy]);

  async function handleCreate() {
    setEditingTask(null);
    setShowAddModal(true);
  }

  function handleEdit(task) {
    setEditingTask(task);
    setShowAddModal(true);
  }

  async function handleDelete(task) {
    if (!window.confirm('Delete this task?')) return;
    try {
      await tasksApi.delete(task.id);
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setShowDetailModal(false);
    } catch (e) {
      alert(e.message);
    }
  }

  async function handleComplete(task) {
    try {
      const res = await tasksApi.complete(task.id);
      const updatedTask = res.data;
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? updatedTask : t))
      );
      // Update selected task if viewing details
      if (selectedTaskId === task.id) {
        setSelectedTaskId(null);
        setShowDetailModal(false);
      }
    } catch (e) {
      alert(e.message);
    }
  }

  function handleModalSave(savedTask) {
    setTasks((prev) => {
      const existing = prev.find((t) => t.id === savedTask.id);
      if (existing) {
        return prev.map((t) => (t.id === savedTask.id ? savedTask : t));
      } else {
        return [savedTask, ...prev];
      }
    });
    setShowAddModal(false);
    setEditingTask(null);
  }

  async function handleTaskClick(task) {
    setSelectedTaskId(task.id);
    setShowDetailModal(true);
    // Optionally fetch fresh data to ensure all fields are loaded
    // but for now, use what's already in state
  }

  function handleDetailEdit(task) {
    setShowDetailModal(false);
    setEditingTask(task);
    setShowAddModal(true);
  }

  function handleDetailComplete(task) {
    handleComplete(task);
  }

  function handleDetailDelete(task) {
    handleDelete(task);
  }

  // Get selected task for detail modal
  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">My Tasks</h2>
          <p className="text-slate-400 mt-1">Manage your task queue</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600
                     hover:bg-indigo-500 text-white text-sm font-medium
                     transition-colors"
        >
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={loadTasks}
            className="px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500
                       focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterBy(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                filterBy === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 text-sm font-medium
                     focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-800 rounded-xl animate-pulse border border-slate-700" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="py-16 text-center bg-slate-800 rounded-xl border border-slate-700">
          <ListTodo size={44} className="mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium">
            {searchQuery ? 'No tasks match your search.' : 'No tasks yet.'}
          </p>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery ? 'Try a different search.' : 'Create your first task to get started.'}
          </p>
        </div>
      ) : (
        // Desktop table
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-slate-400 text-left">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium w-24">Priority</th>
                <th className="px-4 py-3 font-medium">Deadline</th>
                <th className="px-4 py-3 font-medium">Effort</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium w-20" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className="bg-slate-800/60 hover:bg-slate-700/60 transition-colors cursor-pointer"
                  onClick={() => handleTaskClick(task)}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100 truncate">{task.title}</p>
                    {task.description && (
                      <p className="text-slate-500 text-xs truncate max-w-xs mt-0.5">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{task.category}</td>
                  <td className="px-4 py-3">
                    <PriorityIndicator score={task.priority_score || 0} showLabel={false} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {task.deadline ? (
                      <span className={`font-medium ${deadlineBadgeClass(task.deadline)}`}>
                        {formatRelativeDeadline(task.deadline)?.label}
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm">{formatMinutes(task.estimated_minutes)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadgeClass(task.status)}`}>
                      {task.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(task)}
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

      {/* Mobile card view */}
      <div className="lg:hidden space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse border border-slate-700" />
          ))
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center bg-slate-800 rounded-xl border border-slate-700">
            <ListTodo size={36} className="mx-auto text-slate-600 mb-3" />
            <p className="text-slate-400 font-medium text-sm">
              {searchQuery ? 'No tasks match.' : 'No tasks yet.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl hover:bg-slate-700/60 transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-100 truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-slate-500 text-xs truncate mt-1">{task.description}</p>
                  )}
                </div>
                <PriorityIndicator score={task.priority_score || 0} showLabel={false} size="sm" />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span className="bg-slate-700 px-2 py-1 rounded">{task.category}</span>
                <span className={statusBadgeClass(task.status) + ' px-2 py-1 rounded-full'}>
                  {task.status?.replace('_', ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span>
                  {task.deadline ? formatRelativeDeadline(task.deadline)?.label : '—'}
                </span>
                <span className="text-slate-500">{formatMinutes(task.estimated_minutes)}</span>
              </div>

              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(task)}
                  className="flex-1 px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-medium rounded
                             hover:bg-slate-600 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(task)}
                  className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded
                             hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <AddTaskModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingTask(null);
        }}
        onSave={handleModalSave}
        editingTask={editingTask}
      />

      <TaskDetailModal
        task={selectedTask}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTaskId(null);
        }}
        onEdit={handleDetailEdit}
        onComplete={handleDetailComplete}
        onDelete={handleDetailDelete}
      />
    </div>
  );
}
