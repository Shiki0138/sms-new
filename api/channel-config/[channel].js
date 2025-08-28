const jwt = require('jsonwebtoken');

// Simple auth middleware
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

// Mock channel configurations data (shared with main channel-config.js)
const mockChannelConfigs = {
  sms: {
    channel: 'sms',
    provider: 'twilio',
    connectionStatus: 'disconnected',
    config: {
      accountSid: '',
      authToken: '',
      phoneNumber: '',
      messagingServiceSid: ''
    },
    webhookUrl: `${process.env.BASE_URL || 'https://api.salon-lumiere.com'}/api/webhooks/sms`,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  email: {
    channel: 'email',
    provider: 'sendgrid',
    connectionStatus: 'disconnected',
    config: {
      apiKey: '',
      fromEmail: '',
      fromName: 'Salon Lumière',
      domain: ''
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  line: {
    channel: 'line',
    provider: 'line-api',
    connectionStatus: 'disconnected',
    config: {
      channelAccessToken: '',
      channelSecret: '',
      channelId: ''
    },
    webhookUrl: `${process.env.BASE_URL || 'https://api.salon-lumiere.com'}/api/webhooks/line`,
    webhookSecret: generateWebhookSecret(),
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  instagram: {
    channel: 'instagram',
    provider: 'instagram-api',
    connectionStatus: 'disconnected',
    config: {
      accessToken: '',
      businessAccountId: '',
      webhookSecret: ''
    },
    webhookUrl: `${process.env.BASE_URL || 'https://api.salon-lumiere.com'}/api/webhooks/instagram`,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }
};

// Generate a random webhook secret
function generateWebhookSecret() {
  return Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const user = verifyToken(req);

    // Get channel from query parameter
    const { channel } = req.query;

    if (!channel || !['sms', 'email', 'line', 'instagram'].includes(channel)) {
      res.status(404).json({ error: 'Invalid channel' });
      return;
    }

    // Handle channel configuration CRUD
    switch (req.method) {
      case 'GET':
        // Get specific channel configuration
        const config = mockChannelConfigs[channel];
        if (!config) {
          res.status(404).json({ error: 'Channel configuration not found' });
          return;
        }
        res.status(200).json(config);
        break;

      case 'POST':
      case 'PUT':
        // Update channel configuration
        const { provider, config: newConfig } = req.body;
        
        if (!newConfig) {
          res.status(400).json({ error: 'Configuration data is required' });
          return;
        }

        // Update the configuration
        mockChannelConfigs[channel] = {
          ...mockChannelConfigs[channel],
          provider: provider || mockChannelConfigs[channel].provider,
          config: {
            ...mockChannelConfigs[channel].config,
            ...newConfig
          },
          updatedAt: new Date().toISOString(),
          connectionStatus: 'disconnected' // Reset status when config changes
        };

        // Generate webhook secret if needed
        if (channel === 'line' && !mockChannelConfigs[channel].webhookSecret) {
          mockChannelConfigs[channel].webhookSecret = generateWebhookSecret();
        }

        res.status(200).json({
          message: 'Configuration updated successfully',
          config: mockChannelConfigs[channel]
        });
        break;

      case 'DELETE':
        // Reset channel configuration to defaults
        mockChannelConfigs[channel] = {
          ...mockChannelConfigs[channel],
          config: Object.keys(mockChannelConfigs[channel].config).reduce((acc, key) => {
            acc[key] = '';
            return acc;
          }, {}),
          connectionStatus: 'disconnected',
          updatedAt: new Date().toISOString()
        };
        
        res.status(200).json({
          message: 'Configuration reset successfully',
          config: mockChannelConfigs[channel]
        });
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Channel config API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Failed to process channel configuration request' });
  }
}