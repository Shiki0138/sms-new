const jwt = require('jsonwebtoken');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ message: 'Not available in production' });
  }

  if (req.method === 'POST') {
    try {
      // Generate test token with same structure as real auth
      const testPayload = {
        userId: 'test-user-id',
        username: 'testuser',
        salonId: 'test-salon-id',
        name: 'Test User',
        salonName: 'Test Salon',
        planType: 'light',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      };

      const token = jwt.sign(testPayload, process.env.JWT_SECRET);

      res.json({
        message: 'Test token generated',
        token: token,
        payload: testPayload
      });
    } catch (error) {
      console.error('Test token generation error:', error);
      res.status(500).json({ 
        message: 'Failed to generate test token',
        error: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}