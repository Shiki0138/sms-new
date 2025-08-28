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

// Mock channel configurations data (shared state)
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
    webhookSecret: 'generated-webhook-secret',
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

// Test channel connection (mock implementation)
async function testChannelConnection(channel, config) {
  // Simulate connection test delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  switch (channel) {
    case 'sms':
      // Check if required fields are provided
      if (config.accountSid && config.authToken && config.phoneNumber) {
        // In a real implementation, we would test the Twilio connection
        // For now, simulate success if all fields are provided
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

    // Get channel from query parameter
    const { channel } = req.query;

    if (!channel || !['sms', 'email', 'line', 'instagram'].includes(channel)) {
      res.status(404).json({ error: 'Invalid channel' });
      return;
    }

    // Only handle POST for testing
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Get current configuration for the channel
    const currentConfig = mockChannelConfigs[channel];
    if (!currentConfig) {
      res.status(404).json({ error: 'Channel configuration not found' });
      return;
    }

    // Test the connection with current configuration
    const testResult = await testChannelConnection(channel, currentConfig.config);
    
    // Update connection status based on test result
    if (testResult.success) {
      mockChannelConfigs[channel].connectionStatus = 'connected';
    } else {
      mockChannelConfigs[channel].connectionStatus = 'error';
    }
    mockChannelConfigs[channel].lastTestAt = new Date().toISOString();

    // Return test result
    res.status(200).json(testResult);

  } catch (error) {
    console.error('Channel test API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Failed to test channel connection' });
  }
}