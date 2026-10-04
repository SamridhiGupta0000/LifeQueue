# LifeQueue

### Intelligent Task Prioritization & Decision Engine

LifeQueue is a full-stack task management and decision-support application that determines **what should be done next and why**.

Unlike conventional to-do applications that primarily organize tasks, LifeQueue analyzes task urgency, impact, effort, consequences, and dependencies to generate a **dynamic priority score** and an actionable task queue.

---

## Problem Statement

Managing multiple tasks with different deadlines, effort requirements, impacts, and dependencies makes it difficult to determine which task should be completed first.

Traditional to-do applications generally rely on manual ordering and simple deadline-based sorting. They do not adequately account for factors such as task impact, effort efficiency, consequences, or tasks that block other tasks.

LifeQueue addresses this problem by providing a deterministic decision engine that evaluates these factors and recommends the most valuable task to work on next.

---

## Key Features

### 1. Intelligent Task Prioritization

Each task receives a priority score from **0–100** based on:

- Urgency
- Impact
- Effort efficiency
- Dependency impact
- Consequence

The system also provides a human-readable explanation for the calculated priority.

Example:

> "Deadline is approaching, high impact, and blocks 2 other tasks."

---

### 2. Dashboard

The dashboard provides an overview of the user's current workload.

It includes:

- Tasks Today
- High Priority Tasks
- Available Time
- Productivity Score
- Recommended next task
- Priority Queue
- "I Have X Minutes" optimizer

---

### 3. Task Management

Users can:

- Create tasks
- Edit tasks
- Delete tasks
- Complete tasks
- Reopen completed tasks
- Search tasks
- Filter tasks
- View task details
- Add categories and tags
- Set deadlines
- Specify estimated effort
- Define impact and consequence
- Add dependencies

---

### 4. Focus Mode

Focus Mode provides a dedicated environment for completing a selected task.

Features include:

- Countdown timer
- Start / pause / resume
- Complete task
- Exit focus mode
- Focus session tracking
- Estimated duration
- Current task priority
- Reason for task recommendation

Only one focus session can be active at a time.

---

### 5. "I Have X Minutes" Optimizer

Users can enter the amount of time currently available.

LifeQueue determines the best combination of incomplete tasks that can be completed within that time.

The optimizer considers:

- Priority score
- Urgency
- Impact
- Effort
- Effort efficiency

It does not simply select the shortest tasks.

Example:

```text
Available Time: 90 minutes

Selected Tasks:
- Computer Networks Revision   30 min
- Machine Learning Assignment  35 min
- Presentation Preparation     20 min

Total: 85 minutes
```

The system also reports priority coverage and explains why the tasks were selected.

---

### 6. Dependency Management

Tasks can depend on other tasks.

LifeQueue identifies:

- Blocked tasks
- Tasks blocking other tasks
- Critical blockers
- Dependency relationships

The application also provides a visual dependency graph.

Invalid relationships such as self-dependencies, duplicate dependencies, and obvious circular dependencies are prevented.

---

### 7. Analytics

The analytics dashboard provides insights into productivity and task distribution.

It includes:

- Weekly task completion
- Task distribution by category
- Priority distribution
- Time allocation by category
- Seven-day productivity trend

Analytics are generated from actual database data.

---

## Priority Algorithm

LifeQueue uses a deterministic weighted scoring algorithm.

The overall priority score is calculated using:

```text
Priority Score =
    35% × Urgency
  + 25% × Impact
  + 15% × Effort Efficiency
  + 15% × Dependency Impact
  + 10% × Consequence
```

The final score is normalized to a range of:

```text
0 – 100
```

### Urgency

Urgency is calculated using the amount of time remaining before the deadline.

Overdue tasks receive maximum urgency.

### Impact

Impact represents the importance or value of completing a task.

The user specifies impact on a scale of:

```text
1 – 10
```

This is normalized to:

```text
0 – 100
```

### Effort Efficiency

Effort efficiency evaluates the value of completing a task relative to the time required.

The calculation is designed to avoid automatically ranking the shortest tasks highest.

### Dependency Impact

Dependency impact increases when completing a task can unblock other tasks.

A task blocking multiple important tasks can therefore receive a higher priority.

### Consequence

Consequence represents the negative effect of failing to complete the task.

It is specified on a scale of:

```text
1 – 10
```

---

## Technology Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Recharts

### Backend

- Node.js
- Express.js
- REST API

### Database

- SQLite

### Development

- JavaScript
- HTML
- CSS
- Git

No external AI API is required.

The decision engine is deterministic and locally calculated.

---

## System Architecture

```text
                    ┌─────────────────────┐
                    │      User           │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │                     │
                    │ Dashboard           │
                    │ My Tasks            │
                    │ Focus Mode          │
                    │ Dependencies        │
                    │ Analytics            │
                    │ Settings            │
                    └──────────┬──────────┘
                               │
                         REST API
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Express Backend   │
                    │                     │
                    │ Routes              │
                    │ Controllers         │
                    │ Services            │
                    │ Priority Engine     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      SQLite         │
                    │                     │
                    │ Users               │
                    │ Tasks               │
                    │ Dependencies        │
                    │ Focus Sessions      │
                    └─────────────────────┘
```

---

## Database Schema

