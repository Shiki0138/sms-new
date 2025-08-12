import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';
import { asyncHandler } from '../../middleware/error';
import { authMiddleware, requireRole } from '../../middleware/auth';

export const pipelinesRouter = Router();

// Apply auth middleware
pipelinesRouter.use(authMiddleware);

// Validation schemas
const createPipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  projectId: z.string().uuid(),
  config: z.object({
    timeout: z.number().min(60).max(86400).default(3600),
    maxRetries: z.number().min(0).max(10).default(3),
    environment: z.record(z.string()).default({})
  }),
  stages: z.array(z.object({
    name: z.string(),
    parallel: z.boolean().default(false),
    continueOnError: z.boolean().default(false),
    tasks: z.array(z.object({
      name: z.string(),
      type: z.enum(['build', 'test', 'lint', 'deploy', 'custom']),
      config: z.record(z.any())
    }))
  }))
});

const listPipelinesSchema = z.object({
  projectId: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('20').transform(Number),
  sort: z.enum(['name', 'created', 'updated']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc')
});

const pipelineIdSchema = z.object({
  id: z.string().uuid()
});

// List pipelines
pipelinesRouter.get('/',
  validateQuery(listPipelinesSchema),
  asyncHandler(async (req, res) => {
    const { projectId, page, limit, _sort, _order } = req.query as any;

    // TODO: Fetch from database
    const mockPipelines = [
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        projectId: projectId || '550e8400-e29b-41d4-a716-446655440000',
        name: 'Main Build Pipeline',
        description: 'Primary CI/CD pipeline',
        status: 'idle',
        stages: 3,
        lastRun: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    res.json({
      data: mockPipelines,
      pagination: {
        page,
        limit,
        total: mockPipelines.length,
        totalPages: Math.ceil(mockPipelines.length / limit)
      }
    });
  })
);

// Get pipeline by ID
pipelinesRouter.get('/:id',
  validateParams(pipelineIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Fetch from database
    const mockPipeline = {
      id,
      projectId: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Main Build Pipeline',
      description: 'Primary CI/CD pipeline',
      status: 'idle',
      config: {
        timeout: 3600,
        maxRetries: 3,
        environment: {}
      },
      stages: [
        {
          id: 'stage-1',
          name: 'Build',
          parallel: false,
          continueOnError: false,
          tasks: [
            {
              id: 'task-1',
              name: 'Compile',
              type: 'build',
              config: { command: 'npm run build' }
            }
          ]
        }
      ],
      triggers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json(mockPipeline);
  })
);

// Create pipeline
pipelinesRouter.post('/',
  requireRole('admin', 'developer'),
  validateBody(createPipelineSchema),
  asyncHandler(async (req, res) => {
    const pipelineData = req.body;

    // TODO: Save to database
    const newPipeline = {
      id: `550e8400-e29b-41d4-a716-${Date.now()}`,
      ...pipelineData,
      status: 'idle',
      triggers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json(newPipeline);
  })
);

// Update pipeline
pipelinesRouter.put('/:id',
  requireRole('admin', 'developer'),
  validateParams(pipelineIdSchema),
  validateBody(createPipelineSchema.partial()),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // TODO: Update in database
    const updatedPipeline = {
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json(updatedPipeline);
  })
);

// Delete pipeline
pipelinesRouter.delete('/:id',
  requireRole('admin'),
  validateParams(pipelineIdSchema),
  asyncHandler(async (req, res) => {
    const { _id } = req.params;

    // TODO: Delete from database
    res.status(204).send();
  })
);

// Execute pipeline
pipelinesRouter.post('/:id/execute',
  validateParams(pipelineIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Start pipeline execution
    const build = {
      id: `build-${Date.now()}`,
      pipelineId: id,
      buildNumber: 1,
      status: 'pending',
      trigger: {
        type: 'manual',
        user: (req as any).user?.email
      },
      createdAt: new Date().toISOString()
    };

    res.status(202).json(build);
  })
);