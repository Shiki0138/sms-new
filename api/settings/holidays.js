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

// Mock holidays data
let holidays = [
  '2024-01-01', '2024-01-02', '2024-01-03',
  '2024-04-29', '2024-05-03', '2024-05-04', '2024-05-05',
  '2024-08-15', '2024-12-29', '2024-12-30', '2024-12-31'
];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
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
        res.json({ holidays });
        break;

      case 'POST':
        const { date } = req.body;
        if (date && !holidays.includes(date)) {
          holidays.push(date);
          holidays.sort();
        }
        
        res.json({
          message: 'Holiday added successfully',
          holidays
        });
        break;

      case 'DELETE':
        const { date: dateToRemove } = req.body;
        holidays = holidays.filter(holiday => holiday !== dateToRemove);
        
        res.json({
          message: 'Holiday removed successfully',
          holidays
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Holidays API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process holidays request' });
  }
}