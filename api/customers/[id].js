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

// Mock customers database with the specific ID from the error
const mockCustomers = [
  {
    id: 'ad824dde-f031-436a-a206-d8d5704ab741', // This matches the 404 error
    firstName: 'さくら',
    lastName: '田中',
    firstNameKana: 'サクラ',
    lastNameKana: 'タナカ',
    email: 'tanaka.sakura@example.com',
    phoneNumber: '090-1234-5678',
    birthDate: '1990-05-15',
    address: '東京都渋谷区美容町1-2-3',
    visitCount: 12,
    totalSpent: 85000,
    lastVisit: '2024-08-15',
    notes: '敏感肌、アロマオイル好み',
    desires: '自然な美しさを引き出したい。髪の健康を重視し、ダメージの少ない施術を希望。',
    needs: 'リラックスできる空間での施術。時間をかけた丁寧なカウンセリング。',
    preferences: {
      '施術スタイル': 'ナチュラル志向',
      '好みの香り': 'ラベンダー、ローズ',
      '施術時間': 'ゆったりとした時間配分',
      'スタイリスト': '女性スタッフ希望'
    },
    allergies: ['化学系染料に軽度の反応'],
    skinType: '敏感肌',
    hairType: '細毛、乾燥毛',
    isActive: true,
    tags: ['VIP', '敏感肌', 'ナチュラル志向'],
    createdAt: '2023-06-15T00:00:00Z',
    updatedAt: '2024-08-15T00:00:00Z'
  },
  {
    id: 'cust-001',
    firstName: 'みゆき',
    lastName: '佐藤',
    firstNameKana: 'ミユキ',
    lastNameKana: 'サトウ',
    email: 'sato.miyuki@example.com',
    phoneNumber: '090-2345-6789',
    birthDate: '1985-12-03',
    address: '東京都新宿区美容町4-5-6',
    visitCount: 8,
    totalSpent: 62000,
    lastVisit: '2024-08-20',
    notes: 'ショートヘア専門、カラーリング好き',
    desires: 'トレンドを意識したスタイルチェンジ。定期的なカラーリングでイメージアップ。',
    needs: '忙しい日程に合わせた効率的な施術。最新トレンドの提案。',
    preferences: {
      '施術スタイル': 'トレンド重視',
      '好みのスタイル': 'ショート・ボブ',
      'カラー': 'アッシュ系、ブラウン系',
      '施術頻度': '月1-2回'
    },
    allergies: [],
    skinType: '普通肌',
    hairType: '普通毛',
    isActive: true,
    tags: ['リピーター', 'カラー好き', 'ショートヘア'],
    createdAt: '2023-08-20T00:00:00Z',
    updatedAt: '2024-08-20T00:00:00Z'
  },
  {
    id: 'cust-002',
    firstName: 'えみ',
    lastName: '山田',
    firstNameKana: 'エミ',
    lastNameKana: 'ヤマダ',
    email: 'yamada.emi@example.com',
    phoneNumber: '090-3456-7890',
    birthDate: '1992-03-22',
    address: '東京都世田谷区美容町7-8-9',
    visitCount: 15,
    totalSpent: 120000,
    lastVisit: '2024-08-25',
    notes: 'VIP顧客、月2回定期来店',
    desires: '上質な美容体験。最新の技術とトリートメントで美しさを維持したい。',
    needs: 'プライベートな空間での特別なサービス。定期的なメンテナンス。',
    preferences: {
      '施術スタイル': 'プレミアム',
      '予約時間': '平日午後',
      'サービス': 'フルコース希望',
      '特別要望': '個室での施術'
    },
    allergies: [],
    skinType: '乾燥肌',
    hairType: '太毛、ウェーブ',
    isActive: true,
    tags: ['VIP', 'プレミアム顧客', '定期来店'],
    createdAt: '2023-04-10T00:00:00Z',
    updatedAt: '2024-08-25T00:00:00Z'
  }
];

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Get customer ID from URL path
    const { id: customerId } = req.query;
    
    if (!customerId) {
      return res.status(400).json({ 
        message: 'Customer ID is required',
        error: 'MISSING_CUSTOMER_ID'
      });
    }

    console.log(`Looking for customer with ID: ${customerId}`);
    console.log(`Available customer IDs: ${mockCustomers.map(c => c.id).join(', ')}`);

    switch (req.method) {
      case 'GET':
        // Get individual customer
        const customer = mockCustomers.find(c => c.id === customerId);
        
        if (!customer) {
          return res.status(404).json({ 
            message: `指定された顧客が見つかりません (ID: ${customerId})`,
            customerId: customerId,
            availableIds: mockCustomers.map(c => c.id),
            error: 'CUSTOMER_NOT_FOUND'
          });
        }

        res.json({
          message: 'Customer retrieved successfully',
          customer: customer
        });
        break;

      case 'PUT':
        // Update customer
        const customerIndex = mockCustomers.findIndex(c => c.id === customerId);
        
        if (customerIndex === -1) {
          return res.status(404).json({ 
            message: `指定された顧客が見つかりません (ID: ${customerId})`,
            error: 'CUSTOMER_NOT_FOUND'
          });
        }

        mockCustomers[customerIndex] = {
          ...mockCustomers[customerIndex],
          ...req.body,
          updatedAt: new Date().toISOString()
        };

        res.json({
          message: 'Customer updated successfully',
          customer: mockCustomers[customerIndex]
        });
        break;

      case 'DELETE':
        // Soft delete customer
        const deleteIndex = mockCustomers.findIndex(c => c.id === customerId);
        
        if (deleteIndex === -1) {
          return res.status(404).json({ 
            message: `指定された顧客が見つかりません (ID: ${customerId})`,
            error: 'CUSTOMER_NOT_FOUND'
          });
        }

        mockCustomers[deleteIndex].isActive = false;
        mockCustomers[deleteIndex].updatedAt = new Date().toISOString();

        res.json({
          message: 'Customer deleted successfully',
          customer: mockCustomers[deleteIndex]
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Customer detail API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ 
        message: 'Unauthorized',
        error: 'AUTH_REQUIRED'
      });
    }
    res.status(500).json({ 
      message: 'Failed to process customer request',
      error: 'INTERNAL_ERROR'
    });
  }
}