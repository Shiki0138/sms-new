import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLInt, GraphQLBoolean, GraphQLEnumType } from 'graphql';
import { DateTimeResolver } from 'graphql-scalars';

// Enum Types
const TaskStatusEnum = new GraphQLEnumType({
  name: 'TaskStatus',
  values: {
    PENDING: { value: 'pending' },
    QUEUED: { value: 'queued' },
    RUNNING: { value: 'running' },
    SUCCESS: { value: 'success' },
    FAILED: { value: 'failed' },
    SKIPPED: { value: 'skipped' },
    CANCELLED: { value: 'cancelled' }
  }
});

const TaskTypeEnum = new GraphQLEnumType({
  name: 'TaskType',
  values: {
    BUILD: { value: 'build' },
    TEST: { value: 'test' },
    LINT: { value: 'lint' },
    DEPLOY: { value: 'deploy' },
    CUSTOM: { value: 'custom' }
  }
});

// Object Types
const TaskType = new GraphQLObjectType({
  name: 'Task',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    type: { type: new GraphQLNonNull(TaskTypeEnum) },
    status: { type: new GraphQLNonNull(TaskStatusEnum) },
    duration: { type: GraphQLInt },
    createdAt: { type: new GraphQLNonNull(DateTimeResolver) },
    updatedAt: { type: new GraphQLNonNull(DateTimeResolver) }
  })
});

const StageType = new GraphQLObjectType({
  name: 'Stage',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    tasks: { type: new GraphQLNonNull(new GraphQLList(TaskType)) },
    parallel: { type: GraphQLBoolean },
    continueOnError: { type: GraphQLBoolean }
  })
});

const PipelineType = new GraphQLObjectType({
  name: 'Pipeline',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    description: { type: GraphQLString },
    status: { type: new GraphQLNonNull(GraphQLString) },
    stages: { type: new GraphQLNonNull(new GraphQLList(StageType)) },
    createdAt: { type: new GraphQLNonNull(DateTimeResolver) },
    updatedAt: { type: new GraphQLNonNull(DateTimeResolver) }
  })
});

const BuildType = new GraphQLObjectType({
  name: 'Build',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLID) },
    pipelineId: { type: new GraphQLNonNull(GraphQLID) },
    buildNumber: { type: new GraphQLNonNull(GraphQLInt) },
    status: { type: new GraphQLNonNull(GraphQLString) },
    duration: { type: GraphQLInt },
    pipeline: {
      type: PipelineType,
      resolve: (parent) => {
        // TODO: Fetch pipeline by ID
        return {
          id: parent.pipelineId,
          name: 'Mock Pipeline',
          status: 'idle',
          stages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    },
    createdAt: { type: new GraphQLNonNull(DateTimeResolver) }
  })
});

// Root Query
const RootQuery = new GraphQLObjectType({
  name: 'Query',
  fields: {
    // Pipeline queries
    pipeline: {
      type: PipelineType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_parent, args) => {
        // TODO: Fetch from database
        return {
          id: args.id,
          name: 'Mock Pipeline',
          description: 'A mock pipeline for testing',
          status: 'idle',
          stages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    },
    pipelines: {
      type: new GraphQLList(PipelineType),
      args: {
        projectId: { type: GraphQLID },
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt }
      },
      resolve: (_parent, _args) => {
        // TODO: Fetch from database
        return [{
          id: '1',
          name: 'Mock Pipeline',
          description: 'A mock pipeline',
          status: 'idle',
          stages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }];
      }
    },

    // Build queries
    build: {
      type: BuildType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (_parent, args) => {
        // TODO: Fetch from database
        return {
          id: args.id,
          pipelineId: '1',
          buildNumber: 1,
          status: 'success',
          duration: 120,
          createdAt: new Date()
        };
      }
    },
    builds: {
      type: new GraphQLList(BuildType),
      args: {
        pipelineId: { type: GraphQLID },
        status: { type: GraphQLString },
        limit: { type: GraphQLInt },
        offset: { type: GraphQLInt }
      },
      resolve: (_parent, args) => {
        // TODO: Fetch from database
        return [{
          id: '1',
          pipelineId: args.pipelineId || '1',
          buildNumber: 1,
          status: 'success',
          duration: 120,
          createdAt: new Date()
        }];
      }
    }
  }
});

// Root Mutation
const RootMutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    // Pipeline mutations
    createPipeline: {
      type: PipelineType,
      args: {
        name: { type: new GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        projectId: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: (_parent, args) => {
        // TODO: Create in database
        return {
          id: Date.now().toString(),
          name: args.name,
          description: args.description,
          status: 'idle',
          stages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    },
    updatePipeline: {
      type: PipelineType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        description: { type: GraphQLString }
      },
      resolve: (_parent, args) => {
        // TODO: Update in database
        return {
          id: args.id,
          name: args.name || 'Updated Pipeline',
          description: args.description,
          status: 'idle',
          stages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
    },
    deletePipeline: {
      type: GraphQLBoolean,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: (_parent, _args) => {
        // TODO: Delete from database
        return true;
      }
    },

    // Build mutations
    executePipeline: {
      type: BuildType,
      args: {
        pipelineId: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: (_parent, args) => {
        // TODO: Start pipeline execution
        return {
          id: Date.now().toString(),
          pipelineId: args.pipelineId,
          buildNumber: 1,
          status: 'pending',
          createdAt: new Date()
        };
      }
    },
    cancelBuild: {
      type: BuildType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: (_parent, args) => {
        // TODO: Cancel build
        return {
          id: args.id,
          pipelineId: '1',
          buildNumber: 1,
          status: 'cancelled',
          createdAt: new Date()
        };
      }
    }
  }
});

// Root Subscription
const RootSubscription = new GraphQLObjectType({
  name: 'Subscription',
  fields: {
    buildProgress: {
      type: BuildType,
      args: {
        buildId: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: (payload) => payload,
      subscribe: () => {
        // TODO: Implement subscription logic
        throw new Error('Subscriptions not yet implemented');
      }
    }
  }
});

// Create and export schema
export const buildSchema = async (): Promise<GraphQLSchema> => {
  return new GraphQLSchema({
    query: RootQuery,
    mutation: RootMutation,
    subscription: RootSubscription
  });
};