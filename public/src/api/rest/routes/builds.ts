import { Router } from 'express';
import { z } from 'zod';
import { validateQuery, validateParams } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/error';
import { authMiddleware } from '../../middleware/auth';

export const buildsRouter = Router();

// Apply auth middleware
buildsRouter.use(authMiddleware);

// Validation schemas
const listBuildsSchema = z.object({
  pipelineId: z.string().uuid().optional(),
  status: z.enum(['pending', 'running', 'success', 'failed', 'cancelled']).optional(),
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('20').transform(Number),
  sort: z.enum(['buildNumber', 'created', 'duration']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc')
});

const buildIdSchema = z.object({
  id: z.string().uuid()
});

// List builds
buildsRouter.get('/',
  validateQuery(listBuildsSchema),
  asyncHandler(async (req, res) => {
    const { pipelineId, status, page, limit, _sort, _order } = req.query as any;

    // TODO: Fetch from database
    const mockBuilds = [
      {
        id: '650e8400-e29b-41d4-a716-446655440001',
        pipelineId: pipelineId || '550e8400-e29b-41d4-a716-446655440001',
        buildNumber: 42,
        status: status || 'success',
        duration: 180000, // 3 minutes
        trigger: {
          type: 'push',
          branch: 'main',
          commit: 'abc123',
          user: 'developer@example.com'
        },
        startTime: new Date(Date.now() - 180000).toISOString(),
        endTime: new Date().toISOString(),
        createdAt: new Date(Date.now() - 180000).toISOString()
      }
    ];

    res.json({
      data: mockBuilds,
      pagination: {
        page,
        limit,
        total: mockBuilds.length,
        totalPages: Math.ceil(mockBuilds.length / limit)
      }
    });
  })
);

// Get build by ID
buildsRouter.get('/:id',
  validateParams(buildIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Fetch from database
    const mockBuild = {
      id,
      pipelineId: '550e8400-e29b-41d4-a716-446655440001',
      buildNumber: 42,
      status: 'success',
      duration: 180000,
      trigger: {
        type: 'push',
        branch: 'main',
        commit: 'abc123',
        user: 'developer@example.com'
      },
      stages: [
        {
          stageId: 'stage-1',
          name: 'Build',
          status: 'success',
          duration: 60000,
          tasks: [
            {
              taskId: 'task-1',
              name: 'Compile',
              status: 'success',
              duration: 45000,
              exitCode: 0
            }
          ]
        },
        {
          stageId: 'stage-2',
          name: 'Test',
          status: 'success',
          duration: 120000,
          tasks: [
            {
              taskId: 'task-2',
              name: 'Unit Tests',
              status: 'success',
              duration: 80000,
              exitCode: 0
            },
            {
              taskId: 'task-3',
              name: 'Integration Tests',
              status: 'success',
              duration: 40000,
              exitCode: 0
            }
          ]
        }
      ],
      startTime: new Date(Date.now() - 180000).toISOString(),
      endTime: new Date().toISOString(),
      createdAt: new Date(Date.now() - 180000).toISOString()
    };

    res.json(mockBuild);
  })
);

// Get build logs
buildsRouter.get('/:id/logs',
  validateParams(buildIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { taskId, level, tail } = req.query;

    // TODO: Fetch from database
    const mockLogs = [
      {
        timestamp: new Date(Date.now() - 170000).toISOString(),
        level: 'info',
        source: 'task-1',
        message: 'Starting build process...'
      },
      {
        timestamp: new Date(Date.now() - 160000).toISOString(),
        level: 'info',
        source: 'task-1',
        message: 'Compiling TypeScript files...'
      },
      {
        timestamp: new Date(Date.now() - 150000).toISOString(),
        level: 'info',
        source: 'task-1',
        message: 'Build completed successfully'
      },
      {
        timestamp: new Date(Date.now() - 140000).toISOString(),
        level: 'info',
        source: 'task-2',
        message: 'Running unit tests...'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        source: 'task-2',
        message: 'All tests passed!'
      }
    ];

    // Filter logs if needed
    let filteredLogs = mockLogs;
    if (taskId) {
      filteredLogs = filteredLogs.filter(log => log.source === taskId);
    }
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    if (tail) {
      const tailCount = parseInt(tail as string) || 100;
      filteredLogs = filteredLogs.slice(-tailCount);
    }

    res.json({
      buildId: id,
      logs: filteredLogs,
      total: filteredLogs.length
    });
  })
);

// Cancel build
buildsRouter.post('/:id/cancel',
  validateParams(buildIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Cancel build in task engine
    const cancelledBuild = {
      id,
      status: 'cancelled',
      cancelledBy: (req as any).user?.email,
      cancelledAt: new Date().toISOString()
    };

    res.json(cancelledBuild);
  })
);

// Retry build
buildsRouter.post('/:id/retry',
  validateParams(buildIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Create new build with same parameters
    const newBuild = {
      id: `build-${Date.now()}`,
      originalBuildId: id,
      pipelineId: '550e8400-e29b-41d4-a716-446655440001',
      buildNumber: 43,
      status: 'pending',
      trigger: {
        type: 'retry',
        originalBuildId: id,
        user: (req as any).user?.email
      },
      createdAt: new Date().toISOString()
    };

    res.status(202).json(newBuild);
  })
);

// Get build artifacts
buildsRouter.get('/:id/artifacts',
  validateParams(buildIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Fetch from storage
    const mockArtifacts = [
      {
        id: 'artifact-1',
        buildId: id,
        name: 'build-output.zip',
        type: 'archive',
        size: 1048576, // 1MB
        checksum: 'sha256:abcdef123456',
        downloadUrl: `/api/v1/artifacts/artifact-1/download`,
        createdAt: new Date().toISOString()
      },
      {
        id: 'artifact-2',
        buildId: id,
        name: 'test-report.html',
        type: 'report',
        size: 524288, // 512KB
        checksum: 'sha256:fedcba654321',
        downloadUrl: `/api/v1/artifacts/artifact-2/download`,
        createdAt: new Date().toISOString()
      }
    ];

    res.json({
      buildId: id,
      artifacts: mockArtifacts,
      total: mockArtifacts.length
    });
  })
);