# My Tasks Implementation Review

Complete My Tasks experience for LifeQueue with full CRUD operations and priority breakdown visualization.

The implementation connects all three components (Tasks.jsx, AddTaskModal.jsx, TaskDetailModal.jsx) into a cohesive flow. Users can create, view, edit, and delete tasks; see real-time priority calculations; search and sort; and manage task status through optimistic updates. The UI integrates with the existing tasksApi service and uses verified endpoint contracts. Build passes and backend APIs verify with live data. All form inputs are validated before submission. The explanation array renders correctly as a bullet list. Priority scores display with visual bars showing all five components.

Watch for: Task filtering logic has an edge case where filtering for "all" hides done tasks, but selecting the "Completed" filter doesn't re-show them (they stay hidden). This diverges from typical task management UX where "Completed" filter should display only done tasks, not hide them. Secondary concern: field name mapping in TaskDetailModal assumes multiple possible field names from the API (e.g., `impact_score`, `effort_efficiency`, `effortEfficiency`), which works but masks inconsistency between backend shape and frontend assumptions.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The task list filters and displays incomplete tasks by default, excluding both archived and done statuses together. The "Completed" filter option exists in the UI but the filter logic treats "all" as "pending or in_progress," making the filter non-functional for viewing completed tasks. This is a correctness gap: the filter buttons should be exhaustive and mutually exclusive. The add/edit modal validates all required fields and submits to the correct endpoints with the correct HTTP methods (POST for create, PUT for update). Deadline input uses HTML5 `datetime-local` type, mapping to ISO strings. Impact and consequence use range sliders (1-10) which are convenient but the backend requires exact numeric values, so there's no validation gap. The priority detail modal displays the five score components with visual progress bars and renders the explanation as a bullet list, matching the design. Dependencies load into a checkbox list on modal open, though the implementation doesn't verify they actually persist on save. Task state updates happen optimistically before API responses, reducing perceived latency but creating a risk if the API rejects the change (the UI won't reflect the server's actual state until manual refresh).

---

<details>
<summary>Issues (3)</summary>

1. **Filter logic excludes "done" tasks unconditionally** — When "all" is selected, both "done" and "archived" are filtered out. Selecting "Completed" should show only done tasks, but the filter reads it as "if filterBy !== 'all'" which means the exclusion logic still applies. Move the done/archived exclusion outside the status filter so "Completed" displays done tasks.

2. **Field name uncertainty in TaskDetailModal** — The modal maps API response fields with fallback chains (e.g., `currentTask.impact_score || (currentTask.impact ? currentTask.impact * 10 : 0)`), suggesting the backend field names are unpredictable. Verify the actual response shape from `tasksApi.prioritized()` and use consistent field names to avoid silent correctness issues.

3. **No error boundary on optimistic updates** — When create/update/delete/complete operations fail after optimistic update, the UI state diverges from the server. The error is shown but state is not reverted. For a task list, this could leave deleted tasks visible or incomplete tasks marked as done when the operation actually failed. Consider showing a "Retry" button or reload on critical failures.

</details>

---

<details>
<summary>Details</summary>

## API Integration and HTTP Methods

Tasks.jsx uses `tasksApi` for all backend communication, with no raw fetch calls. The methods map correctly: `tasksApi.create()` uses POST, `tasksApi.update()` uses PUT, `tasksApi.complete()` uses POST /tasks/:id/complete, and `tasksApi.delete()` uses DELETE. The requests are constructed as JSON with appropriate bodies. Response shapes are assumed to match the documented contract (priority_score, urgency, effort_efficiency, dependency_impact, explanation array, status). No discrepancies detected in the implementation.

## Form Validation

AddTaskModal enforces validation before submission. Title must not be empty or whitespace-only (checked with `title.trim()`). Category is required (defaults to "Work" but must be selected). Impact and consequence use range inputs (1-10) so the range is enforced by the HTML input type itself, not custom validation. Estimated minutes must be 1-480 (validated with comparison operators). Deadline validation runs `isNaN(new Date(deadline).getTime())` which correctly rejects malformed dates. All errors are displayed inline per field after `validateForm()` runs. The form does not submit if validation fails.

## State Management and Local Updates

Tasks.jsx maintains `tasks` array and derives `filteredTasks` from it using `useMemo()`. Filtering logic:
- Filters by search query (title or description, case-insensitive)
- Filters by status: if `filterBy === 'all'`, applies `t.status !== 'archived' && t.status !== 'done'`; otherwise filters to exact status match
- Sorts by priority (default), deadline, or effort

The filtering creates an issue: when `filterBy === 'all'`, both done and archived are excluded. When `filterBy === 'done'`, the second branch applies, filtering to `t.status === 'done'`. So done tasks appear when explicitly filtering for them, but not under "all." The UI labels this "Completed" which suggests it should be available under "all," but the code logic is actually correct for a "pending + in_progress only" view. However, a typical task manager would show done tasks under "all" and have a separate filter to hide them. This divergence creates confusion: the filter option exists but doesn't match the visual state.

Create/edit/delete/complete operations update local state immediately (optimistic) before awaiting the API response. If the API succeeds, the local state already reflects the change. If the API fails, the error is caught and displayed, but state is not reverted—so the UI shows a stale view. For delete operations, `setTasks((prev) => prev.filter((t) => t.id !== task.id))` removes the task immediately, then if the delete fails, the task remains gone from the UI. This is a user experience gap: users see success before confirmation.

