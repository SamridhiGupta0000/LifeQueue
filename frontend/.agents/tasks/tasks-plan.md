# Implementation Plan: Complete My Tasks Experience

## Verification (2026-10-05)

**Build Status:** ✅ PASS
- Command: `cd e:\LifeQueue/frontend && npm run build`
- Result: Build completed in 685ms, no errors
- Output size: index-ChD5GeT4.js (311.64 kB gzipped 94.67 kB)

**Review Findings Addressed:** ✅ ALL FIXED
1. ✅ **Filter logic** — Fixed to properly show done tasks when 'Completed' filter is selected
   - Changed filter: `status !== 'archived'` always, then `status === filterBy` when not 'all'
   - Now 'Completed' button shows only done tasks as expected
2. ✅ **Field name consistency** — Updated TaskDetailModal to use correct API field names
   - Changed from fallback chains to direct snake_case: `effort_efficiency`, `dependency_impact`
   - Verified against backend API response (taskController.js lines 329-332)
3. ✅ **Error boundary on optimistic updates** — Added state rollback on API failure
   - handleDelete/handleComplete now revert local state if API fails
   - User gets clear error message and can retry
   - Form preserves user input on error in AddTaskModal

**API Field Names Verified:**
- Prioritized endpoint returns: urgency, impact, effort_efficiency (snake_case), dependency_impact (snake_case), consequence, explanation (array), rank
- No longer assumes field name variations; uses consistent snake_case per API spec

## Overview
Implement a polished My Tasks page with full CRUD functionality, including creation, editing, completion, and deletion of tasks. Connect directly to verified backend APIs. Include two modal components (AddTaskModal and TaskDetailModal) for task management and viewing priority score details.

---

## Design Decisions

### 1. Modal-based Architecture
Use two dedicated modal components (`AddTaskModal.jsx` and `TaskDetailModal.jsx`) instead of inline forms. This keeps the Tasks page clean, follows React patterns, and enables modal reuse.

### 2. Form Fields in AddTaskModal
Support only core fields from the API: title, description, category, deadline, estimated_minutes, impact, consequence. Dependencies are not editable in the create/edit modal—kept simple for MVP. Status is set automatically (defaults to 'pending' on create, preserved on edit).

### 3. Categories Enum
Implement as a hardcoded array in the modal: `['Academic', 'Work', 'Personal', 'Health', 'Finance', 'Other']`. Matches backend validation patterns.

### 4. Optimistic Updates
After create/edit/delete/complete operations, immediately update local state before API response. If the API call fails, show an error toast and revert the state.

### 5. Priority Score Display
The TaskDetailModal will display all priority score components (urgency, impact, effort_efficiency, dependency_impact, consequence) returned by the prioritized endpoint. The explanation is an array of strings; display each as a bullet point.

### 6. State Management
Use React hooks (useState/useEffect) within Tasks.jsx. No Redux or global state needed—single parent manages all tasks and modal open/close states.

### 7. Sorting & Filtering
Provide client-side sorting by Recommended (default: API order), Deadline, Priority, and Effort. Include a search filter by title or description (case-insensitive substring match).

### 8. Empty and Error States
- Empty state when no tasks exist (show icon + friendly message).
- Loading skeleton on initial load.
- Error banner with retry button on API failures.
- Per-task error badges on delete/complete failures.

### 9. Responsive Layout
Use CSS Grid for desktop (multi-column task list), switch to single column on mobile. Modals are full-width on mobile, centered on desktop.

### 10. Status Transitions
- Create task → status='pending' by default.
- Mark as done → status='done', show a "reopen" button.
- Delete (soft) → status='archived', hide from main list.
- Reopening sets status back to 'pending'.

---

## Implementation Steps

### Step 1: Create AddTaskModal component
- File: `e:\LifeQueue/frontend/src/components/AddTaskModal.jsx`
- Component signature: `AddTaskModal({ isOpen, onClose, onTaskAdded, editingTask, onTaskUpdated })`
- State: form fields (title, description, category, deadline, estimated_minutes, impact, consequence), loading, error
- On submit: call `tasksApi.create()` or `tasksApi.update()` based on `editingTask` prop
- Clear form and close modal on success
- Show validation errors (all fields except description are required)
- Deadline input: use HTML5 `<input type="datetime-local" />` for ISO format support
- Categories: dropdown with enum values
- Impact & Consequence: number inputs 1-10
- Estimated minutes: number input, default 60
- Verify: modal opens/closes correctly, form validation works, API calls are made with correct shape

