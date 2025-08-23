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

// Mock customers database
const mockCustomers = [
  {
    id: uuidv4(),
    firstName: 'さくら',
    lastName: '田中',
    email: 'tanaka.sakura@example.com',
    phoneNumber: '090-1234-5678',
    birthDate: '1990-05-15',
    address: '東京都渋谷区1-2-3',
    visitCount: 12,
    totalSpent: 85000,
    lastVisit: '2024-01-15',
    notes: '敏感肌、アロマオイル好み',
    isActive: true,
    createdAt: new Date('2023-06-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString()
  },
  {
    id: uuidv4(),
    firstName: 'みゆき',
    lastName: '佐藤',
    email: 'sato.miyuki@example.com',
    phoneNumber: '090-2345-6789',
    birthDate: '1985-12-03',
    address: '東京都新宿区4-5-6',
    visitCount: 8,
    totalSpent: 62000,
    lastVisit: '2024-01-20',
    notes: 'ショートヘア専門、カラーリング好き',
    isActive: true,
    createdAt: new Date('2023-08-20').toISOString(),
    updatedAt: new Date('2024-01-20').toISOString()
  },
  {
    id: uuidv4(),
    firstName: 'えみ',
    lastName: '山田',
    email: 'yamada.emi@example.com',
    phoneNumber: '090-3456-7890',
    birthDate: '1992-03-22',
    address: '東京都世田谷区7-8-9',
    visitCount: 15,
    totalSpent: 120000,
    lastVisit: '2024-01-25',
    notes: 'VIP顧客、月2回定期来店',
    isActive: true,
    createdAt: new Date('2023-04-10').toISOString(),
    updatedAt: new Date('2024-01-25').toISOString()
  },
  {
    id: uuidv4(),
    firstName: 'あい',
    lastName: '鈴木',
    email: 'suzuki.ai@example.com',
    phoneNumber: '090-4567-8901',
    birthDate: '1988-09-08',
    address: '東京都中央区10-11-12',
    visitCount: 6,
    totalSpent: 45000,
    lastVisit: '2024-01-18',
    notes: 'パーマ専門、自然派化粧品希望',
    isActive: true,
    createdAt: new Date('2023-09-30').toISOString(),
    updatedAt: new Date('2024-01-18').toISOString()
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
        // Return all customers
        res.json({
          customers: mockCustomers,
          total: mockCustomers.length
        });
        break;

      case 'POST':
        // Create new customer
        const newCustomer = {
          id: uuidv4(),
          ...req.body,
          visitCount: 0,
          totalSpent: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockCustomers.push(newCustomer);
        res.status(201).json({
          message: 'Customer created successfully',
          customer: newCustomer
        });
        break;

      case 'PUT':
        // Update customer (simplified - in real app would find by ID)
        res.json({
          message: 'Customer updated successfully'
        });
        break;

      case 'DELETE':
        // Delete customer (simplified)
        res.json({
          message: 'Customer deleted successfully'
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Customers API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process customers request' });
  }
}