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

// Mock settings data
const mockSettings = {
  salon: {
    name: 'Salon Lumière',
    address: '東京都渋谷区美容町1-2-3',
    phone: '03-1234-5678',
    email: 'info@salon-lumiere.com',
    website: 'https://salon-lumiere.com',
    description: '美容と癒しの空間を提供する高級サロン'
  },
  businessHours: {
    monday: { open: '09:00', close: '19:00', closed: false },
    tuesday: { open: '09:00', close: '19:00', closed: false },
    wednesday: { open: '09:00', close: '19:00', closed: false },
    thursday: { open: '09:00', close: '19:00', closed: false },
    friday: { open: '09:00', close: '20:00', closed: false },
    saturday: { open: '08:00', close: '18:00', closed: false },
    sunday: { open: '10:00', close: '17:00', closed: false }
  },
  holidays: [
    '2024-01-01', '2024-01-02', '2024-01-03',
    '2024-04-29', '2024-05-03', '2024-05-04', '2024-05-05',
    '2024-08-15', '2024-12-29', '2024-12-30', '2024-12-31'
  ],
  closures: [
    {
      id: '1',
      date: '2024-02-15',
      reason: '設備メンテナンス',
      type: 'maintenance'
    },
    {
      id: '2',
      date: '2024-03-20',
      reason: 'スタッフ研修',
      type: 'training'
    }
  ],
  notifications: {
    emailEnabled: true,
    smsEnabled: true,
    reminderHours: 24,
    confirmationEnabled: true
  },
  payment: {
    cashEnabled: true,
    creditCardEnabled: true,
    payPayEnabled: true,
    bankTransferEnabled: false
  }
};

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

    switch (req.method) {
      case 'GET':
        // Return all settings or specific section
        const section = req.query.section;
        
        if (section) {
          if (mockSettings[section]) {
            res.json({ [section]: mockSettings[section] });
          } else {
            res.status(404).json({ message: 'Settings section not found' });
          }
        } else {
          res.json(mockSettings);
        }
        break;

      case 'PUT':
        // Update settings
        const updatedSection = req.query.section;
        
        if (updatedSection && mockSettings[updatedSection]) {
          mockSettings[updatedSection] = {
            ...mockSettings[updatedSection],
            ...req.body
          };
          
          res.json({
            message: 'Settings updated successfully',
            [updatedSection]: mockSettings[updatedSection]
          });
        } else if (!updatedSection) {
          // Update entire settings object
          Object.keys(req.body).forEach(key => {
            if (mockSettings[key]) {
              mockSettings[key] = {
                ...mockSettings[key],
                ...req.body[key]
              };
            }
          });
          
          res.json({
            message: 'Settings updated successfully',
            settings: mockSettings
          });
        } else {
          res.status(404).json({ message: 'Settings section not found' });
        }
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process settings request' });
  }
}