### Step 2: Create TaskDetailModal component
- File: `e:\LifeQueue/frontend/src/components/TaskDetailModal.jsx`
- Component signature: `TaskDetailModal({ isOpen, onClose, taskId })`
- Fetch task data on open: call `tasksApi.get(taskId)` to get dependencies
- Fetch full priority breakdown: call `tasksApi.prioritized()` and find matching task (or embed in response)
- Display: task title, description, category, deadline, estimated_minutes, status
- Display all priority components: urgency, impact, effort_efficiency, dependency_impact, consequence (all 0-100 scores)
- Display explanation array as bullet-point list
- Show dependencies section if task has any
- Include action buttons: "Mark Done" (if pending/in_progress), "Reopen" (if done), "Edit Task", "Close"
- "Edit Task" button opens AddTaskModal with data prefilled
- "Mark Done" → call `tasksApi.complete(taskId)`
- "Reopen" → call `tasksApi.update(taskId, { status: 'pending' })`
- Verify: modal loads task data correctly, displays all priority components, explanation renders as list

### Step 3: Replace Tasks.jsx page component
- File: `e:\LifeQueue/frontend/src/pages/Tasks.jsx` (replace entirely)
- State variables:
  - `tasks`: array of all tasks from `tasksApi.list()` (includes status='archived')
  - `prioritizedTasks`: array from `tasksApi.prioritized()` (used for display)
  - `loading`, `error`: fetch state
  - `showAddModal`: boolean
  - `showDetailModal`, `selectedTaskId`: for opening detail modal
  - `editingTask`: for opening add modal in edit mode
  - `sortBy`: 'recommended' | 'deadline' | 'priority' | 'effort'
  - `searchQuery`: search filter string
- On mount: call `tasksApi.prioritized()` to load all incomplete tasks
- On create/update/delete/complete: refresh task list immediately (optimistic update)
- Filters: hide archived and done tasks from main list (show in separate section or filter out)
- Sort options: apply client-side on `prioritizedTasks` after filtering
- Search: filter by title or description (case-insensitive)
- Buttons:
  - "Add Task" → open AddTaskModal
  - Each task card: "View Details" → open TaskDetailModal, inline "Mark Done" button
  - Each task card: inline "Edit" button → open AddTaskModal with task data
  - Each task card: "Delete" button → call `tasksApi.delete()` and remove from list
- Display task rank (position in prioritized list)
- Show priority score badge (use PriorityIndicator component)
- Show deadline relative to now (use formatRelativeDeadline)
- Show estimated minutes (use formatMinutes)
- On API error: show error banner with retry button at top
- Verify: page loads, sorting/search work, add/edit/delete/complete operations update the list

### Step 4: Connect modals and handle state flow
- AddTaskModal calls `onTaskAdded(newTask)` after create succeeds
- AddTaskModal calls `onTaskUpdated(updatedTask)` after update succeeds
- Tasks.jsx listens to both callbacks and updates `prioritizedTasks` state
- TaskDetailModal passes `taskId` to callback handlers (mark done, reopen, delete)
- Close both modals on success
- Show toast/error message on failure (can be simple alert or inline error state)
- Verify: complete flow from add → view → edit → mark done → reopen works end-to-end

### Step 5: Polish and edge cases
- Deadline validation: past dates should be allowed (overdue tasks show warning/red color)
- Impact/consequence validation: enforce 1-10 range, show error if not
- Handle concurrent edits: if a task is edited externally, refresh the list on next load
- Empty task title validation: prevent submission of empty/whitespace-only titles
- Display loading skeleton while fetching task details in modal
- Handle task not found error (404) in modals gracefully
- Verify: all validation works, error states display correctly, UI is responsive

---

## Acceptance Criteria

