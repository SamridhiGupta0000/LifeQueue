/**
 * Central API service for LifeQueue.
 * All backend communication goes through here.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }

  return data;
}

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => request('/health'),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasksApi = {
  list:       (filters)    => request('/tasks' + (filters ? '?' + new URLSearchParams(filters) : '')),
  prioritized: (filters)   => request('/tasks/prioritized' + (filters ? '?' + new URLSearchParams(filters) : '')),
  get:        (id)         => request(`/tasks/${id}`),
  create:     (body)       => request('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  update:     (id, body)   => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete:     (id)         => request(`/tasks/${id}`, { method: 'DELETE' }),
  complete:   (id)         => request(`/tasks/${id}/complete`, { method: 'POST' }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  get: (userId) => request('/analytics' + (userId ? `?user_id=${userId}` : '')),
};

// ── Focus Sessions ────────────────────────────────────────────────────────────
export const focusApi = {
  start: (taskId) => request('/focus/start', { method: 'POST', body: JSON.stringify({ task_id: taskId }) }),
  end:   (sessionId, completed) => request('/focus/end', { method: 'POST', body: JSON.stringify({ session_id: sessionId, completed }) }),
};
