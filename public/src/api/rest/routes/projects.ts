import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery, validateParams } from '../../middleware/validation';
import { ApiError, asyncHandler } from '../../middleware/error';
import { authMiddleware, requireRole } from '../../middleware/auth';

export const projectsRouter = Router();

// Apply auth middleware
projectsRouter.use(authMiddleware);

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  config: z.object({
    repository: z.string().url().optional(),
    branch: z.string().default('main'),
    environment: z.record(z.string()).default({})
  }).optional()
});

const listProjectsSchema = z.object({
  page: z.string().regex(/^\d+$/).default('1').transform(Number),
  limit: z.string().regex(/^\d+$/).default('20').transform(Number),
  search: z.string().optional(),
  sort: z.enum(['name', 'created', 'updated']).default('created'),
  order: z.enum(['asc', 'desc']).default('desc')
});

const projectIdSchema = z.object({
  id: z.string().uuid()
});

// List projects
projectsRouter.get('/',
  validateQuery(listProjectsSchema),
  asyncHandler(async (req, res) => {
    const { page, limit, search, sort, order } = req.query as any;

    // TODO: Fetch from database
    const mockProjects = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Modern Build System',
        description: 'Cloud-native build automation platform',
        config: {
          repository: 'https://github.com/org/modern-build-system',
          branch: 'main'
        },
        pipelineCount: 5,
        lastBuild: {
          id: 'build-latest',
          status: 'success',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'SMS Service',
        description: 'Enterprise SMS delivery platform',
        config: {
          repository: 'https://github.com/org/sms-service',
          branch: 'develop'
        },
        pipelineCount: 3,
        lastBuild: {
          id: 'build-sms-latest',
          status: 'running',
          timestamp: new Date(Date.now() - 600000).toISOString()
        },
        createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 600000).toISOString()
      }
    ];

    // Apply search filter
    let filteredProjects = mockProjects;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProjects = mockProjects.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      data: filteredProjects,
      pagination: {
        page,
        limit,
        total: filteredProjects.length,
        totalPages: Math.ceil(filteredProjects.length / limit)
      }
    });
  })
);

// Get project by ID
projectsRouter.get('/:id',
  validateParams(projectIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Fetch from database
    const mockProject = {
      id,
      name: 'Modern Build System',
      description: 'Cloud-native build automation platform',
      config: {
        repository: 'https://github.com/org/modern-build-system',
        branch: 'main',
        environment: {
          NODE_ENV: 'production',
          CI: 'true'
        }
      },
      pipelines: [
        {
          id: 'pipeline-1',
          name: 'Main CI/CD',
          status: 'idle',
          lastRun: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'pipeline-2',
          name: 'Nightly Build',
          status: 'idle',
          lastRun: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      statistics: {
        totalBuilds: 142,
        successfulBuilds: 128,
        failedBuilds: 14,
        averageDuration: 180000,
        successRate: 0.901
      },
      team: [
        {
          id: 'user-1',
          email: 'admin@example.com',
          role: 'admin'
        },
        {
          id: 'user-2',
          email: 'developer@example.com',
          role: 'developer'
        }
      ],
      createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    };

    res.json(mockProject);
  })
);

// Create project
projectsRouter.post('/',
  requireRole('admin'),
  validateBody(createProjectSchema),
  asyncHandler(async (req, res) => {
    const projectData = req.body;

    // TODO: Save to database
    const newProject = {
      id: `550e8400-e29b-41d4-a716-${Date.now()}`,
      ...projectData,
      pipelineCount: 0,
      team: [{
        id: (req as any).user?.id,
        email: (req as any).user?.email,
        role: 'admin'
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.status(201).json(newProject);
  })
);

// Update project
projectsRouter.put('/:id',
  requireRole('admin'),
  validateParams(projectIdSchema),
  validateBody(createProjectSchema.partial()),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // TODO: Update in database
    const updatedProject = {
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    res.json(updatedProject);
  })
);

// Delete project
projectsRouter.delete('/:id',
  requireRole('admin'),
  validateParams(projectIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // TODO: Check if project has active pipelines/builds
    // TODO: Delete from database or mark as deleted

    res.status(204).send();
  })
);

// Get project statistics
projectsRouter.get('/:id/statistics',
  validateParams(projectIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { period = '7d' } = req.query;

    // TODO: Calculate from database
    const statistics = {
      projectId: id,
      period,
      builds: {
        total: 42,
        successful: 38,
        failed: 4,
        cancelled: 0,
        averageDuration: 180000
      },
      trends: [
        { date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0], builds: 6, successRate: 0.83 },
        { date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], builds: 5, successRate: 0.80 },
        { date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], builds: 7, successRate: 0.86 },
        { date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], builds: 6, successRate: 1.00 },
        { date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], builds: 8, successRate: 0.88 },
        { date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], builds: 5, successRate: 1.00 },
        { date: new Date().toISOString().split('T')[0], builds: 5, successRate: 0.80 }
      ],
      topFailures: [
        { name: 'Integration Tests', count: 3, lastOccurrence: new Date(Date.now() - 7200000).toISOString() },
        { name: 'Build TypeScript', count: 1, lastOccurrence: new Date(Date.now() - 86400000).toISOString() }
      ]
    };

    res.json(statistics);
  })
);