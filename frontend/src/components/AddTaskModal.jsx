import { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { tasksApi } from '../services/api';

const CATEGORIES = ['Academic', 'Work', 'Personal', 'Health', 'Finance', 'Other'];

const EFFORT_QUICK_PICKS = [
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
];

function getTierLabel(value) {
  if (value <= 3) return 'Low';
  if (value <= 6) return 'Medium';
  if (value <= 8) return 'High';
  return 'Critical';
}

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  editingTask,
}) {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Work');
  const [deadline, setDeadline] = useState('');
  const [effortMinutes, setEffortMinutes] = useState(60);
  const [impact, setImpact] = useState(5);
  const [consequence, setConsequence] = useState(5);
  const [dependencies, setDependencies] = useState([]);
  const [selectedDeps, setSelectedDeps] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [depsLoading, setDepsLoading] = useState(false);

  // Load available tasks for dependencies on mount
  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description || '');
      setCategory(editingTask.category);
      setDeadline(editingTask.deadline || '');
      setEffortMinutes(editingTask.estimated_minutes || 60);
      setImpact(editingTask.impact || 5);
      setConsequence(editingTask.consequence || 5);
      // Pre-select existing dependencies (by id)
      setSelectedDeps(editingTask.dependencies?.map((d) => d.id) || []);
    } else {
      resetForm();
    }
  }, [editingTask, isOpen]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setCategory('Work');
    setDeadline('');
    setEffortMinutes(60);
    setImpact(5);
    setConsequence(5);
    setSelectedDeps([]);
    setErrors({});
  }

  async function loadDependencies() {
    setDepsLoading(true);
    try {
      const res = await tasksApi.list();
      // Filter out archived and (when editing) the current task
      const available = (res.data || []).filter(
        (t) => t.status !== 'archived' && t.status !== 'done' && (!editingTask || t.id !== editingTask.id)
      );
      setDependencies(available);
    } catch (e) {
      console.error('Failed to load dependencies:', e);
    } finally {
      setDepsLoading(false);
    }
  }

  function validateForm() {
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!category) {
      newErrors.category = 'Category is required';
    }

    if (effortMinutes < 1 || effortMinutes > 480) {
      newErrors.effortMinutes = 'Effort must be between 1 and 480 minutes';
    }

    if (impact < 1 || impact > 10) {
      newErrors.impact = 'Impact must be between 1 and 10';
    }

    if (consequence < 1 || consequence > 10) {
      newErrors.consequence = 'Consequence must be between 1 and 10';
    }

    if (deadline && isNaN(new Date(deadline).getTime())) {
      newErrors.deadline = 'Invalid date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim(),
        category,
        deadline: deadline || null,
        estimated_minutes: effortMinutes,
        impact,
        consequence,
        dependencies: selectedDeps,
      };

      let savedTask;
      if (editingTask) {
        const res = await tasksApi.update(editingTask.id, body);
        savedTask = res.data;
      } else {
        const res = await tasksApi.create(body);
        savedTask = res.data;
      }

      onSave(savedTask);
      resetForm();
      onClose();
    } catch (e) {
      // Show error but keep form state so user can retry
      setErrors({ submit: e.message || 'Failed to save task' });
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800">
          <h2 className="text-xl font-bold text-slate-100">
            {editingTask ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-2">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              maxLength={100}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500
                         focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500
                         focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100
                         focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-400 text-xs mt-1">{errors.category}</p>}
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-slate-300 mb-2">
              Deadline
            </label>
            <input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100
                         focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {errors.deadline && <p className="text-red-400 text-xs mt-1">{errors.deadline}</p>}
          </div>

          {/* Estimated Effort */}
          <div>
            <label htmlFor="effort" className="block text-sm font-medium text-slate-300 mb-2">
              Estimated Effort (minutes) <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2 mb-3">
              {EFFORT_QUICK_PICKS.map((pick) => (
                <button
                  key={pick.minutes}
                  type="button"
                  onClick={() => setEffortMinutes(pick.minutes)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    effortMinutes === pick.minutes
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {pick.label}
                </button>
              ))}
            </div>
            <input
              id="effort"
              type="number"
              min="1"
              max="480"
              value={effortMinutes}
              onChange={(e) => setEffortMinutes(parseInt(e.target.value) || 60)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100
                         focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            {errors.effortMinutes && <p className="text-red-400 text-xs mt-1">{errors.effortMinutes}</p>}
          </div>

          {/* Impact */}
          <div>
            <label htmlFor="impact" className="block text-sm font-medium text-slate-300 mb-2">
              Impact <span className="text-red-400">*</span>
              <span className="text-slate-400 text-xs ml-2">
                {impact} — {getTierLabel(impact)}
              </span>
            </label>
            <input
              id="impact"
              type="range"
              min="1"
              max="10"
              value={impact}
              onChange={(e) => setImpact(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
            {errors.impact && <p className="text-red-400 text-xs mt-1">{errors.impact}</p>}
          </div>

          {/* Consequence */}
          <div>
            <label htmlFor="consequence" className="block text-sm font-medium text-slate-300 mb-2">
              Consequence <span className="text-red-400">*</span>
              <span className="text-slate-400 text-xs ml-2">
                {consequence} — {getTierLabel(consequence)}
              </span>
            </label>
            <input
              id="consequence"
              type="range"
              min="1"
              max="10"
              value={consequence}
              onChange={(e) => setConsequence(parseInt(e.target.value))}
              className="w-full accent-indigo-500"
            />
            {errors.consequence && <p className="text-red-400 text-xs mt-1">{errors.consequence}</p>}
          </div>

          {/* Dependencies */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Dependencies
            </label>
            {depsLoading ? (
              <p className="text-slate-500 text-sm">Loading tasks...</p>
            ) : dependencies.length === 0 ? (
              <p className="text-slate-500 text-sm">No available tasks to depend on.</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {dependencies.map((task) => (
                  <label key={task.id} className="flex items-center gap-3 p-2 hover:bg-slate-700/30 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDeps.includes(task.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDeps([...selectedDeps, task.id]);
                        } else {
                          setSelectedDeps(selectedDeps.filter((id) => id !== task.id));
                        }
                      }}
                      className="accent-indigo-500"
                    />
                    <span className="text-sm text-slate-300">{task.title}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 text-slate-100 font-medium
                         hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium
                         hover:bg-indigo-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader size={16} className="animate-spin" />}
              {editingTask ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
