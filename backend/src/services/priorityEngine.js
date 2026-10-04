/**
 * LifeQueue Priority Engine
 *
 * Calculates a 0–100 priority score for every incomplete task using five
 * weighted factors:
 *
 *   Urgency            35%  — how close is the deadline?
 *   Impact             25%  — how important is this task (1-10 user rating)?
 *   Effort Efficiency  15%  — high impact relative to time cost
 *   Dependency Impact  15%  — does completing this unblock other tasks?
 *   Consequence        10%  — what happens if it isn't done (1-10 user rating)?
 *
 * All five factors are normalised to 0–100 before weighting so the final
 * score is always in the 0–100 range.
 *
 * Entry point:
 *   calculatePriority(task, allTasks) → PriorityResult
 */

'use strict';

// ─── Weights (must sum to 1.0) ────────────────────────────────────────────────
const WEIGHTS = {
  urgency:          0.35,
  impact:           0.25,
  effortEfficiency: 0.15,
  dependencyImpact: 0.15,
  consequence:      0.10,
};

// ─── Urgency (0–100) ──────────────────────────────────────────────────────────
/**
 * Maps days-remaining to a 0–100 urgency score.
 * Uses a smooth exponential-like decay so tasks that are months away
 * don't all flatten to the same low value.
 *
 * Breakpoints (chosen to feel natural for a student/professional):
 *   overdue          → 100
 *   0 < days ≤ 1    → 95
 *   1 < days ≤ 2    → 88
 *   2 < days ≤ 3    → 80
 *   3 < days ≤ 7    → 65
 *   7 < days ≤ 14   → 45
 *   14 < days ≤ 30  → 25
 *   30 < days ≤ 60  → 12
 *   60 < days ≤ 90  → 6
 *   > 90 days        → 2
 *   no deadline      → 10  (slight nudge so tasks don't stagnate)
 */
function calcUrgency(deadline) {
  if (!deadline) return 10;

  const nowMs  = Date.now();
  const dueMs  = new Date(deadline).getTime();
  const days   = (dueMs - nowMs) / 86_400_000;   // fractional days

  if (days <= 0)   return 100;
  if (days <= 1)   return 95;
  if (days <= 2)   return 88;
  if (days <= 3)   return 80;
  if (days <= 7)   return 65;
  if (days <= 14)  return 45;
  if (days <= 30)  return 25;
  if (days <= 60)  return 12;
  if (days <= 90)  return 6;
  return 2;
}

// ─── Impact (0–100) ───────────────────────────────────────────────────────────
/**
 * Linearly maps the 1–10 user rating to 0–100.
 *   1  →  0
 *   5  →  44
 *   10 → 100
 */
function calcImpact(impact) {
  const clamped = Math.min(10, Math.max(1, Number(impact) || 5));
  return Math.round(((clamped - 1) / 9) * 100);
}

// ─── Consequence (0–100) ──────────────────────────────────────────────────────
/**
 * Accepts either:
 *   - a numeric 1-10 value stored directly in the DB, or
 *   - a free-text string (keyword matching for backward compatibility)
 * Maps to 0–100.
 */
function calcConsequence(consequence) {
  if (!consequence) return 20; // mild default

  // Numeric path
  const num = Number(consequence);
  if (!isNaN(num) && num >= 1 && num <= 10) {
    return Math.round(((num - 1) / 9) * 100);
  }

  // Free-text keyword path
  const lower = String(consequence).toLowerCase();
  if (/critical|catastrophic|fail|expelled|fired|emergency/.test(lower)) return 100;
  if (/serious|severe|major|high/.test(lower))                             return 75;
  if (/moderate|medium|significant/.test(lower))                           return 50;
  if (/minor|low|small|slight/.test(lower))                                return 20;
  return 30; // unrecognised text → moderate-low
}

// ─── Effort Efficiency (0–100) ────────────────────────────────────────────────
/**
 * Rewards tasks that deliver high impact for their time cost without simply
 * always preferring quick tasks.
 *
 * Formula:
 *   impactNorm  = calcImpact(impact)           → 0-100
 *   effortNorm  = estimatedMinutes clamped and
 *                 mapped to 0-100 (longer = higher "cost")
 *   efficiency  = impactNorm² / (impactNorm + effortNorm + 1)
 *
 * The squaring of impactNorm ensures a 10-min, low-impact task doesn't
 * beat a 30-min, high-impact one just because it's faster.
 * The result is then scaled to 0-100 based on the theoretical maximum.
 */
