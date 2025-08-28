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

// Mock channel configurations data
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

// Test channel connection (mock implementation)
async function testChannelConnection(channel, config) {
  // Simulate connection test
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  switch (channel) {
    case 'sms':
      // Check if required fields are provided
      if (config.accountSid && config.authToken && config.phoneNumber) {
        // In a real implementation, we would test the Twilio connection
        return { success: true, message: 'SMS connection test successful' };
      }
      return { success: false, error: 'Missing required SMS configuration' };
    
    case 'email':
      if (config.apiKey && config.fromEmail) {
        // In a real implementation, we would test the SendGrid connection
        return { success: true, message: 'Email connection test successful' };
      }
      return { success: false, error: 'Missing required email configuration' };
    
    case 'line':
      if (config.channelAccessToken && config.channelSecret) {
        // In a real implementation, we would test the LINE connection
        return { success: true, message: 'LINE connection test successful' };
      }
      return { success: false, error: 'Missing required LINE configuration' };
    
    case 'instagram':
      if (config.accessToken && config.businessAccountId) {
        // In a real implementation, we would test the Instagram connection
        return { success: true, message: 'Instagram connection test successful' };
      }
      return { success: false, error: 'Missing required Instagram configuration' };
    
    default:
      return { success: false, error: 'Unknown channel type' };
  }
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

    // Parse the path
    const urlParts = req.url.split('/');
    const pathAfterConfig = urlParts.slice(3).join('/'); // After /api/channel-config/
    const channel = urlParts[3]; // The channel name (sms, email, line, instagram)
    const action = urlParts[4]; // The action (test, etc.)

    // Handle root channel-config endpoint
    if (!channel || channel === '' || req.url === '/api/channel-config') {
      switch (req.method) {
        case 'GET':
          // Return all channel configurations
          const configs = Object.values(mockChannelConfigs);
          res.status(200).json({ configs });
          break;
        
        default:
          res.status(405).json({ error: 'Method not allowed' });
      }
      return;
    }

    // Handle channel-specific endpoints
    if (channel && ['sms', 'email', 'line', 'instagram'].includes(channel)) {
      // Handle test endpoint
      if (action === 'test') {
        switch (req.method) {
          case 'POST':
            const currentConfig = mockChannelConfigs[channel];
            if (!currentConfig) {
              res.status(404).json({ error: 'Channel configuration not found' });
              return;
            }

            const testResult = await testChannelConnection(channel, currentConfig.config);
            
            // Update connection status based on test result
            if (testResult.success) {
              mockChannelConfigs[channel].connectionStatus = 'connected';
            } else {
              mockChannelConfigs[channel].connectionStatus = 'error';
            }
            mockChannelConfigs[channel].lastTestAt = new Date().toISOString();

            res.status(200).json(testResult);
            break;

          default:
            res.status(405).json({ error: 'Method not allowed' });
        }
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
    } else {
      res.status(404).json({ error: 'Channel not found' });
    }

  } catch (error) {
    console.error('Channel config API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Failed to process channel configuration request' });
  }
}