const express = require('express');
const router = express.Router();
const { optimizeSession } = require('../controllers/optimizerController');

router.post('/', optimizeSession);

module.exports = router;