const MAX_EFFORT_MINUTES = 480; // 8 hours, anything beyond is full cost

function calcEffortEfficiency(impact, estimatedMinutes) {
  const impactNorm = calcImpact(impact);                          // 0-100
  const mins       = Math.max(1, Number(estimatedMinutes) || 60);
  const effortNorm = Math.min(100, (mins / MAX_EFFORT_MINUTES) * 100); // 0-100

  // Raw efficiency — numerator grows with impact², denominator grows with effort
  const raw = (impactNorm * impactNorm) / (impactNorm + effortNorm + 1);

  // Theoretical maximum: impactNorm=100, effortNorm→0
  //   max_raw = 100² / (100 + 0 + 1) ≈ 99.01
  const MAX_RAW = (100 * 100) / (100 + 0 + 1);

  return Math.round((raw / MAX_RAW) * 100);
}

// ─── Dependency Impact (0–100) ────────────────────────────────────────────────
/**
 * Answers: "How much are other tasks waiting on this one?"
 *
 * Algorithm:
 *   1. Find all incomplete tasks that directly depend on this task.
 *   2. Each blocker contributes its normalised impact score.
 *   3. We cap at 5 direct dependents for the formula (diminishing returns).
 *   4. Weighted sum is scaled to 0–100.
 *
 * Max raw value: 5 dependents × 100 impact each = 500
 * → divide by 5 to get 0-100.
 */
function calcDependencyImpact(taskId, allTasks) {
  if (!allTasks || allTasks.length === 0) return 0;

  const incompleteStatuses = new Set(['pending', 'in_progress']);

  // Tasks that have taskId in their dependency list and are still incomplete
  const directBlockees = allTasks.filter((t) =>
    incompleteStatuses.has(t.status) &&
    Array.isArray(t._depIds) &&
    t._depIds.includes(taskId)
  );

  if (directBlockees.length === 0) return 0;

  // Take the top-5 most impactful blockees
  const top5 = directBlockees
    .sort((a, b) => (b.impact || 5) - (a.impact || 5))
    .slice(0, 5);

  const rawSum = top5.reduce((sum, t) => sum + calcImpact(t.impact || 5), 0);
  // Scale: rawSum is at most 500 (5 tasks × 100), clamp to 100
  return Math.min(100, Math.round(rawSum));
}

// ─── Explanation builder ──────────────────────────────────────────────────────
/**
 * Generates a human-readable explanation array from the computed components.
 * All logic is deterministic — no randomness, no external calls.
 *
 * @param {object} components
 * @returns {string[]}
 */
function buildExplanation({ urgency, impact, effortEfficiency, dependencyImpact, consequence, deadline, blockerCount }) {
  const parts = [];

  // Urgency
  if (!deadline) {
    parts.push('No deadline set');
  } else {
    const nowMs = Date.now();
    const dueMs = new Date(deadline).getTime();
    const days  = (dueMs - nowMs) / 86_400_000;
    if (days <= 0)        parts.push('Overdue — needs immediate attention');
    else if (days <= 1)   parts.push('Due within 24 hours');
    else if (days <= 3)   parts.push('Deadline is very close');
    else if (days <= 7)   parts.push('Deadline is approaching');
    else if (days <= 14)  parts.push('Due within two weeks');
    else if (days <= 30)  parts.push('Due this month');
    else                  parts.push('Deadline is far away');
  }

  // Impact
  if (impact >= 90)       parts.push('Extremely high impact');
  else if (impact >= 70)  parts.push('High impact');
  else if (impact >= 45)  parts.push('Moderate impact');
  else if (impact >= 20)  parts.push('Low impact');
  else                    parts.push('Minimal impact');

  // Effort Efficiency
  if (effortEfficiency >= 80)       parts.push('Excellent impact-to-effort ratio');
  else if (effortEfficiency >= 60)  parts.push('Good impact-to-effort ratio');
  else if (effortEfficiency >= 40)  parts.push('Moderate effort required');
  else if (effortEfficiency >= 20)  parts.push('High effort for the return');
  else                              parts.push('Very high effort cost');

  // Dependency Impact
  if (blockerCount === 1)       parts.push('Blocks 1 other task');
  else if (blockerCount > 1)    parts.push(`Blocks ${blockerCount} other tasks`);

  // Consequence
  if (consequence >= 90)        parts.push('Skipping this has critical consequences');
  else if (consequence >= 70)   parts.push('Serious consequences if skipped');
  else if (consequence >= 45)   parts.push('Moderate consequences if skipped');
  // Low consequence: omit from explanation (not noteworthy)

  return parts;
}

