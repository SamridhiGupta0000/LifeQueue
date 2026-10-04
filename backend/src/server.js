require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { runMigrations } = require('./database/migrations');

const taskRoutes      = require('./routes/tasks');
const focusRoutes     = require('./routes/focus');
const analyticsRoutes = require('./routes/analytics');
const optimizerRoutes = require('./routes/optimizer');
const healthRoute     = require('./routes/health');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/health',          healthRoute);
app.use('/api/tasks',           taskRoutes);
app.use('/api/focus',           focusRoutes);
app.use('/api/analytics',       analyticsRoutes);
app.use('/api/optimize-session', optimizerRoutes);

app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error('[Error]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => console.log(`[Server] LifeQueue API running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

start();
