import { Router } from 'express';
import { healthRouter } from './routes/health';
import { authRouter } from './routes/auth';
import { pipelinesRouter } from './routes/pipelines';
import { buildsRouter } from './routes/builds';
import { tasksRouter } from './routes/tasks';
import { artifactsRouter } from './routes/artifacts';
import { workersRouter } from './routes/workers';
import { pluginsRouter } from './routes/plugins';
import { projectsRouter } from './routes/projects';
import { metricsRouter } from './routes/metrics';

export const restRouter = Router();

// Health check (no auth required)
restRouter.use('/health', healthRouter);

// Authentication routes
restRouter.use('/auth', authRouter);

// Protected routes
restRouter.use('/projects', projectsRouter);
restRouter.use('/pipelines', pipelinesRouter);
restRouter.use('/builds', buildsRouter);
restRouter.use('/tasks', tasksRouter);
restRouter.use('/artifacts', artifactsRouter);
restRouter.use('/workers', workersRouter);
restRouter.use('/plugins', pluginsRouter);
restRouter.use('/metrics', metricsRouter);

// Catch-all for undefined routes
restRouter.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: `API endpoint not found: ${req.method} ${req.baseUrl}${req.path}`,
      status: 404
    },
    timestamp: new Date().toISOString()
  });
});