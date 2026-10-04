'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const {
  calculatePriority,
  _calcUrgency,
  _calcImpact,
  _calcConsequence,
  _calcEffortEfficiency,
  _calcDependencyImpact,
  WEIGHTS,
} = require('../src/services/priorityEngine');

// Helper to create a task object
function makeTask(overrides = {}) {
  return {
    id: 1,
    title: 'Test Task',
    status: 'pending',
    impact: 5,
    estimated_minutes: 60,
    deadline: null,
    consequence: null,
    ...overrides,
  };
}

describe('Priority Engine', () => {
  describe('calcUrgency', () => {
    it('returns 100 for overdue deadline', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      assert.strictEqual(_calcUrgency(yesterday), 100);
    });

    it('returns 95 for deadline within 24 hours', () => {
      const tomorrow = new Date(Date.now() + 12 * 3600000).toISOString();
      assert.strictEqual(_calcUrgency(tomorrow), 95);
    });

    it('returns 65 for deadline within a week', () => {
      const nextWeek = new Date(Date.now() + 5 * 86400000).toISOString();
      assert.strictEqual(_calcUrgency(nextWeek), 65);
    });

    it('returns 2 for deadline more than 90 days away', () => {
      const farFuture = new Date(Date.now() + 120 * 86400000).toISOString();
      assert.strictEqual(_calcUrgency(farFuture), 2);
    });

    it('returns 10 when no deadline is set', () => {
      assert.strictEqual(_calcUrgency(null), 10);
    });
  });

  describe('calcImpact', () => {
    it('maps 1 to 0', () => assert.strictEqual(_calcImpact(1), 0));
    it('maps 5 to 44', () => assert.strictEqual(_calcImpact(5), 44));
    it('maps 10 to 100', () => assert.strictEqual(_calcImpact(10), 100));
    it('clamps values outside 1-10 (input 0 uses default, input 11 clamps to 10)', () => {
      // Input 0 is falsy, so defaults to 5 → 44
      assert.strictEqual(_calcImpact(0), 44);
      // Input 11 clamps to 10 → 100
      assert.strictEqual(_calcImpact(11), 100);
      // Input -5 is negative, clamps to 1 → 0
      assert.strictEqual(_calcImpact(-5), 0);
    });
    it('handles string input', () => assert.strictEqual(_calcImpact('7'), 67));
  });

  describe('calcConsequence', () => {
    it('maps numeric 1 to 0', () => assert.strictEqual(_calcConsequence('1'), 0));
    it('maps numeric 10 to 100', () => assert.strictEqual(_calcConsequence('10'), 100));
    it('recognizes critical keywords', () => {
      assert.strictEqual(_calcConsequence('critical'), 100);
      assert.strictEqual(_calcConsequence('catastrophic'), 100);
    });
    it('recognizes serious keywords', () => {
      assert.strictEqual(_calcConsequence('serious'), 75);
      assert.strictEqual(_calcConsequence('high'), 75);
    });
    it('recognizes moderate keywords', () => {
      assert.strictEqual(_calcConsequence('moderate'), 50);
      assert.strictEqual(_calcConsequence('medium'), 50);
    });
    it('recognizes minor keywords', () => {
      assert.strictEqual(_calcConsequence('minor'), 20);
      assert.strictEqual(_calcConsequence('low'), 20);
    });
    it('returns default 30 for unrecognised text', () => {
      assert.strictEqual(_calcConsequence('maybe'), 30);
    });
    it('returns 20 for null/undefined', () => assert.strictEqual(_calcConsequence(null), 20));
  });

  describe('calcEffortEfficiency', () => {
    it('high impact, short time = high efficiency', () => {
      const eff = _calcEffortEfficiency(10, 15);
      assert.ok(eff > 80, `expected > 80, got ${eff}`);
    });

    it('low impact, long time = low efficiency', () => {
      const eff = _calcEffortEfficiency(2, 240);
      assert.ok(eff < 30, `expected < 30, got ${eff}`);
    });

    it('same impact, different times: shorter beats longer', () => {
      const short = _calcEffortEfficiency(7, 30);
      const long = _calcEffortEfficiency(7, 120);
      assert.ok(short > long, `short (${short}) should beat long (${long})`);
    });

    it('same time, different impacts: higher impact beats lower', () => {
      const high = _calcEffortEfficiency(9, 60);
      const low = _calcEffortEfficiency(3, 60);
      assert.ok(high > low, `high (${high}) should beat low (${low})`);
    });
  });

  describe('calcDependencyImpact', () => {
    it('returns 0 when no allTasks provided', () => {
      assert.strictEqual(_calcDependencyImpact(1, null), 0);
      assert.strictEqual(_calcDependencyImpact(1, []), 0);
    });

    it('returns 0 when no tasks depend on this task', () => {
      const tasks = [makeTask({ id: 1 }), makeTask({ id: 2 })];
      assert.strictEqual(_calcDependencyImpact(1, tasks), 0);
    });

    it('returns 100 when 5 high-impact tasks depend on this', () => {
      const tasks = [
        makeTask({ id: 1, status: 'pending', _depIds: [] }),
        makeTask({ id: 2, status: 'pending', _depIds: [1], impact: 10 }),
        makeTask({ id: 3, status: 'pending', _depIds: [1], impact: 10 }),
        makeTask({ id: 4, status: 'pending', _depIds: [1], impact: 10 }),
        makeTask({ id: 5, status: 'pending', _depIds: [1], impact: 10 }),
        makeTask({ id: 6, status: 'pending', _depIds: [1], impact: 10 }),
      ];
      // All 5 have impact 10 (100), avg = 100
      assert.strictEqual(_calcDependencyImpact(1, tasks), 100);
    });

    it('ignores completed/archived dependents', () => {
      const tasks = [
        makeTask({ id: 1, status: 'pending', _depIds: [] }),
        makeTask({ id: 2, status: 'done', _depIds: [1], impact: 10 }),
        makeTask({ id: 3, status: 'pending', _depIds: [1], impact: 10 }),
      ];
      // Only 1 pending blocker with impact 10 → 100
      assert.strictEqual(_calcDependencyImpact(1, tasks), 100);
    });
  });

  describe('calculatePriority (full engine)', () => {
    it('returns score between 0 and 100', () => {
      const task = makeTask({ impact: 5, estimated_minutes: 60 });
      const result = calculatePriority(task, []);
      assert.ok(result.score >= 0 && result.score <= 100,
        `score ${result.score} out of range`);
    });

    it('includes all required fields', () => {
      const result = calculatePriority(makeTask(), []);
      assert.ok('score' in result);
      assert.ok('urgency' in result);
      assert.ok('impact' in result);
      assert.ok('effortEfficiency' in result);
      assert.ok('dependencyImpact' in result);
      assert.ok('consequence' in result);
      assert.ok(Array.isArray(result.explanation));
    });

    it('weights sum to 1.0', () => {
      const sum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
      assert.strictEqual(Math.round(sum * 100) / 100, 1.0);
    });

    it('overdue high-impact task scores near 100', () => {
      const overdue = new Date(Date.now() - 86400000).toISOString();
      const task = makeTask({
        impact: 10,
        estimated_minutes: 60,
        deadline: overdue,
        consequence: 'critical',
      });
      const result = calculatePriority(task, []);
      assert.ok(result.score >= 80, `expected >= 80, got ${result.score}`);
    });

    it('far-future low-impact task scores low', () => {
      const far = new Date(Date.now() + 180 * 86400000).toISOString();
      const task = makeTask({
        impact: 2,
        estimated_minutes: 240,
        deadline: far,
        consequence: 'minor',
      });
      const result = calculatePriority(task, []);
      assert.ok(result.score < 40, `expected < 40, got ${result.score}`);
    });

    it('task that blocks others gets dependency boost', () => {
      const tasks = [
        makeTask({ id: 1, status: 'pending', _depIds: [] }),
        makeTask({ id: 2, status: 'pending', _depIds: [1], impact: 9 }),
      ];
      const result = calculatePriority(tasks[0], tasks);
      assert.ok(result.dependencyImpact > 0, 'dependency impact should be > 0');
    });

    it('explanation reflects urgency level', () => {
      const overdue = new Date(Date.now() - 86400000).toISOString();
      const result = calculatePriority(makeTask({ deadline: overdue }), []);
      assert.ok(result.explanation.some(e => e.toLowerCase().includes('overdue')),
        `expected 'overdue' in explanation, got: ${result.explanation}`);
    });

    it('explanation includes impact level', () => {
      const result = calculatePriority(makeTask({ impact: 9 }), []);
      assert.ok(result.explanation.some(e => e.toLowerCase().includes('high')),
        `expected 'high impact' in explanation, got: ${result.explanation}`);
    });

    it('explanation mentions when it blocks other tasks', () => {
      const tasks = [
        makeTask({ id: 1, status: 'pending', _depIds: [] }),
        makeTask({ id: 2, status: 'pending', _depIds: [1], impact: 8 }),
        makeTask({ id: 3, status: 'pending', _depIds: [1], impact: 8 }),
      ];
      const result = calculatePriority(tasks[0], tasks);
      assert.ok(result.explanation.some(e => e.includes('Blocks')),
        `expected 'Blocks' in explanation, got: ${result.explanation}`);
    });
  });

  describe('realistic scenarios', () => {
    it('Scenario: Final exam in 2 days with high impact', () => {
      const in2Days = new Date(Date.now() + 2 * 86400000).toISOString();
      const task = makeTask({
        impact: 9,
        estimated_minutes: 180,
        deadline: in2Days,
        consequence: 'failing the course',
      });
      const result = calculatePriority(task, []);
      assert.ok(result.score >= 60, `expected >= 60, got ${result.score}`);
      assert.ok(result.urgency >= 80, `urgency should be high for 2-day deadline`);
    });

    it('Scenario: Quick 15-min task with moderate impact', () => {
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();
      const task = makeTask({
        impact: 5,
        estimated_minutes: 15,
        deadline: nextWeek,
      });
      const result = calculatePriority(task, []);
      // Efficiency is positive but not "high" for moderate impact
      assert.ok(result.effortEfficiency >= 35, 'efficiency should be decent for quick task');
    });

    it('Scenario: Task that unblocks 3 other important tasks', () => {
      const tasks = [
        makeTask({ id: 1, status: 'pending', _depIds: [] }),
        makeTask({ id: 2, status: 'pending', _depIds: [1], impact: 10 }),
        makeTask({ id: 3, status: 'in_progress', _depIds: [1], impact: 9 }),
        makeTask({ id: 4, status: 'pending', _depIds: [1], impact: 8 }),
      ];
      const result = calculatePriority(tasks[0], tasks);
      // 3 blockers: (100 + 89 + 78) = 267, capped at 100
      assert.strictEqual(result.dependencyImpact, 100);
    });

    it('Scenario: Overdue task with critical consequence', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString();
      const task = makeTask({
        impact: 10,
        estimated_minutes: 120,
        deadline: yesterday,
        consequence: 'critical',
      });
      const result = calculatePriority(task, []);
      // Score = urgency(100)*0.35 + impact(100)*0.25 + efficiency(80)*0.15 + consequence(100)*0.10 = 82
      assert.ok(result.score >= 80, `overdue + critical should score >= 80, got ${result.score}`);
      assert.strictEqual(result.urgency, 100);
      assert.strictEqual(result.consequence, 100);
    });

    it('Scenario: Task with no urgency, low impact, high effort', () => {
      const farFuture = new Date(Date.now() + 100 * 86400000).toISOString();
      const task = makeTask({
        impact: 2,
        estimated_minutes: 300,
        deadline: farFuture,
        consequence: 'minor',
      });
      const result = calculatePriority(task, []);
      assert.ok(result.score < 30, `should score low, got ${result.score}`);
      assert.ok(result.explanation.some(e => e.toLowerCase().includes('minimal impact') ||
                                           e.toLowerCase().includes('low impact')));
    });
  });
});