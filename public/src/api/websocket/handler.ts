import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { Logger } from '../../core/utils/Logger';

const logger = new Logger('WebSocketHandler');

interface WebSocketClient extends WebSocket {
  id: string;
  userId?: string;
  isAlive: boolean;
  subscriptions: Set<string>;
}

const clients = new Map<string, WebSocketClient>();

export const websocketHandler = (ws: WebSocket, request: any): void => {
  const client = ws as WebSocketClient;
  client.id = `ws-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  client.isAlive = true;
  client.subscriptions = new Set();

  // Authenticate client
  const token = new URL(request.url, `http://${request.headers.host}`).searchParams.get('token');
  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret-change-me'
      ) as any;
      client.userId = decoded.id;
    } catch (error) {
      logger.warn('WebSocket authentication failed', { clientId: client.id });
    }
  }

  clients.set(client.id, client);
  logger.info('WebSocket client connected', { 
    clientId: client.id, 
    userId: client.userId,
    totalClients: clients.size 
  });

  // Send welcome message
  client.send(JSON.stringify({
    type: 'connection',
    data: {
      clientId: client.id,
      authenticated: !!client.userId,
      timestamp: new Date().toISOString()
    }
  }));

  // Handle messages
  client.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(client, data);
    } catch (error) {
      client.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  });

  // Handle pong for heartbeat
  client.on('pong', () => {
    client.isAlive = true;
  });

  // Handle close
  client.on('close', () => {
    clients.delete(client.id);
    logger.info('WebSocket client disconnected', { 
      clientId: client.id,
      totalClients: clients.size 
    });
  });

  // Handle errors
  client.on('error', (error) => {
    logger.error('WebSocket error', error, { clientId: client.id });
  });
};

function handleMessage(client: WebSocketClient, message: any): void {
  const { type, data } = message;

  switch (type) {
    case 'ping':
      client.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
      break;

    case 'subscribe':
      if (data.channel) {
        client.subscriptions.add(data.channel);
        client.send(JSON.stringify({
          type: 'subscribed',
          data: { channel: data.channel }
        }));
        logger.debug('Client subscribed to channel', { 
          clientId: client.id, 
          channel: data.channel 
        });
      }
      break;

    case 'unsubscribe':
      if (data.channel) {
        client.subscriptions.delete(data.channel);
        client.send(JSON.stringify({
          type: 'unsubscribed',
          data: { channel: data.channel }
        }));
      }
      break;

    default:
      client.send(JSON.stringify({
        type: 'error',
        data: { message: `Unknown message type: ${type}` }
      }));
  }
}

// Broadcast to all clients
export function broadcast(channel: string, data: any): void {
  const message = JSON.stringify({
    type: 'broadcast',
    channel,
    data,
    timestamp: new Date().toISOString()
  });

  let count = 0;
  clients.forEach(client => {
    if (client.subscriptions.has(channel) || client.subscriptions.has('*')) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        count++;
      }
    }
  });

  logger.debug('Broadcast sent', { channel, recipients: count });
}

// Send to specific user
export function sendToUser(userId: string, data: any): void {
  const message = JSON.stringify({
    type: 'direct',
    data,
    timestamp: new Date().toISOString()
  });

  clients.forEach(client => {
    if (client.userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Heartbeat to keep connections alive
setInterval(() => {
  clients.forEach((client, id) => {
    if (!client.isAlive) {
      clients.delete(id);
      return client.terminate();
    }

    client.isAlive = false;
    client.ping();
  });
}, 30000);

// Cleanup on process exit
process.on('SIGINT', () => {
  clients.forEach(client => {
    client.close(1000, 'Server shutting down');
  });
});