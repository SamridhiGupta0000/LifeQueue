const express = require('express');
const router = express.Router();
const { success } = require('../utils/response');

router.get('/', (_req, res) => {
  success(res, {
    status: 'ok',
    service: 'LifeQueue API',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
