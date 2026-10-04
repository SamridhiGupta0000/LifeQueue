# LifeQueue Dashboard Implementation Plan

## Exploration Summary

### Current State
- **Frontend:** React 19 + Vite + Tailwind v4 + React Router v7 + Lucide React
- **Backend:** Running at http://localhost:3001
- **Proxy:** ✓ Configured in vite.config.js (routes /api to http://localhost:3001)
- **API Base URL:** Uses `/api` via proxy (from api.js: `BASE_URL = '/api'`)

### Existing Components & Patterns
1. **api.js:** Basic CRUD for tasks; needs `prioritized()`, `complete()` methods added
2. **Dashboard.jsx:** Basic dashboard showing task counts; to be completely replaced
3. **StatCard.jsx:** Icon + stat display pattern; will be reused
4. **AppLayout.jsx:** Sidebar + main area layout already in place (bg-slate-900)
5. **Sidebar.jsx:** Navigation links already present (all required routes exist)
6. **TopNav.jsx:** Header with brand title and user menu
7. **Tasks.jsx:** Example page showing list pattern; uses formatters utility
8. **formatters.js:** Utility functions for dates, colors, badges (will need updates for new priority scoring)

### Design & Styling Notes
- Dark theme already established: `bg-slate-900` (main), `bg-slate-800` (cards), `bg-slate-700` (borders)
- Cards use: `bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl` pattern
- Interactive states: `hover:border-indigo-500/50 hover:bg-slate-700/60 transition-colors duration-250`
- Icons from Lucide React (18-22px standard sizes)
- Status colors: blue for in_progress, green for done, slate for pending
- Priority colors: red (high ≥30), orange (mid), yellow, green (low)

### API Requirements (Backend endpoints to expect)
- `GET /api/tasks/prioritized` → `{ data: [{ ...task, priority_breakdown: { urgency, impact, effortEfficiency, dependencyImpact, consequence, explanation: [...strings] } }] }`
- `POST /api/focus/start` → `{ task_id }` → `{ data: { success: bool } }`
- `GET /api/analytics` → `{ data: { total_tasks, completed_tasks, pending_tasks, in_progress_tasks, avg_priority_score, total_focus_time, tasks_by_category: [...], completion_rate } }`
- `POST /api/tasks/:id/complete` → marks task as completed (used by focus end)

### Tailwind v4 Notes
- Tailwind v4 via `@tailwindcss/vite` plugin (already configured)
- Utility classes available: bg-*, text-*, border-*, rounded-*, animate-pulse, backdrop-blur-*, grid-cols-*, etc.
- No breaking changes from v3 affecting this implementation

---

## Implementation Plan

### 1. Extend API Service with New Endpoints
   **What:** Add `prioritized()`, `complete()` methods to `tasksApi`; add `focusApi` and `analyticsApi` namespaces.
   
   **Files:** `src/services/api.js`
   
   **Changes:**
   - Add `tasksApi.prioritized()` → GET /tasks/prioritized
   - Add `tasksApi.complete(id)` → POST /tasks/:id/complete
   - Add `focusApi` object with `start(task_id)` → POST /focus/start
   - Add `analyticsApi` object with `get()` → GET /analytics
   
   **Verify:** Check api.js compiles and exports all methods without errors. No runtime test needed at this stage.

---

### 2. Update Utility Formatters for Priority Scoring
   **What:** Add helpers for deadline relative time, priority score color gradient, and priority breakdown explanation formatting.
   
   **Files:** `src/utils/formatters.js`
   
   **Changes:**
   - Add `formatRelativeDeadline(iso)` → returns "3 days left", "Due today", "Overdue", etc.
   - Add `deadlineBadgeClass(iso)` → returns Tailwind classes: red if overdue, orange if <3 days, yellow if <7 days, slate otherwise
   - Add `priorityScoreColor(score)` → returns Tailwind text color: red (0-33), yellow (34-66), green (67-100)
   - Add `formatDurationMinutes(minutes)` → returns "2h 30m", "45m", etc.
   
   **Verify:** Check formatters.js compiles without errors.

---

### 3. Create PriorityIndicator Component
   **What:** Reusable priority score display with color-coded visual bar and numerical badge.
   
   **Files:** `src/components/PriorityIndicator.jsx`
   
   **New component with:**
   - Circular badge (w-12 h-12) with large bold score number
   - Color coding: red (0-33), yellow (34-66), green (67-100)
   - Background: semi-transparent matching color
   - Optional micro bar below showing score percentage
   - Props: `score` (number 0-100), `size` (default 'md', options: 'sm' | 'md' | 'lg')
   
   **Verify:** Component renders without errors; test with scores 0, 50, 100.

---

### 4. Create TaskCard Component
   **What:** Reusable card for individual task in priority queue, showing rank, title, category, deadline, effort, priority, status.
   
   **Files:** `src/components/TaskCard.jsx`
   
   **New component with:**
   - Rank badge (#1, #2, etc.) in indigo in top-left
   - Task title (truncate to 1 line)
   - Category pill badge
   - Deadline badge (color-coded by date)
   - Estimated effort display ("45m", "2h 15m")
   - PriorityIndicator component integrated
   - Status indicator dot (blue/green/slate)
   - Flex layout, card styling: bg-slate-800/60 border border-slate-700 rounded-xl p-4
   - Hover effect: border-indigo-500/50
   - Props: `task` (object), `rank` (number), `onClick` (optional callback)
   
   **Verify:** Component renders without errors with sample task data.

---

### 5. Create Updated Dashboard Page
   **What:** Complete replacement of Dashboard.jsx with premium modern layout featuring header, summary cards, "What Should I Do Now?" section, and priority queue.
   
   **Files:** `src/pages/Dashboard.jsx`
   
   **State management:**
   - `prioritizedTasks` from GET /api/tasks/prioritized
   - `analytics` from GET /api/analytics
   - `loading` (boolean)
   - `error` (string | null)
   - `sortBy` ('recommended' | 'deadline' | 'priority' | 'effort')
   - `focusState` ({ loading: bool, success: bool, error: string | null })
   
   **Sections:**
   
   **Header Section:**
   - Dynamic greeting based on hour (5-11 "Good morning", 12-17 "Good afternoon", 17+ "Good evening") with emoji
   - Subheading: "Here's what deserves your attention today."
   - Add Task button (disabled with title="Coming soon")
   
   **Summary Cards (grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-4):**
   - Tasks Today: count of tasks with status 'pending' or 'in_progress' created in last 24h
   - High Priority: count of tasks with priority_score >= 70
   - Available Time: sum of estimated_minutes for pending+in_progress tasks, formatted as "2h 45m"
   - Productivity Score: average priority_score among completed tasks (or 0 if none)
   - Reuse StatCard component; show skeleton loaders while loading
   
   **What Should I Do Now? Section:**
   - Fetch from prioritizedTasks, take first task where status !== 'completed'
   - Large card with task title (text-2xl font-bold)
   - PriorityIndicator (lg size) prominently displayed
   - deadline (relative time) with color-coded badge
   - estimated_minutes formatted as "45 minutes" or "2 hours 15 minutes"
   - category badge
   - priority_breakdown.explanation as bulleted list
   - Start Focus button (POST /api/focus/start, shows inline success/error message)
   - View Task button (link to /tasks/:id, disabled placeholder for now)
   - Empty state: celebration emoji + message "All tasks complete! Take a break 🎉"
   
   **Your Priority Queue Section:**
   - Show top 8 incomplete tasks from prioritizedTasks
   - Sorting buttons (pill style, toggle active state with indigo bg): Recommended, Deadline, Priority, Effort
   - Sort logic (client-side):
     - Recommended: priority_score DESC
     - Deadline: deadline ASC (nulls last)
     - Priority: priority_score DESC
     - Effort: estimated_minutes ASC
   - Use TaskCard component for each task with rank prop
   - Empty state: icon + "No tasks yet. Add one to get started."
   
   **Loading & Error:**
   - Skeleton grid while loading (same structure as final layout)
   - Error banner at top with retry button
   
   **Responsive:** Mobile (1 col), tablet (2 cols), desktop (4 cols) for summary cards
   
   **Verify:** Dashboard loads without errors; summary cards display; Can click sorting buttons (no API calls needed, client-side only); Start Focus button shows success/error message inline.

---

### 6. Test Integration End-to-End
   **What:** Run the frontend dev server, verify all API calls work, check loading/error states, test responsiveness.
   
   **Files:** (no changes, testing only)
   
   **Steps:**
   - Start dev server: `npm run dev`
   - Open http://localhost:5173 in browser
   - Verify Dashboard loads (check network tab for /api/tasks/prioritized, /api/analytics)
   - Verify data displays correctly (tasks, summary cards, queue)
   - Test sorting buttons (should re-sort client-side instantly)
   - Test Start Focus button on top task (should call /api/focus/start)
   - Test responsiveness (resize browser, check mobile/tablet/desktop layouts)
   - Check for console errors
   - Verify no hardcoded task data remains
   
   **Verify:** All API calls succeed; no console errors; responsive layout works; Focus button functional.

---

## Implementation Order & Dependencies

1. **Step 1** (independent): Extend API service — no dependencies
2. **Step 2** (independent): Update formatters — no dependencies
3. **Step 3** (depends on Step 2): Create PriorityIndicator — uses updated formatters
4. **Step 4** (depends on Step 2, Step 3): Create TaskCard — uses formatters and PriorityIndicator
5. **Step 5** (depends on Step 1, Step 2, Step 3, Step 4): Create Dashboard — uses API, formatters, PriorityIndicator, TaskCard
6. **Step 6** (depends on all): Test integration — verify the complete flow

---

## Key Decisions

### API Error Handling
Use try/catch blocks; show error banner at top of page with "Retry" button. On retry, re-fetch all data.

### Priority Queue Sorting
Implemented client-side on fetched data for instant responsiveness. No new API calls needed for sorting.

### Focus Session Flow
Start Focus button calls `/api/focus/start { task_id }`. Display inline success message ("Focus started ✓") or error. No modal or page navigation.

### Task Status Values
Backend uses 'pending', 'in_progress', 'completed' (not 'done'). Update formatters if needed.

### Relative Deadline Display
"3 days left", "Due today", "Overdue by 2 days", etc. Use date-fns or manual date math.

### Summary Card Calculations
- Tasks Today: tasks created in last 24h with status 'pending' or 'in_progress'
- High Priority: tasks with priority_score >= 70 (any status except completed)
- Available Time: sum of estimated_minutes for incomplete tasks
- Productivity Score: average priority_score among completed tasks only

---

## Files to Create
- `src/components/PriorityIndicator.jsx` (new)
- `src/components/TaskCard.jsx` (new)

## Files to Modify
- `src/services/api.js` (add 4 new methods)
- `src/utils/formatters.js` (add 4 new helpers)
- `src/pages/Dashboard.jsx` (complete rewrite)

## Files to NOT Modify
- `src/layouts/AppLayout.jsx` (already correct)
- `src/components/Sidebar.jsx` (already correct)
- `src/components/TopNav.jsx` (already correct)
- `src/components/StatCard.jsx` (reuse as-is)
- `vite.config.js` (proxy already configured)
- `src/App.jsx` (routes already correct)
