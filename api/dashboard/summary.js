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

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const user = verifyToken(req);

    // Return mock dashboard data
    const dashboardData = {
      today: {
        appointments: [
          {
            id: '1',
            startTime: '10:00',
            customer: { firstName: 'さくら', lastName: '田中' },
            status: 'confirmed'
          },
          {
            id: '2',
            startTime: '14:00',
            customer: { firstName: 'みゆき', lastName: '佐藤' },
            status: 'completed'
          }
        ],
        appointmentCount: 2,
        sales: { count: 3, total: 12500 }
      },
      tomorrow: {
        appointmentCount: 1
      },
      thisMonth: {
        sales: { count: 25, total: 156000 }
      },
      customers: {
        total: 45,
        newThisMonth: 8,
        recent: [
          { id: '1', firstName: 'えみ', lastName: '山田', createdAt: new Date().toISOString() },
          { id: '2', firstName: 'あい', lastName: '鈴木', createdAt: new Date().toISOString() }
        ]
      }
    };

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to get dashboard data' });
  }
}