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

// Mock sales database (updated with consistent customer IDs)
const mockSales = [
  {
    id: 'sale-001',
    customerName: '田中 さくら',
    customerId: 'cust-001',
    serviceName: 'カット & カラー',
    servicePrice: 8500,
    items: [
      { name: 'カット & カラー', price: 8500, type: 'service' },
      { name: 'ヘアトリートメント', price: 2000, quantity: 1, type: 'product' }
    ],
    products: [
      { name: 'ヘアトリートメント', price: 2000, quantity: 1 }
    ],
    totalAmount: 10500,
    paymentMethod: 'クレジットカード',
    saleDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    notes: '次回はパーマ希望'
  },
  {
    id: 'sale-002',
    customerName: '佐藤 みゆき',
    customerId: 'cust-002',
    serviceName: 'ヘッドスパ',
    servicePrice: 6000,
    items: [
      { name: 'ヘッドスパ', price: 6000, type: 'service' },
      { name: 'スカルプエッセンス', price: 3500, quantity: 1, type: 'product' },
      { name: 'ヘアオイル', price: 2800, quantity: 1, type: 'product' }
    ],
    products: [
      { name: 'スカルプエッセンス', price: 3500, quantity: 1 },
      { name: 'ヘアオイル', price: 2800, quantity: 1 }
    ],
    totalAmount: 12300,
    paymentMethod: '現金',
    saleDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    notes: 'リラックス効果を実感'
  },
  {
    id: 'sale-003',
    customerName: '山田 えみ',
    customerId: 'cust-003',
    serviceName: 'フルコース（カット・カラー・パーマ）',
    servicePrice: 15000,
    items: [
      { name: 'フルコース（カット・カラー・パーマ）', price: 15000, type: 'service' },
      { name: 'ヘアケアセット', price: 5000, quantity: 1, type: 'product' }
    ],
    products: [
      { name: 'ヘアケアセット', price: 5000, quantity: 1 }
    ],
    totalAmount: 20000,
    paymentMethod: 'クレジットカード',
    saleDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'VIP顧客、満足度高'
  },
  {
    id: 'sale-004',
    customerName: '鈴木 あい',
    customerId: 'cust-004',
    serviceName: 'カット & ブロー',
    servicePrice: 5500,
    items: [
      { name: 'カット & ブロー', price: 5500, type: 'service' }
    ],
    products: [],
    totalAmount: 5500,
    paymentMethod: '現金',
    saleDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: 'シンプルスタイル希望'
  },
  {
    id: 'sale-005',
    customerName: '田中 さくら',
    customerId: 'cust-001',
    serviceName: 'ヘッドスパ & トリートメント',
    servicePrice: 6000,
    items: [
      { name: 'ヘッドスパ & トリートメント', price: 6000, type: 'service' }
    ],
    products: [],
    totalAmount: 6000,
    paymentMethod: 'クレジットカード',
    saleDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    notes: '髪の健康重視'
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
        // Filter sales based on query parameters
        let filteredSales = [...mockSales];
        
        // Filter by customer ID if provided
        if (req.query.customerId) {
          filteredSales = filteredSales.filter(sale => 
            sale.customerId === req.query.customerId
          );
        }
        
        // Filter by date range if provided
        if (req.query.startDate) {
          filteredSales = filteredSales.filter(sale => 
            sale.saleDate >= req.query.startDate
          );
        }
        
        if (req.query.endDate) {
          filteredSales = filteredSales.filter(sale => 
            sale.saleDate <= req.query.endDate
          );
        }
        
        // Calculate summary based on filtered or all sales
        const salesForSummary = req.query.customerId ? filteredSales : mockSales;
        const totalSales = salesForSummary.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const todaysSales = mockSales.filter(sale => 
          sale.saleDate === new Date().toISOString().split('T')[0]
        );
        const todaysRevenue = todaysSales.reduce((sum, sale) => sum + sale.totalAmount, 0);

        res.json({
          sales: filteredSales,
          summary: {
            totalSales: salesForSummary.length,
            totalRevenue: totalSales,
            todaysSales: todaysSales.length,
            todaysRevenue: todaysRevenue,
            averageSale: salesForSummary.length > 0 ? Math.round(totalSales / salesForSummary.length) : 0
          }
        });
        break;

      case 'POST':
        // Create new sale
        const newSale = {
          id: uuidv4(),
          ...req.body,
          createdAt: new Date().toISOString(),
          saleDate: req.body.saleDate || new Date().toISOString().split('T')[0]
        };
        
        mockSales.unshift(newSale); // Add to beginning for recent-first order
        res.status(201).json({
          message: 'Sale created successfully',
          sale: newSale
        });
        break;

      case 'PUT':
        // Update sale
        res.json({
          message: 'Sale updated successfully'
        });
        break;

      case 'DELETE':
        // Delete sale
        res.json({
          message: 'Sale deleted successfully'
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Sales API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process sales request' });
  }
}