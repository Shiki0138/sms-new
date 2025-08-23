const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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

// Mock closures data
let closures = [
  {
    id: uuidv4(),
    date: '2024-02-15',
    reason: '設備メンテナンス',
    type: 'maintenance',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    date: '2024-03-20',
    reason: 'スタッフ研修',
    type: 'training',
    createdAt: new Date().toISOString()
  }
];

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
        res.json({ closures });
        break;

      case 'POST':
        const newClosure = {
          id: uuidv4(),
          ...req.body,
          createdAt: new Date().toISOString()
        };
        
        closures.push(newClosure);
        closures.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        res.status(201).json({
          message: 'Closure created successfully',
          closure: newClosure,
          closures
        });
        break;

      case 'PUT':
        const { id: updateId } = req.query;
        const closureIndex = closures.findIndex(c => c.id === updateId);
        
        if (closureIndex !== -1) {
          closures[closureIndex] = {
            ...closures[closureIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
          };
          
          res.json({
            message: 'Closure updated successfully',
            closure: closures[closureIndex],
            closures
          });
        } else {
          res.status(404).json({ message: 'Closure not found' });
        }
        break;

      case 'DELETE':
        const { id: deleteId } = req.query;
        closures = closures.filter(c => c.id !== deleteId);
        
        res.json({
          message: 'Closure deleted successfully',
          closures
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Closures API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process closures request' });
  }
}