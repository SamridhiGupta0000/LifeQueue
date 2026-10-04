require('dotenv').config();

const { getDb } = require('./database/db');
const { runMigrations } = require('./database/migrations');
const { calculatePriorityScore } = require('./services/priorityService');

/**
 * Returns a date string offset by `days` from today in YYYY-MM-DD format.
 */
function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function seed() {
  // 1. Ensure schema is up to date
  await runMigrations();

  const db = await getDb();

  // 2. Clear existing data in FK-safe order
  await db.run('DELETE FROM focus_sessions');
  await db.run('DELETE FROM dependencies');
  await db.run('DELETE FROM tasks');
  await db.run('DELETE FROM users');

  // 3. Insert user
  const userResult = await db.run(
    `INSERT INTO users (name, email) VALUES (?, ?)`,
    ['Alex Chen', 'alex@lifequeue.app']
  );
  const userId = userResult.lastID;

  // 4. Define tasks
  const taskDefs = [
    {
      title: 'CS Algorithm Final Exam',
      description: 'Study and prepare for the final CS algorithms exam',
      category: 'Academic',
      deadline: dateOffset(2),
      estimated_minutes: 240,
      impact: 10,
      consequence: 'critical: failing this exam means failing the course and academic probation',
      status: 'pending',
    },
    {
      title: 'Submit Research Paper Draft',
      description: 'Complete and submit the research paper draft to advisor',
      category: 'Academic',
      deadline: dateOffset(1),
      estimated_minutes: 180,
      impact: 9,
      consequence: 'high: serious grade impact and missing journal deadline',
      status: 'in_progress',
    },
    {
      title: 'Pay Overdue Rent',
      description: 'Pay the rent that is now overdue',
      category: 'Finance',
      deadline: dateOffset(-1),
      estimated_minutes: 15,
      impact: 8,
      consequence: 'critical: risk of eviction if not paid immediately',
      status: 'pending',
    },
    {
      title: 'Job Application — Google SWE Internship',
      description: 'Complete and submit Google software engineering internship application',
      category: 'Career',
      deadline: dateOffset(5),
      estimated_minutes: 120,
      impact: 9,
      consequence: 'major: missing this opportunity affects summer career prospects',
      status: 'pending',
    },
    {
      title: 'Weekly Grocery Shopping',
      description: 'Do the weekly grocery run',
      category: 'Personal',
      deadline: dateOffset(1),
      estimated_minutes: 60,
      impact: 6,
      consequence: 'moderate: running out of food affects study energy',
      status: 'pending',
    },
    {
      title: 'Database Systems Lab Report',
      description: 'Write up the database systems lab report',
      category: 'Academic',
      deadline: dateOffset(3),
      estimated_minutes: 90,
      impact: 7,
      consequence: 'high: lab worth 15% of grade',
      status: 'in_progress',
    },
    {
      title: 'Gym Workout Session',
      description: 'Go to the gym for the scheduled workout',
      category: 'Health',
      deadline: dateOffset(0),
      estimated_minutes: 60,
      impact: 5,
      consequence: 'low: minor wellness impact if skipped once',
      status: 'pending',
    },
    {
      title: 'Call Parents (Weekly Check-in)',
      description: 'Weekly phone call with parents',
      category: 'Social',
      deadline: dateOffset(2),
      estimated_minutes: 30,
      impact: 4,
      consequence: 'low: minor relationship maintenance',
      status: 'pending',
    },
    {
      title: 'Update Resume and LinkedIn',
      description: 'Update resume and LinkedIn profile with recent experience',
      category: 'Career',
      deadline: dateOffset(14),
      estimated_minutes: 90,
      impact: 7,
      consequence: 'medium: moderate impact on job search readiness',
      status: 'pending',
    },
    {
      title: 'Read Operating Systems Chapter 5',
      description: 'Read and take notes on OS chapter 5 for upcoming exam',
      category: 'Academic',
      deadline: dateOffset(7),
      estimated_minutes: 120,
      impact: 6,
      consequence: 'medium: moderate exam preparation impact',
      status: 'pending',
    },
    {
      title: 'Plan Study Schedule for Finals',
      description: 'Create a detailed study schedule for finals week',
      category: 'Academic',
      deadline: dateOffset(3),
      estimated_minutes: 45,
      impact: 8,
      consequence: 'high: poor planning leads to major exam failures',
      status: 'pending',
    },
    {
      title: 'Side Project: LifeQueue Frontend',
      description: 'Build the React frontend for the LifeQueue application',
      category: 'Career',
      deadline: dateOffset(30),
      estimated_minutes: 300,
      impact: 7,
      consequence: 'medium: portfolio project, moderate career impact',
      status: 'done',
    },
  ];

  // 5. Insert tasks and collect IDs
  const insertedIds = [];
  for (const t of taskDefs) {
    const priority_score = calculatePriorityScore(t);
    const completed_at = t.status === 'done' ? "datetime('now')" : null;

    const result = await db.run(
      `INSERT INTO tasks
         (user_id, title, description, category, deadline, estimated_minutes, impact, consequence, status, priority_score, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${t.status === 'done' ? "datetime('now')" : '?'})`,
      t.status === 'done'
        ? [userId, t.title, t.description, t.category, t.deadline, t.estimated_minutes, t.impact, t.consequence, t.status, priority_score]
        : [userId, t.title, t.description, t.category, t.deadline, t.estimated_minutes, t.impact, t.consequence, t.status, priority_score, null]
    );
    insertedIds.push(result.lastID);
  }

  // Map task titles to IDs for dependency setup
  const titleToId = {};
  for (let i = 0; i < taskDefs.length; i++) {
    titleToId[taskDefs[i].title] = insertedIds[i];
  }

  // 6. Insert dependencies
  const deps = [
    ['CS Algorithm Final Exam', 'Plan Study Schedule for Finals'],
    ['CS Algorithm Final Exam', 'Read Operating Systems Chapter 5'],
    ['Job Application — Google SWE Internship', 'Update Resume and LinkedIn'],
  ];

  for (const [taskTitle, depTitle] of deps) {
    await db.run(
      'INSERT INTO dependencies (task_id, depends_on_task_id) VALUES (?, ?)',
      [titleToId[taskTitle], titleToId[depTitle]]
    );
  }

  // 7. Insert focus session for the completed 'Side Project: LifeQueue Frontend'
  const doneTaskId = titleToId['Side Project: LifeQueue Frontend'];
  await db.run(
    `INSERT INTO focus_sessions (task_id, start_time, end_time, duration, completed)
     VALUES (?, datetime('now','-2 hours'), datetime('now','-30 minutes'), 5400, 1)`,
    [doneTaskId]
  );

  // 8. Summary
  console.log('[Seed] Done! Seeded:');
  console.log(`  Users: 1`);
  console.log(`  Tasks: 12`);
  console.log(`  Dependencies: 3`);
  console.log(`  Focus sessions: 1`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
