const express = require('express');
const cors = require('cors');
const path = require('path');

const servicesRouter = require('./routes/services');
const integrationsRouter = require('./routes/integrations');
const testsRouter = require('./routes/tests');
const defectsRouter = require('./routes/defects');
const dashboardRouter = require('./routes/dashboard');
const simulatorRouter = require('./routes/simulator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'SIT Coordinator API is running'
  });
});

// Mount API routes
app.use('/api/services', servicesRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/tests', testsRouter);
app.use('/api/defects', defectsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/simulator', simulatorRouter);

// Fallback to index.html for unknown HTML navigations
app.get('*', (req, res, next) => {
  if (req.accepts('html') && !req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    next();
  }
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || 'An unexpected server error occurred.',
    status
  });
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` SIT Coordinator - System Integration Test Dashboard`);
    console.log(` Server running on http://localhost:${PORT}`);
    console.log(` Health check: http://localhost:${PORT}/api/health`);
    console.log(` Dashboard API: http://localhost:${PORT}/api/dashboard`);
    console.log(`====================================================`);
  });
}

module.exports = app;
