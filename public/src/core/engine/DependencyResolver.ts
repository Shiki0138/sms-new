import { Task } from '../types';

interface DependencyGraph {
  nodes: Map<string, Task>;
  edges: Map<string, Set<string>>;
  inDegree: Map<string, number>;
}

export class DependencyResolver {
  private graph: DependencyGraph;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      inDegree: new Map()
    };
  }

  resolve(tasks: Task[]): Task[][] {
    this.buildGraph(tasks);
    this.validateGraph();
    return this.topologicalSort();
  }

  private buildGraph(tasks: Task[]): void {
    // Reset graph
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      inDegree: new Map()
    };

    // Add all tasks as nodes
    for (const task of tasks) {
      this.graph.nodes.set(task.id, task);
      this.graph.edges.set(task.id, new Set());
      this.graph.inDegree.set(task.id, 0);
    }

    // Build edges based on dependencies
    for (const task of tasks) {
      for (const depId of task.dependencies) {
        if (!this.graph.nodes.has(depId)) {
          throw new Error(
            `Task ${task.id} depends on non-existent task ${depId}`
          );
        }

        const edges = this.graph.edges.get(depId);
        if (edges && !edges.has(task.id)) {
          edges.add(task.id);
          const currentDegree = this.graph.inDegree.get(task.id) || 0;
          this.graph.inDegree.set(task.id, currentDegree + 1);
        }
      }
    }
  }

  private validateGraph(): void {
    // Check for circular dependencies using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string): boolean => {
      visited.add(taskId);
      recursionStack.add(taskId);

      const edges = this.graph.edges.get(taskId) || new Set();
      for (const neighbor of edges) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of this.graph.nodes.keys()) {
      if (!visited.has(taskId)) {
        if (hasCycle(taskId)) {
          throw new Error('Circular dependency detected in task graph');
        }
      }
    }
  }

  private topologicalSort(): Task[][] {
    const stages: Task[][] = [];
    const inDegree = new Map(this.graph.inDegree);
    const queue: string[] = [];

    // Find all tasks with no dependencies
    for (const [taskId, degree] of inDegree) {
      if (degree === 0) {
        queue.push(taskId);
      }
    }

    while (queue.length > 0) {
      const stage: Task[] = [];
      const currentStageSize = queue.length;

      // Process all tasks at current level
      for (let i = 0; i < currentStageSize; i++) {
        const taskId = queue.shift()!;
        const task = this.graph.nodes.get(taskId);
        if (task) {
          stage.push(task);
        }

        // Update in-degree for dependent tasks
        const edges = this.graph.edges.get(taskId) || new Set();
        for (const neighbor of edges) {
          const currentDegree = inDegree.get(neighbor) || 0;
          inDegree.set(neighbor, currentDegree - 1);

          if (currentDegree - 1 === 0) {
            queue.push(neighbor);
          }
        }
      }

      if (stage.length > 0) {
        stages.push(stage);
      }
    }

    // Verify all tasks were processed
    const processedCount = stages.reduce((sum, stage) => sum + stage.length, 0);
    if (processedCount !== this.graph.nodes.size) {
      throw new Error('Failed to process all tasks - possible circular dependency');
    }

    return stages;
  }

  getDependents(taskId: string): string[] {
    return Array.from(this.graph.edges.get(taskId) || []);
  }

  getDependencies(taskId: string): string[] {
    const task = this.graph.nodes.get(taskId);
    return task ? task.dependencies : [];
  }

  getExecutionOrder(): string[] {
    const stages = this.topologicalSort();
    return stages.flat().map(task => task.id);
  }

  canExecute(taskId: string, completedTasks: Set<string>): boolean {
    const task = this.graph.nodes.get(taskId);
    if (!task) return false;

    return task.dependencies.every(depId => completedTasks.has(depId));
  }
}