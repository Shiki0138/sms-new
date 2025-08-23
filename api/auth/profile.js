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

// Mock user profile data
const userProfile = {
  id: '1',
  email: 'admin@salon-lumiere.com',
  name: 'Admin User',
  salonName: 'Salon Lumière',
  planType: 'light',
  role: 'admin',
  avatar: null,
  phone: '03-1234-5678',
  address: '東京都渋谷区美容町1-2-3',
  bio: 'サロン経営者として10年の経験があります。',
  preferences: {
    language: 'ja',
    timezone: 'Asia/Tokyo',
    emailNotifications: true,
    smsNotifications: true,
    theme: 'light'
  },
  subscription: {
    plan: 'light',
    status: 'active',
    expiryDate: '2024-12-31',
    features: [
      'customer_management',
      'appointment_booking',
      'basic_analytics',
      'sms_notifications'
    ]
  },
  stats: {
    totalCustomers: 145,
    totalAppointments: 1250,
    totalSales: 850000,
    joinDate: '2023-01-15'
  }
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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
        // Return user profile
        res.json({
          profile: userProfile
        });
        break;

      case 'PUT':
        // Update user profile
        const updates = req.body;
        
        // Update allowed fields
        const allowedFields = ['name', 'phone', 'address', 'bio', 'preferences'];
        allowedFields.forEach(field => {
          if (updates[field] !== undefined) {
            if (field === 'preferences') {
              userProfile.preferences = {
                ...userProfile.preferences,
                ...updates.preferences
              };
            } else {
              userProfile[field] = updates[field];
            }
          }
        });

        res.json({
          message: 'Profile updated successfully',
          profile: userProfile
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process profile request' });
  }
}