## Priority Breakdown Display

TaskDetailModal renders the five score components (urgency, impact, effort_efficiency, dependency_impact, consequence) with progress bars. Each bar is displayed as a `<div>` with width calculated from the score value. The explanation array is rendered as a bullet list with each item prefixed by a bullet glyph. The implementation correctly iterates over `currentTask.explanation` (assumed to be an array of strings) and renders each. If explanation is null or empty, a fallback message appears.

Field name mapping in TaskDetailModal uses fallback chains for each score:
- `urgency`: uses `currentTask.urgency`
- `impact`: uses `currentTask.impact_score` or falls back to `currentTask.impact * 10`
- `effort_efficiency`: uses `currentTask.effort_efficiency` or `currentTask.effortEfficiency`
- `dependency_impact`: uses `currentTask.dependency_impact` or `currentTask.dependencyImpact`
- `consequence`: uses `currentTask.consequence_score` or `currentTask.consequence * 10`

This pattern suggests uncertainty about the API response shape. The backend should return consistent field names; the frontend should not guess. This masks a potential integration issue: if the API returns fields differently than expected, the scores will be wrong or missing.

## Loading, Error, and Empty States

Tasks.jsx handles all three states:
- Loading: displays skeleton rows (animated pulse effect) while `loading` is true
- Empty: shows an icon, headline, and friendly message if `filteredTasks.length === 0`
- Error: displays an error banner at the top with the error message and a "Retry" button

Both desktop and mobile layouts implement the same state handling. The error banner is prominently placed and includes a retry action. No UI gets stuck or unresponsive on error.

## Responsive Layout

Desktop (≥1024px) displays a multi-column table with columns for title, category, priority, deadline, effort, status, and a delete button. Mobile (<1024px) displays task cards with the same information but in a stacked layout. Each card includes an edit button and delete button. The layout switches via Tailwind's `hidden lg:block` and `lg:hidden` utilities. No hardcoded breakpoints or media queries. The modals are centered on desktop and full-width on mobile with padding. The implementation is responsive and testable.

## Accessibility

All form inputs in AddTaskModal have associated `<label htmlFor>` elements. Buttons have visible text (no icon-only buttons without labels) or explicit `aria-label` attributes. The delete button in Tasks.jsx includes `aria-label={`Delete task ${task.title}`}`. Modals include close buttons. Focus management is not explicitly implemented (e.g., returning focus to the trigger button after modal closes), but the modal structure itself is not inaccessible—screen readers will announce the modal and can tab through controls. Color is never the only indicator of status (badges include text like "Pending", "Done", etc.). Input range sliders for impact/consequence lack descriptive labels beyond the visible text, but the label shows the current value (e.g., "5 — Medium") which provides feedback.

## Test Coverage

The implementation does not include unit tests. The plan mentions that existing backend tests verify API contracts, and the code was built successfully. Manual verification via smoke tests (documented in tasks-plan.md) confirmed API endpoints work. However, frontend component tests for Tasks.jsx, AddTaskModal, and TaskDetailModal are absent. Critical flows (create → view → edit → delete) would benefit from integration tests to catch regressions.

## Unrelated Bundled Changes

No extraneous changes detected. All modifications are scoped to the three components and use existing API service and formatter utilities.

## Dependencies Handling

AddTaskModal loads available tasks on modal open and displays them as a checkbox list. Selected dependencies are stored in `selectedDeps` (array of IDs) and submitted in the request body. However, when editing a task, dependencies are pre-selected using `editingTask.dependencies?.map((d) => d.id)`, which assumes dependencies are returned as an array of objects with `id` fields. This matches the expected API contract. Dependency creation and updates are sent with each task save, but there's no explicit success confirmation that the dependency relationship was persisted on the server. If the backend has separate endpoints for managing dependencies, the modal wouldn't be aware of failures.

## Edge Cases

**Concurrent edits:** If a task is edited externally while the modal is open, the local state in Tasks.jsx won't reflect the remote change. The next full page load would sync. Acceptable for MVP but not ideal for collaborative scenarios.

**Overdue deadlines:** The deadline input accepts any past date, which is appropriate (overdue tasks are valid). The `formatRelativeDeadline` utility returns "Overdue" for past deadlines, which displays correctly.

**Empty dependencies list:** When no tasks are available for dependencies, the modal shows "No available tasks to depend on." This is handled gracefully.

**Task status='done' and 'completed':** TaskDetailModal checks for both `isDone` and `isComplete` separately but the button label logic is unclear. The button shows "Reopen" when `isDone || isComplete`, which works but shouldn't both statuses exist—the backend should use a single canonical status value. This suggests the frontend is defensive about inconsistency in the API.

</details>

---

## File Map

<details>
<summary>Changed Files</summary>

- **Tasks.jsx** — Main task list page with filtering, sorting, search, and CRUD operations. Manages task state and modal lifecycle.
- **AddTaskModal.jsx** — Modal for creating and editing tasks. Includes form validation, deadline picker, impact/consequence sliders, and dependency selection.
- **TaskDetailModal.jsx** — Modal for viewing task details. Displays priority score breakdown with progress bars, explanation bullet list, task metadata, and action buttons.
- **api.js** — Used (no changes); all task endpoints already in place.
- **PriorityIndicator.jsx** — Used (no changes); reused to display priority scores in list and detail modal.
- **formatters.js** — Used (no changes); date, deadline, and status formatting utilities.

Full diff available via `git diff main`.

</details>
