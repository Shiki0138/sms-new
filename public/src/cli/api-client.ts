import axios, { AxiosInstance } from 'axios';
import WebSocket from 'ws';
import { CLIConfig } from './config';

export class ApiClient {
  private client: AxiosInstance;

  constructor(config: CLIConfig) {
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(config.token && { Authorization: `Bearer ${config.token}` })
      },
      timeout: 30000
    });

    // Add request interceptor for debugging
    if (config.verbose) {
      this.client.interceptors.request.use(request => {
        console.log(`[API] ${request.method?.toUpperCase()} ${request.url}`);
        return request;
      });
    }

    // Add response error handling
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          const message = error.response.data?.error?.message || error.message;
          throw new Error(`API Error: ${message}`);
        } else if (error.request) {
          throw new Error('No response from server. Is the API running?');
        } else {
          throw error;
        }
      }
    );
  }

  // Projects
  async listProjects(params?: any): Promise<any> {
    const response = await this.client.get('/api/v1/projects', { params });
    return response.data;
  }

  async getProject(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/projects/${id}`);
    return response.data;
  }

  async createProject(data: any): Promise<any> {
    const response = await this.client.post('/api/v1/projects', data);
    return response.data;
  }

  // Pipelines
  async listPipelines(params?: any): Promise<any> {
    const response = await this.client.get('/api/v1/pipelines', { params });
    return response.data;
  }

  async getPipeline(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/pipelines/${id}`);
    return response.data;
  }

  async createPipeline(data: any): Promise<any> {
    const response = await this.client.post('/api/v1/pipelines', data);
    return response.data;
  }

  async executePipeline(id: string, params?: any): Promise<any> {
    const response = await this.client.post(`/api/v1/pipelines/${id}/execute`, params);
    return response.data;
  }

  // Builds
  async listBuilds(params?: any): Promise<any> {
    const response = await this.client.get('/api/v1/builds', { params });
    return response.data;
  }

  async getBuild(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/builds/${id}`);
    return response.data;
  }

  async getBuildLogs(id: string, params?: any): Promise<any> {
    const response = await this.client.get(`/api/v1/builds/${id}/logs`, { params });
    return response.data;
  }

  async cancelBuild(id: string): Promise<any> {
    const response = await this.client.post(`/api/v1/builds/${id}/cancel`);
    return response.data;
  }

  // Tasks
  async listTasks(params?: any): Promise<any> {
    const response = await this.client.get('/api/v1/tasks', { params });
    return response.data;
  }

  async getTask(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/tasks/${id}`);
    return response.data;
  }

  async getTaskOutput(id: string, format = 'json'): Promise<any> {
    const response = await this.client.get(`/api/v1/tasks/${id}/output`, {
      params: { format }
    });
    return format === 'text' ? response.data : response.data;
  }

  // Workers
  async listWorkers(params?: any): Promise<any> {
    const response = await this.client.get('/api/v1/workers', { params });
    return response.data;
  }

  async getWorker(id: string): Promise<any> {
    const response = await this.client.get(`/api/v1/workers/${id}`);
    return response.data;
  }

  // System
  async getHealth(): Promise<any> {
    const response = await this.client.get('/health');
    return response.data;
  }

  async getMetrics(resource: string, params?: any): Promise<any> {
    const response = await this.client.get(`/api/v1/metrics/${resource}`, { params });
    return response.data;
  }

  // Auth
  async login(email: string, password: string): Promise<any> {
    const response = await this.client.post('/api/v1/auth/login', { email, password });
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<any> {
    const response = await this.client.post('/api/v1/auth/refresh', { refreshToken });
    return response.data;
  }

  // WebSocket connection for real-time updates
  connectWebSocket(token?: string): WebSocket {
    const wsUrl = this.client.defaults.baseURL!.replace(/^http/, 'ws');
    const url = `${wsUrl}/ws${token ? `?token=${token}` : ''}`;
    return new WebSocket(url);
  }
}