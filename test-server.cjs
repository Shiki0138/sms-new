const express = require('express');

const app = express();
const port = 3000;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Build system is running!',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Modern Build System',
    version: '1.0.0',
    endpoints: [
      '/health',
      '/api/v1/pipelines',
      '/api/v1/builds', 
      '/api/v1/tasks',
      '/api/v1/workers'
    ]
  });
});

// Mock pipelines endpoint
app.get('/api/v1/pipelines', (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        name: 'CI/CD Pipeline',
        status: 'idle',
        createdAt: new Date().toISOString()
      },
      {
        id: '2', 
        name: 'Build Pipeline',
        status: 'running',
        createdAt: new Date().toISOString()
      }
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 20
    }
  });
});

// Mock builds endpoint
app.get('/api/v1/builds', (req, res) => {
  res.json({
    data: [
      {
        id: '1',
        pipelineId: '1',
        buildNumber: 123,
        status: 'success',
        duration: 180000,
        createdAt: new Date().toISOString()
      },
      {
        id: '2',
        pipelineId: '1', 
        buildNumber: 124,
        status: 'running',
        createdAt: new Date().toISOString()
      }
    ],
    pagination: {
      total: 2,
      page: 1,
      limit: 20
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    statusCode: 404
  });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    statusCode: err.status || 500
  });
});

app.listen(port, () => {
  console.log(`✅ Build system test server running at http://localhost:${port}`);
  console.log(`🚀 Try accessing:`);
  console.log(`   - http://localhost:${port}/`);
  console.log(`   - http://localhost:${port}/health`);
  console.log(`   - http://localhost:${port}/api/v1/pipelines`);
  console.log(`   - http://localhost:${port}/api/v1/builds`);
});