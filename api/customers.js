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

// Mock customers database (consistent IDs for individual access)
const mockCustomers = [
  {
    id: 'cust-001',
    firstName: 'さくら',
    lastName: '田中',
    firstNameKana: 'サクラ',
    lastNameKana: 'タナカ',
    email: 'tanaka.sakura@example.com',
    phoneNumber: '090-1234-5678',
    birthDate: '1990-05-15',
    gender: 'female',
    postalCode: '150-0001',
    prefecture: '東京都',
    city: '渋谷区',
    address: '1-2-3',
    visitCount: 12,
    totalSpent: 85000,
    totalSales: 85000,
    lastVisit: '2024-01-15',
    lastVisitDate: '2024-01-15',
    firstVisitDate: '2023-06-15',
    notes: '敏感肌、アロマオイル好み',
    desires: '自然な美しさを引き出したい。特に肌の透明感を重視。',
    needs: 'リラックスできる空間での施術を希望。アレルギー対応必須。',
    preferences: {
      '施術スタイル': 'ナチュラル志向',
      '好みの香り': 'ラベンダー、ローズ',
      'アレルギー': '化学系成分',
      '施術時間': '長めを希望'
    },
    tags: ['VIP', '敏感肌', 'ナチュラル志向'],
    isActive: true,
    createdAt: new Date('2023-06-15').toISOString(),
    updatedAt: new Date('2024-01-15').toISOString()
  },
  {
    id: 'cust-002',
    firstName: 'みゆき',
    lastName: '佐藤',
    firstNameKana: 'ミユキ',
    lastNameKana: 'サトウ',
    email: 'sato.miyuki@example.com',
    phoneNumber: '090-2345-6789',
    birthDate: '1985-12-03',
    gender: 'female',
    postalCode: '160-0022',
    prefecture: '東京都',
    city: '新宿区',
    address: '4-5-6',
    visitCount: 8,
    totalSpent: 62000,
    totalSales: 62000,
    lastVisit: '2024-01-20',
    lastVisitDate: '2024-01-20',
    firstVisitDate: '2023-08-20',
    notes: 'ショートヘア専門、カラーリング好き',
    desires: '個性的で洗練されたスタイルを追求したい。',
    needs: '忙しいので効率的な施術を希望。メンテナンスが楽なスタイル。',
    preferences: {
      '施術スタイル': 'モダン・都会的',
      '好みの色': 'アッシュ系、ブラウン系',
      '施術頻度': '月1回',
      '施術時間': '短時間希望'
    },
    tags: ['ショートヘア', 'カラー好き', '都会派'],
    isActive: true,
    createdAt: new Date('2023-08-20').toISOString(),
    updatedAt: new Date('2024-01-20').toISOString()
  },
  {
    id: 'cust-003',
    firstName: 'えみ',
    lastName: '山田',
    firstNameKana: 'エミ',
    lastNameKana: 'ヤマダ',
    email: 'yamada.emi@example.com',
    phoneNumber: '090-3456-7890',
    birthDate: '1992-03-22',
    gender: 'female',
    postalCode: '154-0017',
    prefecture: '東京都',
    city: '世田谷区',
    address: '7-8-9',
    visitCount: 15,
    totalSpent: 120000,
    totalSales: 120000,
    lastVisit: '2024-01-25',
    lastVisitDate: '2024-01-25',
    firstVisitDate: '2023-04-10',
    notes: 'VIP顧客、月2回定期来店',
    desires: '常に最新のトレンドを取り入れたい。上質なサービスを重視。',
    needs: '定期的なメンテナンスと新しい提案を期待。特別感のある体験。',
    preferences: {
      '施術スタイル': 'トレンド重視・高級志向',
      '予約優先度': '最優先',
      '施術者': '指名あり',
      '特別サービス': 'VIP対応希望'
    },
    tags: ['VIP', '定期客', 'トレンド志向', '上級者'],
    isActive: true,
    createdAt: new Date('2023-04-10').toISOString(),
    updatedAt: new Date('2024-01-25').toISOString()
  },
  {
    id: 'cust-004',
    firstName: 'あい',
    lastName: '鈴木',
    firstNameKana: 'アイ',
    lastNameKana: 'スズキ',
    email: 'suzuki.ai@example.com',
    phoneNumber: '090-4567-8901',
    birthDate: '1988-09-08',
    gender: 'female',
    postalCode: '104-0061',
    prefecture: '東京都',
    city: '中央区',
    address: '10-11-12',
    visitCount: 6,
    totalSpent: 45000,
    totalSales: 45000,
    lastVisit: '2024-01-18',
    lastVisitDate: '2024-01-18',
    firstVisitDate: '2023-09-30',
    notes: 'パーマ専門、自然派化粧品希望',
    desires: '健康で自然な美しさを保ちたい。化学薬品を避けたい。',
    needs: 'オーガニック・自然派製品の使用。肌に優しい施術。',
    preferences: {
      '製品タイプ': 'オーガニック・自然派',
      '施術スタイル': 'ナチュラル・健康重視',
      '避けるもの': '化学薬品・強い薬剤',
      '施術頻度': '2-3ヶ月に1回'
    },
    tags: ['パーマ好き', '自然派', 'オーガニック志向'],
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
        // Update customer by ID (expects customerId in query params or body)
        const customerId = req.query.id || req.body.id;
        
        if (!customerId) {
          return res.status(400).json({ 
            message: 'Customer ID is required for update operation' 
          });
        }

        const customerIndex = mockCustomers.findIndex(c => c.id === customerId);
        
        if (customerIndex === -1) {
          return res.status(404).json({ 
            message: 'Customer not found',
            customerId: customerId
          });
        }

        // Update customer data
        const updatedData = {
          ...mockCustomers[customerIndex],
          ...req.body,
          updatedAt: new Date().toISOString()
        };
        
        // Remove id from body to prevent overwriting
        delete updatedData.id;
        updatedData.id = customerId;
        
        mockCustomers[customerIndex] = updatedData;
        
        res.json({
          message: 'Customer updated successfully',
          customer: updatedData
        });
        break;

      case 'DELETE':
        // Delete customer by ID (expects customerId in query params)
        const deleteCustomerId = req.query.id;
        
        if (!deleteCustomerId) {
          return res.status(400).json({ 
            message: 'Customer ID is required for delete operation' 
          });
        }

        const deleteIndex = mockCustomers.findIndex(c => c.id === deleteCustomerId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({ 
            message: 'Customer not found',
            customerId: deleteCustomerId
          });
        }

        // Soft delete by setting isActive to false
        mockCustomers[deleteIndex].isActive = false;
        mockCustomers[deleteIndex].updatedAt = new Date().toISOString();
        
        res.json({
          message: 'Customer deleted successfully',
          customerId: deleteCustomerId
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