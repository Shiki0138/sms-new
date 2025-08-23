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

    // Handle sub-paths for settings endpoints
    const path = req.url.replace('/api/settings', '') || '/';
    
    // Business Hours endpoint
    if (path.startsWith('/business-hours')) {
      switch (req.method) {
        case 'GET':
          res.json({ businessHours: mockSettings.businessHours });
          break;
        case 'PUT':
          mockSettings.businessHours = { ...mockSettings.businessHours, ...req.body };
          res.json({ message: 'Business hours updated successfully', businessHours: mockSettings.businessHours });
          break;
        default:
          res.status(405).json({ message: 'Method not allowed' });
      }
      return;
    }

    // Holidays endpoint
    if (path.startsWith('/holidays')) {
      switch (req.method) {
        case 'GET':
          res.json({ holidays: mockSettings.holidays });
          break;
        case 'POST':
          const { date } = req.body;
          if (date && !mockSettings.holidays.includes(date)) {
            mockSettings.holidays.push(date);
            mockSettings.holidays.sort();
          }
          res.json({ message: 'Holiday added successfully', holidays: mockSettings.holidays });
          break;
        case 'DELETE':
          const { date: dateToRemove } = req.body;
          mockSettings.holidays = mockSettings.holidays.filter(holiday => holiday !== dateToRemove);
          res.json({ message: 'Holiday removed successfully', holidays: mockSettings.holidays });
          break;
        default:
          res.status(405).json({ message: 'Method not allowed' });
      }
      return;
    }

    // Closures endpoint
    if (path.startsWith('/closures')) {
      switch (req.method) {
        case 'GET':
          res.json({ closures: mockSettings.closures });
          break;
        case 'POST':
          const newClosure = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
          mockSettings.closures.push(newClosure);
          res.status(201).json({ message: 'Closure created successfully', closure: newClosure, closures: mockSettings.closures });
          break;
        case 'PUT':
          const { id: updateId } = req.query;
          const closureIndex = mockSettings.closures.findIndex(c => c.id === updateId);
          if (closureIndex !== -1) {
            mockSettings.closures[closureIndex] = { ...mockSettings.closures[closureIndex], ...req.body, updatedAt: new Date().toISOString() };
            res.json({ message: 'Closure updated successfully', closure: mockSettings.closures[closureIndex], closures: mockSettings.closures });
          } else {
            res.status(404).json({ message: 'Closure not found' });
          }
          break;
        case 'DELETE':
          const { id: deleteId } = req.query;
          mockSettings.closures = mockSettings.closures.filter(c => c.id !== deleteId);
          res.json({ message: 'Closure deleted successfully', closures: mockSettings.closures });
          break;
        default:
          res.status(405).json({ message: 'Method not allowed' });
      }
      return;
    }

    // Default settings endpoint
    switch (req.method) {
      case 'GET':
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
        const updatedSection = req.query.section;
        if (updatedSection && mockSettings[updatedSection]) {
          mockSettings[updatedSection] = { ...mockSettings[updatedSection], ...req.body };
          res.json({ message: 'Settings updated successfully', [updatedSection]: mockSettings[updatedSection] });
        } else if (!updatedSection) {
          Object.keys(req.body).forEach(key => {
            if (mockSettings[key]) {
              mockSettings[key] = { ...mockSettings[key], ...req.body[key] };
            }
          });
          res.json({ message: 'Settings updated successfully', settings: mockSettings });
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