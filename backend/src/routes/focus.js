const express = require('express');
const router = express.Router();
const { startFocus, endFocus } = require('../controllers/focusController');

router.post('/start', startFocus);
router.post('/end', endFocus);

module.exports = router;
