import { Router } from 'express';
import { z } from 'zod';
import { validateQuery, validateParams } from '../../middleware/validation';
import { ApiError, asyncHandler } from '../../middleware/error';
import { authMiddleware } from '../../middleware/auth';

export const tasksRouter = Router();

// Apply auth middleware
tasksRouter.use(authMiddleware);

// Validation schemas
const listTasksSchema = z.object({
  buildId: z.string().uuid().optional(),
  status: z.enum(['pending', 'queued', 'running', 'success', 'failed', 'skipped', 'cancelled']).optional(),
  type: z.enum(['build', 'test', 'lint', 'deploy', 'custom']).optional(),
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('50').transform(Number)
});

const taskIdSchema = z.object({
  id: z.string().uuid()
});

// List tasks
tasksRouter.get('/',
  validateQuery(listTasksSchema),
  asyncHandler(async (req, res) => {
    const { buildId, status, type, page, limit } = req.query as any;

    // TODO: Fetch from database
    const mockTasks = [
      {
        id: 'task-001',
        buildId: buildId || 'build-001',
        name: 'Compile TypeScript',
        type: type || 'build',
        status: status || 'success',
        stage: 'Build',
        duration: 45000,
        exitCode: 0,
        workerId: 'worker-1',
        startTime: new Date(Date.now() - 50000).toISOString(),
        endTime: new Date(Date.now() - 5000).toISOString(),
        createdAt: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: 'task-002',
        buildId: buildId || 'build-001',
        name: 'Run Unit Tests',
        type: type || 'test',
        status: status || 'success',
        stage: 'Test',
        duration: 80000,
        exitCode: 0,
        workerId: 'worker-2',
        startTime: new Date(Date.now() - 90000).toISOString(),
        endTime: new Date(Date.now() - 10000).toISOString(),
        createdAt: new Date(Date.now() - 100000).toISOString()
      }
    ];

    res.json({
      data: mockTasks,
      pagination: {
        page,
        limit,
        total: mockTasks.length,
        totalPages: Math.ceil(mockTasks.length / limit)
      }
    });
  })
);

// Get task by ID
tasksRouter.get('/:id',
  validateParams(taskIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Fetch from database
    const mockTask = {
      id,
      buildId: 'build-001',
      name: 'Compile TypeScript',
      type: 'build',
      status: 'success',
      stage: 'Build',
      config: {
        command: 'npm run build',
        workingDir: '/app',
        env: {
          NODE_ENV: 'production'
        },
        timeout: 300000
      },
      result: {
        exitCode: 0,
        output: 'Successfully compiled 125 files\nBuild completed in 45s',
        duration: 45000,
        metrics: {
          filesCompiled: 125,
          warnings: 3,
          errors: 0
        }
      },
      attempts: 1,
      workerId: 'worker-1',
      startTime: new Date(Date.now() - 50000).toISOString(),
      endTime: new Date(Date.now() - 5000).toISOString(),
      createdAt: new Date(Date.now() - 60000).toISOString()
    };

    res.json(mockTask);
  })
);

// Get task output
tasksRouter.get('/:id/output',
  validateParams(taskIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'json' } = req.query;

    // TODO: Fetch from storage
    const output = `> npm run build

> modern-build-system@1.0.0 build
> tsc --build

[INFO] Starting TypeScript compilation...
[INFO] Reading tsconfig.json...
[INFO] Compiling 125 source files...
src/api/server.ts(15,5): warning TS6133: 'unusedVar' is declared but its value is never read.
src/core/engine/TaskEngine.ts(89,10): warning TS6133: 'debugInfo' is declared but its value is never read.
src/plugins/PluginManager.ts(45,7): warning TS6133: 'tempData' is declared but its value is never read.
[SUCCESS] Compilation completed with 3 warnings
[INFO] Writing output to dist/
[SUCCESS] Build completed successfully in 45.2s`;

    if (format === 'text') {
      res.type('text/plain').send(output);
    } else {
      res.json({
        taskId: id,
        output,
        exitCode: 0,
        duration: 45000
      });
    }
  })
);

// Cancel task
tasksRouter.post('/:id/cancel',
  validateParams(taskIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Cancel task in task engine
    const cancelledTask = {
      id,
      status: 'cancelled',
      cancelledBy: (req as any).user?.email,
      cancelledAt: new Date().toISOString()
    };

    res.json(cancelledTask);
  })
);

// Retry task
tasksRouter.post('/:id/retry',
  validateParams(taskIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Retry task in task engine
    const retriedTask = {
      id: `task-${Date.now()}`,
      originalTaskId: id,
      buildId: 'build-001',
      name: 'Compile TypeScript (Retry)',
      type: 'build',
      status: 'queued',
      attempts: 2,
      createdAt: new Date().toISOString()
    };

    res.status(202).json(retriedTask);
  })
);