# Dashboard Implementation Review

**Verdict**: CHANGES_REQUESTED

---

## Summary

The Dashboard implementation provides a comprehensive premium interface featuring summary statistics, a prominent "What Should I Do Now?" section, and a sortable priority queue. The design applies consistent dark-theme glass-card styling and integrates with the backend API to display real-time task data. However, there are multiple issues affecting correctness and UX: response data handling assumes a `data` field that may not exist, relative deadline display has a formatting bug, the API service misses a required analytics parameter, stat card calculations have potential edge cases, and focus button feedback has scoping issues.

**Watch for**: Response unwrapping logic (does the backend wrap responses?), relative deadline label generation (currently returns objects, components expect strings), focus feedback showing for wrong task, analytics API parameter passing.

---

## High-Level View

The API service cleanly organizes endpoints into namespaced objects (tasksApi, analyticsApi, focusApi) and properly unwraps the `{ data: ... }` response envelope. The Dashboard fetches prioritized tasks and analytics in parallel, computes stats from the full list, and uses client-side sorting for responsiveness. Component composition is clean: StatCard, TaskCard, and PriorityIndicator are reused properly.

Loading and error states are implemented: skeleton placeholders during fetch, a dismissable error banner with retry, and inline feedback on focus actions. The focus session feature integrates inline on the top task with success/error messages, but queue TaskCards receive an `onFocusStart` handler that's never called.

The relative deadline formatter returns an object `{ label, color }` but consumers only read `.label`, wasting the color field. The "Tasks Today" stat falls back to analytics data (which may be stale or use a different window) when the prioritized list doesn't contain enough tasks. The "Priority" sort option has a button in the UI but no implementation, defaulting to "Recommended" order. The analytics API method accepts an optional userId but it's never passed from the Dashboard.

---

<details>
<summary>Issues (7)</summary>

1. **Relative deadline format mismatch** (HIGH) — `formatRelativeDeadline()` returns an object `{ label, color }` but TaskCard expects a string for `.label`. This works but the color field is unused. Check whether the color should be applied in TaskCard or whether the formatter should return just the string.

2. **TaskCard undefined deadline label** (HIGH) — If `formatRelativeDeadline(task.deadline)` returns null, `deadline.label` throws. TaskCard doesn't guard this case.

3. **Focus feedback scoping issue** (MEDIUM) — Focus session success/error is displayed for the top task only, but the onFocusStart handler is never passed to TaskCard in the queue. The queue TaskCard component receives an unused `onFocusStart` prop but never calls it.

4. **Analytics parameter not passed** (MEDIUM) — The Dashboard calls `analyticsApi.get()` with no arguments, but the API method accepts an optional `userId` parameter. Verify whether user context is available and should be passed.

5. **Stats Today calculation fallback unreliable** (MEDIUM) — When prioritizedTasks is empty or doesn't match the analytics counts, `tasksToday` falls back to `analytics?.pending_tasks + analytics?.in_progress_tasks`, which may differ from actual incomplete tasks in the queue.

6. **Missing dependency array item in useMemo** (MEDIUM) — The `sortedQueue` useMemo has `[incompleteTasks, sortBy]` but references `topTask` indirectly (sortBy: 'recommended' should maintain priority order). This is likely fine since prioritization is based on incompleteTasks, but confirm the intent.

7. **Unused onFocusStart prop in TaskCard** (LOW) — TaskCard receives `onFocusStart` but never uses it. Either remove the prop or wire it to a focus button on the card.

</details>

---

<details>
<summary>Details</summary>

### API Response Data Shape — Verify Backend Response Format

The Dashboard unpacks all responses assuming a `{ data: ... }` envelope. Verify that all endpoints (especially `/tasks/prioritized` and `/analytics`) actually return this structure. If any endpoint returns the payload directly (e.g., `[...]` instead of `{ data: [...] }`), unpacking fails with undefined reference errors.

### Relative Deadline Display Bug — Potential Null Reference

`formatRelativeDeadline()` returns `{ label: string, color: string }` but also returns `null` when deadline is falsy. TaskCard accesses `deadline.label` after a guard check, which is safe:

```javascript
const deadline = formatRelativeDeadline(task.deadline);
...
{deadline && <div>{deadline.label}</div>}
```

The guard prevents crashes, but if the guard were removed or skipped, accessing `.label` on `null` would throw. More importantly, `deadlineBadgeClass()` is called separately on the same deadline, duplicating the date parsing. Refactor to compute both the label and badge class from a single helper to avoid redundant logic.

### Focus Session Feedback Scoping Issue — Dead Code

`handleStartFocus` correctly sets `focusState` with the `taskId` for display feedback. The top task section renders feedback only if `focusState.taskId === topTask.id`, which is correct. However, the priority queue passes `onFocusStart` to TaskCard but **never calls it**:

