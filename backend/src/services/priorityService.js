/**
 * Deterministic priority score calculation for LifeQueue tasks.
 *
 * Formula:
 *   priority_score = (impact × 10) + (urgency × 8) + (consequence_weight × 6) - (effort_penalty × 4)
 */

/**
 * Calculate urgency score (0-10) from a deadline string.
 * @param {string|null} deadline - ISO date string or null
 * @returns {number}
 */
function getUrgency(deadline) {
  if (!deadline) return 1;

  const now = new Date();
  const due = new Date(deadline);
  // Compare date-only (strip time component for day-level comparison)
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueMidnight - nowMidnight;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays <= 0) return 10;   // overdue
  if (diffDays <= 1) return 9;
  if (diffDays <= 3) return 8;
  if (diffDays <= 7) return 6;
  if (diffDays <= 14) return 4;
  if (diffDays <= 30) return 2;
  return 1;
}

/**
 * Calculate consequence weight (1-10) from free text.
 * @param {string|null} consequence
 * @returns {number}
 */
function getConsequenceWeight(consequence) {
  if (!consequence) return 3;

  const lower = consequence.toLowerCase();

  if (/critical|fail|fired|expelled/.test(lower)) return 10;
  if (/high|serious|major/.test(lower)) return 7;
  if (/medium|moderate/.test(lower)) return 4;
  if (/low|minor/.test(lower)) return 1;

  return 3; // default
}

/**
 * Calculate effort penalty (0-7) from estimated_minutes.
 * @param {number} estimatedMinutes
 * @returns {number}
 */
function getEffortPenalty(estimatedMinutes) {
  const mins = estimatedMinutes || 60;

  if (mins <= 15) return 0;
  if (mins <= 30) return 1;
  if (mins <= 60) return 2;
  if (mins <= 120) return 3;
  if (mins <= 240) return 5;
  return 7;
}

/**
 * Calculate the full priority score for a task.
 * @param {Object} task
 * @param {number} task.impact - 1-10
 * @param {string|null} task.deadline
 * @param {string|null} task.consequence
 * @param {number} task.estimated_minutes
 * @returns {number} - rounded to 2 decimal places
 */
function calculatePriorityScore(task) {
  const impact = task.impact || 5;
  const urgency = getUrgency(task.deadline);
  const consequenceWeight = getConsequenceWeight(task.consequence);
  const effortPenalty = getEffortPenalty(task.estimated_minutes);

  const score = (impact * 10) + (urgency * 8) + (consequenceWeight * 6) - (effortPenalty * 4);
  return Math.round(score * 100) / 100;
}

/**
 * Get a detailed breakdown of how the score was calculated.
 * @param {Object} task
 * @returns {{ impact_component, urgency_component, consequence_component, effort_penalty, total }}
 */
function getScoreBreakdown(task) {
  const impact = task.impact || 5;
  const urgency = getUrgency(task.deadline);
  const consequenceWeight = getConsequenceWeight(task.consequence);
  const effortPenalty = getEffortPenalty(task.estimated_minutes);

  const total = (impact * 10) + (urgency * 8) + (consequenceWeight * 6) - (effortPenalty * 4);

  return {
    impact_component: impact * 10,
    urgency_component: urgency * 8,
    consequence_component: consequenceWeight * 6,
    effort_penalty: effortPenalty * 4,
    total: Math.round(total * 100) / 100,
  };
}

module.exports = { calculatePriorityScore, getScoreBreakdown };