- [ ] AddTaskModal component created and integrated
- [ ] TaskDetailModal component created and integrated
- [ ] Tasks.jsx fully implements CRUD operations (create, read, update, delete, complete)
- [ ] Tasks display sorted by priority, with sorting options (Recommended, Deadline, Priority, Effort)
- [ ] Search filter works on title and description (case-insensitive)
- [ ] Priority score details visible in TaskDetailModal (all 6 components + explanation)
- [ ] Dependencies display in TaskDetailModal (if any exist)
- [ ] Optimistic updates: UI reflects changes immediately (before API response)
- [ ] Error handling: API errors show user-friendly messages with retry option
- [ ] Empty state displays when no tasks exist
- [ ] Responsive design: layout works on desktop and mobile
- [ ] All modals validate required fields before submission
- [ ] Complete workflow works: create → view → edit → mark done → reopen → delete

---

## Verification Steps

After implementation, run these commands to verify:

1. **Start the development server:**
   ```bash
   cd e:\LifeQueue/frontend
   npm run dev
   ```

2. **Test Create Task:**
   - Click "Add Task" button
   - Fill in required fields (title, category, deadline, impact, consequence)
   - Submit
   - Verify task appears in list with correct priority score

3. **Test View Task Details:**
   - Click "View Details" on any task
   - Verify all priority components display (urgency, impact, effort_efficiency, dependency_impact, consequence)
   - Verify explanation array displays as bullet points

4. **Test Edit Task:**
   - Click "Edit" on a task
   - Modify fields
   - Submit
   - Verify task updates in list

5. **Test Sorting:**
   - Switch between sort options (Recommended, Deadline, Priority, Effort)
   - Verify tasks reorder correctly

6. **Test Search:**
   - Type in search field
   - Verify task list filters to matching tasks

7. **Test Mark Done:**
   - Click "Mark Done" on a task
   - Verify task status changes to 'done'
   - Verify "Reopen" button appears

8. **Test Reopen:**
   - Click "Reopen" on a done task
   - Verify task status changes back to 'pending'

9. **Test Delete:**
   - Click "Delete" on a task
   - Confirm deletion
   - Verify task is removed from list

10. **Test Error Handling:**
    - Stop backend server
    - Try to create a task
    - Verify error message displays with retry button
    - Restart backend
    - Click retry
    - Verify request succeeds

11. **Test Responsive Design:**
    - View on desktop (1920x1080)
    - View on mobile (375x667)
    - Verify layout adapts and is usable on both

---

## Files to Create/Modify

- **Create:** `e:\LifeQueue/frontend/src/components/AddTaskModal.jsx`
- **Create:** `e:\LifeQueue/frontend/src/components/TaskDetailModal.jsx`
- **Modify:** `e:\LifeQueue/frontend/src/pages/Tasks.jsx` (replace entirely)
- **Reuse (no changes):** `e:\LifeQueue/frontend/src/services/api.js`
- **Reuse (no changes):** `e:\LifeQueue/frontend/src/utils/formatters.js`
- **Reuse (no changes):** `e:\LifeQueue/frontend/src/components/PriorityIndicator.jsx`

---

## Implementation Notes

### API Shape Expected
- POST `/api/tasks` request: `{ title, description, category, deadline, estimated_minutes, impact, consequence }`
- GET `/api/tasks/prioritized` response: array of tasks with fields: `id, title, description, category, deadline, estimated_minutes, impact, consequence, status, priority_score, urgency, impact, effort_efficiency, dependency_impact, consequence, explanation (array), rank`
- GET `/api/tasks/:id` response: single task with dependencies array
- PUT `/api/tasks/:id` request: partial object with any updateable fields
- POST `/api/tasks/:id/complete`: marks task as done
- DELETE `/api/tasks/:id`: soft deletes (archives)

### Error Boundaries
- Network errors: show banner with retry
- Validation errors: show field-level error messages in modal
- 404 errors on task detail: show "Task not found" message
- Rate limiting (unlikely): show generic "Service busy" message

### Accessibility Considerations
- All form fields have labels associated with `<label htmlFor>`
- Modals have proper focus management (close button focused on open, focus returned on close)
- Error messages are announced to screen readers
- Color is not the only indicator (e.g., red badge + text for errors)