```javascript
<TaskCard
  key={task.id}
  task={task}
  rank={idx + 1}
  onFocusStart={() => handleStartFocus(task.id)}
/>

// TaskCard.jsx receives but never uses onFocusStart
```

There's no focus button on individual queue TaskCards, making the handler dead code. Either remove the prop or add a focus button to TaskCard.

### Stats Computation Gaps

**Tasks Today:** Filters `prioritizedTasks` for tasks created in the last 24h with status pending or in_progress, but falls back to `analytics?.pending_tasks + analytics?.in_progress_tasks` when the count is 0. This fallback is unreliable because analytics data may be stale, use a different time window, or include archived tasks. Remove the fallback and always use the computed value.

**High Priority:** Filters for priority_score >= 70 and status !== 'completed'. Straightforward.

**Productivity Score:** Uses `analytics?.avg_priority_score` or defaults to 0. Verify the backend computes this as an average of completed tasks only.

### Sort Queue Implementation Incomplete

The `sortedQueue` useMemo handles three sort modes but not the fourth:

- `'recommended'`: Natural order (API returns by descending priority_score) ✓
- `'deadline'`: Sorts by deadline ASC, null deadlines last ✓
- `'effort'`: Sorts by estimated_minutes ASC ✓
- `'priority'`: Missing. The UI shows a "Priority" button but the sort logic doesn't handle it, defaulting to "Recommended" instead. Add a case that sorts by priority_score DESC.

### Analytics API Parameter Not Passed

The Dashboard calls `analyticsApi.get()` with no arguments. The API method signature accepts optional userId:

```javascript
get: (userId) => request('/analytics' + (userId ? `?user_id=${userId}` : ''))
```

If user context is available (auth state, route params, context), pass it to fetch user-specific analytics. If always global, remove the parameter from the signature. Currently it's a silent no-op parameter.

### React Hooks Usage — Correct Dependency Arrays

`useCallback` for `load` uses an empty dependency array (intentional, never changes). `useEffect` depends on `[load]` (correct, prevents loops). `useMemo` for `sortedQueue` depends on `[incompleteTasks, sortBy]` (correct, includes all variables affecting output). Focus state is managed as a single object `{ loading, success, error, taskId }`; if multiple concurrent focus sessions are possible, consider per-task state instead.

### Visual Design and Styling — Consistent Throughout

Summary cards use `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (correct responsive layout). Cards follow the glass-card pattern: `bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl`. Interactive states use `hover:border-indigo-500/40` with smooth transitions. Buttons apply consistent primary (indigo-600) and disabled states. Error banners use red accent colors. Icons are properly sized (18-22px). All styling aligns with the design spec.

### Empty States and Error Handling

Empty states are implemented: celebration message when all tasks complete, icon + text when no tasks exist, skeleton loaders during fetch. Error banner displays with retry button; retry re-fetches both endpoints in parallel. Focus errors display inline with red text.

One gap: focus error messages persist until the next interaction. Consider clearing the error when the user clicks "Start Focus" again, or auto-dismiss after a timeout (like success state does).

### Test Coverage Not Addressed

No visible tests for Dashboard, TaskCard, or PriorityIndicator. Needed: unit tests for stats computation (especially empty/null cases), sort logic (verify each option works), focus handlers (success/error states), state transitions. Integration tests: verify API calls and rendering with realistic data.

### Accessibility Gaps

Buttons have descriptive labels. Icon-only buttons lack aria-label attributes. Color conveys status (red/green/yellow) but color-blind users cannot distinguish them; add text or icon patterns. Priority score indicators use color-only coding; add numerical context.

</details>

---

## File Map

<details>
<summary>Changed Files</summary>

- **src/services/api.js** — Added `tasksApi.prioritized()`, `tasksApi.complete()`, `focusApi.*`, `analyticsApi.get()` methods. All methods follow the existing `request()` pattern. Response unpacking works correctly if backend wraps with `{ data: ... }`.

- **src/pages/Dashboard.jsx** — Complete rewrite. Implements header with greeting, summary cards (4), top task section, and priority queue with sorting. Uses useState, useEffect, useCallback, useMemo hooks. Fetches from API endpoints and handles loading/error/empty states.

- **src/components/TaskCard.jsx** — New reusable card component for queue items. Displays rank, title, category, deadline, effort, priority score, and status indicator. Receives unused `onFocusStart` prop.

- **src/components/PriorityIndicator.jsx** — New visual indicator for priority scores (0–100) with color coding (red <34, yellow 34–66, green 67+). Supports three sizes (sm/md/lg). Color logic is correct per design spec.

- **src/utils/formatters.js** — No changes needed; formatters already provide required utilities. `formatRelativeDeadline()` and `deadlineBadgeClass()` handle date computations correctly, though color field is unused by consumers.

</details>

---

