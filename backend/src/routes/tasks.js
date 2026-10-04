const express = require('express');
const router = express.Router();
const {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  getPrioritizedTasks,
} = require('../controllers/taskController');
const {
  listDependencies,
  addDependency,
  removeDependency,
} = require('../controllers/dependencyController');

// IMPORTANT: static routes BEFORE /:id
router.get('/prioritized', getPrioritizedTasks);
router.get('/dependencies', listDependencies);

router.get('/', listTasks);
router.post('/', createTask);
router.get('/:id', getTask);
router.put('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/:id/complete', completeTask);
router.post('/:id/dependencies', addDependency);
router.delete('/:id/dependencies/:dependencyId', removeDependency);

module.exports = router;
