/**
 * Shared formatting utilities.
 */

/**
 * Format an ISO date string to a human-readable short date.
 * e.g. "2024-12-31" → "Dec 31, 2024"
 */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns a Tailwind color class based on priority score.
 */
export function priorityColor(score) {
  if (score >= 30) return 'text-red-400';
  if (score >= 20) return 'text-orange-400';
  if (score >= 10) return 'text-yellow-400';
  return 'text-green-400';
}

/**
 * Returns a badge background class based on status.
 */
export function statusBadgeClass(status) {
  switch (status) {
    case 'in_progress': return 'bg-blue-500/20 text-blue-300';
    case 'completed':   return 'bg-green-500/20 text-green-300';
    case 'done':        return 'bg-green-500/20 text-green-300';
    default:            return 'bg-slate-500/20 text-slate-300';
  }
}

/**
 * Format duration in minutes to human-readable string.
 * e.g. 90 → "1h 30m", 45 → "45m"
 */
export function formatMinutes(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format deadline as relative time with color class.
 * Returns { label: string, color: string }
 */
export function formatRelativeDeadline(deadline) {
  if (!deadline) return null;
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate - now;
  const diffDays = Math.ceil(diffMs / 86400000);
  
  if (diffDays < 0) {
    return { label: 'Overdue', color: 'text-red-400' };
  }
  if (diffDays === 0) {
    return { label: 'Today', color: 'text-orange-400' };
  }
  if (diffDays === 1) {
    return { label: 'Tomorrow', color: 'text-yellow-400' };
  }
  if (diffDays <= 7) {
    return { label: `${diffDays} days`, color: 'text-yellow-400' };
  }
  return { label: `${diffDays} days`, color: 'text-slate-400' };
}

/**
 * Returns Tailwind badge classes for deadline urgency.
 */
export function deadlineBadgeClass(deadline) {
  if (!deadline) return 'bg-slate-700 text-slate-300';
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate - now;
  const diffDays = Math.ceil(diffMs / 86400000);
  
  if (diffDays < 0) {
    return 'bg-red-500/20 text-red-300 border border-red-500/30';
  }
  if (diffDays === 0) {
    return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
  }
  if (diffDays <= 3) {
    return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
  }
  if (diffDays <= 7) {
    return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
  }
  return 'bg-slate-700 text-slate-400';
}

/**
 * Returns Tailwind text color class based on priority score.
 */
export function priorityScoreColor(score) {
  if (score >= 67) return 'text-green-400';
  if (score >= 34) return 'text-yellow-400';
  return 'text-red-400';
}