// ─── Main entry point ─────────────────────────────────────────────────────────
/**
 * Calculate the full priority result for a single task.
 *
 * @param {object} task         - The task to score (must include at least: id, impact, deadline,
 *                                consequence, estimated_minutes, status)
 * @param {object[]} allTasks   - All tasks in the system, each optionally decorated with
 *                                _depIds: number[] (the ids this task depends on).
 *                                Pass [] if dependency context isn't available.
 *
 * @returns {{
 *   score: number,
 *   urgency: number,
 *   impact: number,
 *   effortEfficiency: number,
 *   dependencyImpact: number,
 *   consequence: number,
 *   explanation: string[]
 * }}
 */
function calculatePriority(task, allTasks = []) {
  const urgency          = calcUrgency(task.deadline);
  const impact           = calcImpact(task.impact);
  const effortEfficiency = calcEffortEfficiency(task.impact, task.estimated_minutes);
  const dependencyImpact = calcDependencyImpact(task.id, allTasks);
  const consequence      = calcConsequence(task.consequence);

  // Count how many incomplete tasks depend on this one (for explanation)
  const incompleteStatuses = new Set(['pending', 'in_progress']);
  const blockerCount = allTasks.filter(
    (t) => incompleteStatuses.has(t.status) &&
           Array.isArray(t._depIds) &&
           t._depIds.includes(task.id)
  ).length;

  const score = Math.round(
    (urgency          * WEIGHTS.urgency          +
     impact           * WEIGHTS.impact           +
     effortEfficiency * WEIGHTS.effortEfficiency +
     dependencyImpact * WEIGHTS.dependencyImpact +
     consequence      * WEIGHTS.consequence) * 100
  ) / 100;

  const explanation = buildExplanation({
    urgency,
    impact,
    effortEfficiency,
    dependencyImpact,
    consequence,
    deadline:     task.deadline,
    blockerCount,
  });

  return {
    score: Math.min(100, Math.max(0, score)),
    urgency,
    impact,
    effortEfficiency,
    dependencyImpact,
    consequence,
    explanation,
  };
}

// ─── Legacy shims ─────────────────────────────────────────────────────────────
// Backward-compatible wrappers so existing controller code that calls
// calculatePriorityScore(task) / getScoreBreakdown(task) continues to work
// until callers are updated to the new API.

/**
 * @deprecated Use calculatePriority(task, allTasks).score instead.
 */
function calculatePriorityScore(task) {
  return calculatePriority(task, []).score;
}

/**
 * @deprecated Use calculatePriority(task, allTasks) instead.
 */
function getScoreBreakdown(task) {
  const result = calculatePriority(task, []);
  return {
    impact_component:      Math.round(result.impact      * WEIGHTS.impact           * 100) / 100,
    urgency_component:     Math.round(result.urgency     * WEIGHTS.urgency          * 100) / 100,
    consequence_component: Math.round(result.consequence * WEIGHTS.consequence       * 100) / 100,
    effort_efficiency:     Math.round(result.effortEfficiency * WEIGHTS.effortEfficiency * 100) / 100,
    dependency_impact:     Math.round(result.dependencyImpact * WEIGHTS.dependencyImpact * 100) / 100,
    total: result.score,
  };
}

module.exports = {
  calculatePriority,
  calculatePriorityScore,
  getScoreBreakdown,
  // Export sub-functions for unit testing
  _calcUrgency:          calcUrgency,
  _calcImpact:           calcImpact,
  _calcConsequence:      calcConsequence,
  _calcEffortEfficiency: calcEffortEfficiency,
  _calcDependencyImpact: calcDependencyImpact,
  WEIGHTS,
};