### Users

```text
users
----------------
id
name
email
created_at
```

### Tasks

```text
tasks
----------------
id
user_id
title
description
category
deadline
estimated_minutes
impact
consequence
status
priority_score
created_at
completed_at
```

### Dependencies

```text
dependencies
----------------
id
task_id
depends_on_task_id
```

### Focus Sessions

```text
focus_sessions
----------------
id
task_id
start_time
end_time
duration
completed
```

---

## REST API

### Tasks

```text
GET    /api/tasks
POST   /api/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/complete
GET    /api/tasks/prioritized
```

### Dependencies

```text
GET    /api/tasks/dependencies
POST   /api/tasks/:id/dependencies
DELETE /api/tasks/:id/dependencies/:dependencyId
```

### Focus Mode

```text
POST /api/focus/start
POST /api/focus/end
```

### Analytics

```text
GET /api/analytics
```

### Session Optimizer

```text
POST /api/optimize-session
```

---

## Project Structure

```text
LifeQueue/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── types/
│   │
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── database/
│   │   └── utils/
│   │
│   └── package.json
│
├── README.md
└── package.json
```

---

## Application Pages

```text
Dashboard
│
├── Summary Cards
├── Recommended Task
├── Priority Queue
└── Time Optimizer

My Tasks
│
├── Task List
├── Search
├── Filters
└── Task Management

Focus Mode
│
├── Selected Task
├── Priority Information
├── Timer
└── Focus Session

Dependencies
│
├── Dependency List
├── Blocked Tasks
└── Dependency Graph

Analytics
│
├── Completion Statistics
├── Category Distribution
├── Priority Distribution
└── Productivity Trends

Settings
│
├── Profile
├── Preferences
├── Theme
├── Export
└── Clear Data
```

---

## UI Design

LifeQueue follows a modern SaaS dashboard design.

### Design principles

- Dark-first interface
- Deep navy / charcoal background
- Glass-like cards
- Subtle borders
- Rounded components
- Clean typography
- Minimal animations
- Responsive layouts

The interface is designed for:

- Desktop
- Tablet
- Mobile

---

## Installation

### Prerequisites

Make sure the following are installed:

```text
Node.js
npm
Git
```

### Clone the repository

```bash
git clone <repository-url>
cd LifeQueue
```

### Install dependencies

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies:

```bash
cd ../backend
npm install
```

### Start the backend

```bash
cd backend
npm run dev
```

### Start the frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The application can then be accessed through the URL provided by Vite.

---

## Environment Configuration

Create the required environment files according to the project configuration.

Example:

```text
backend/.env
```

Environment variables may include:

```text
PORT=5000
DATABASE_PATH=./database/lifequeue.db
```

Do not commit sensitive credentials or environment secrets to Git.

---

## Usage Flow

```text
Create Task
     │
     ▼
Enter Task Details
     │
     ▼
Calculate Priority
     │
     ▼
Analyze Dependencies
     │
     ▼
Generate Priority Score
     │
     ▼
Add to Priority Queue
     │
     ▼
Recommend Next Task
     │
     ▼
Start Focus Mode
     │
     ▼
Complete Task
     │
     ▼
Update Analytics
```

---

## Example Priority Explanation

A task may receive a high score because:

```text
Priority Score: 86

Reasons:
✓ Deadline is approaching
✓ High impact
✓ High consequence
✓ Blocks 2 other tasks
✓ Good impact-to-effort ratio
```

This makes the recommendation understandable rather than presenting only a numerical score.

---

## Error Handling

The application handles common edge cases including:

- Invalid task data
- Missing deadlines
- Invalid effort values
- Invalid impact/consequence values
- Self-dependencies
- Duplicate dependencies
- Circular dependencies
- No available tasks
- No tasks fitting the requested time
- All tasks already completed
- Invalid optimizer input
- Multiple focus sessions
- Timer refresh/persistence
- Empty analytics data

---

## Testing

Testing focuses on:

### Backend

- REST API endpoints
- Database operations
- Task validation
- Priority calculations
- Dependency validation
- Session optimization
- Focus session handling

### Frontend

- Task creation
- Task editing
- Task completion
- Priority queue
- Dependency management
- Focus Mode
- Session optimizer
- Analytics
- Responsive layouts

The application should be verified for:

```text
No console errors
No broken API calls
No stale state
No incorrect priority calculations
No duplicate dependencies
No invalid database records
```

---

## Design Goals

LifeQueue is designed around three primary goals:

### 1. Prioritize

Determine which task deserves attention first.

### 2. Explain

Show why the task was prioritized.

### 3. Optimize

Make the best use of limited available time.

---

## Future Improvements

Potential future enhancements include:

- Calendar integration
- Notification system
- Recurring tasks
- Advanced scheduling
- Personalized priority weights
- Multi-user collaboration
- Cloud database support
- Productivity pattern analysis
- Automatic deadline conflict detection
- Natural-language task creation

---

## Project Objective

The primary objective of LifeQueue is to transform a conventional task list into a **decision-support system** that helps users determine:

> **What should I do next, and why?**

Rather than simply storing tasks, LifeQueue analyzes task characteristics and relationships to produce an actionable and explainable priority queue.

---

## License

This project is developed for educational and academic purposes.
