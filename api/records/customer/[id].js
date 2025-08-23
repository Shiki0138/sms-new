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

// Mock medical records database
const mockRecords = [
  {
    id: 'record-001',
    customerId: 'cust-001',
    customerName: '田中 さくら',
    visitDate: new Date().toISOString().split('T')[0],
    services: ['カット', 'カラー'],
    treatmentDetails: `
カット: 肩上5cmのボブスタイル。レイヤーを入れて動きを出す。
カラー: アッシュブラウン8レベル。根元リタッチとトーン調整。
前回より明るめに調整し、肌の透明感を引き出すように配色。
    `.trim(),
    scalp_condition: '健康',
    hair_condition: '普通',
    skin_sensitivity: '敏感肌',
    allergies: ['化学系染料に軽度の反応'],
    preferences: ['自然な仕上がり', 'ダメージレス施術'],
    recommendations: `
次回は6-8週間後を推奨。
根元のリタッチとトリートメント。
敏感肌対応の薬剤を継続使用。
    `.trim(),
    beforePhotoUrl: '/images/records/before-001.jpg',
    afterPhotoUrl: '/images/records/after-001.jpg',
    photos: [
      {
        id: 'photo-001',
        url: '/images/records/before-001.jpg',
        type: 'before',
        caption: '施術前（根元の新生毛が目立つ状態）'
      },
      {
        id: 'photo-002',
        url: '/images/records/after-001.jpg',
        type: 'after',
        caption: '施術後（艶のある仕上がり）'
      }
    ],
    stylist: '田中 美咲',
    duration: 120,
    totalCost: 8500,
    nextAppointment: new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'record-002',
    customerId: 'cust-001',
    customerName: '田中 さくら',
    visitDate: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    services: ['ヘッドスパ', 'トリートメント'],
    treatmentDetails: `
ヘッドスパ: アロマヘッドスパ45分。ラベンダーオイル使用。
トリートメント: 毛髪内部補修タイプ。プロテイン系で強度アップ。
頭皮の血行促進と髪の保湿を重点的に実施。
    `.trim(),
    scalp_condition: '軽度乾燥',
    hair_condition: '若干のダメージ',
    skin_sensitivity: '敏感肌',
    allergies: [],
    preferences: ['リラックス重視', 'アロマ系の香り'],
    recommendations: `
ヘッドスパは月1回のペースで継続。
ホームケアでオイルトリートメント推奨。
次回カラー時はトリートメント同時施術を提案。
    `.trim(),
    beforePhotoUrl: '/images/records/before-002.jpg',
    afterPhotoUrl: '/images/records/after-002.jpg',
    photos: [
      {
        id: 'photo-003',
        url: '/images/records/before-002.jpg',
        type: 'before',
        caption: '施術前（髪の乾燥が目立つ）'
      },
      {
        id: 'photo-004',
        url: '/images/records/after-002.jpg',
        type: 'after',
        caption: '施術後（しっとり艶やか）'
      }
    ],
    stylist: '山田 花音',
    duration: 75,
    totalCost: 6000,
    nextAppointment: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 42 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'record-003',
    customerId: 'cust-002',
    customerName: '佐藤 みゆき',
    visitDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    services: ['カット', 'カラー'],
    treatmentDetails: `
カット: ショートボブ、襟足すっきり。サイドにレイヤー。
カラー: アッシュグレー9レベル。ブリーチなしで透明感のある仕上がり。
都会的で洗練された印象に。メンテナンスしやすいスタイル。
    `.trim(),
    scalp_condition: '健康',
    hair_condition: '良好',
    skin_sensitivity: '普通',
    allergies: [],
    preferences: ['短時間での施術', 'スタイリング簡単'],
    recommendations: `
4週間後にカットメンテナンス。
カラーは6週間後にリタッチ。
朝のスタイリングが楽になるようカット調整済み。
    `.trim(),
    beforePhotoUrl: '/images/records/before-003.jpg',
    afterPhotoUrl: '/images/records/after-003.jpg',
    photos: [
      {
        id: 'photo-005',
        url: '/images/records/before-003.jpg',
        type: 'before',
        caption: '施術前（伸びたショートヘア）'
      },
      {
        id: 'photo-006',
        url: '/images/records/after-003.jpg',
        type: 'after',
        caption: '施術後（すっきりモダンスタイル）'
      }
    ],
    stylist: '田中 美咲',
    duration: 90,
    totalCost: 7500,
    nextAppointment: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'record-004',
    customerId: 'cust-003',
    customerName: '山田 えみ',
    visitDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    services: ['フルコース', 'カット', 'カラー', 'パーマ'],
    treatmentDetails: `
カット: セミロングレイヤー。毛先に動きを。
カラー: ハイライト+ローライトでグラデーション効果。
パーマ: デジタルパーマで大きめのウェーブ。エアウェーブ技法。
VIP顧客として最高品質の薬剤と技術を提供。
    `.trim(),
    scalp_condition: '健康',
    hair_condition: '良好',
    skin_sensitivity: '普通',
    allergies: [],
    preferences: ['最新トレンド', '高級感のある仕上がり', '特別な体験'],
    recommendations: `
2週間後にパーマの状態チェック。
6週間後にカラーのメンテナンス。
月2回の定期来店で常に最高の状態をキープ。
    `.trim(),
    beforePhotoUrl: '/images/records/before-004.jpg',
    afterPhotoUrl: '/images/records/after-004.jpg',
    photos: [
      {
        id: 'photo-007',
        url: '/images/records/before-004.jpg',
        type: 'before',
        caption: '施術前（前回のスタイルからの変更希望）'
      },
      {
        id: 'photo-008',
        url: '/images/records/after-004.jpg',
        type: 'after',
        caption: '施術後（華やかなセミロングウェーブ）'
      },
      {
        id: 'photo-009',
        url: '/images/records/detail-004.jpg',
        type: 'detail',
        caption: 'グラデーションカラーの詳細'
      }
    ],
    stylist: '田中 美咲',
    duration: 180,
    totalCost: 15000,
    nextAppointment: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'record-005',
    customerId: 'cust-004',
    customerName: '鈴木 あい',
    visitDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    services: ['パーマ'],
    treatmentDetails: `
パーマ: ナチュラルウェーブパーマ。オーガニック系薬剤使用。
化学薬品を極力避けた自然派仕様。
ゆるやかなウェーブで自然な動きを表現。
    `.trim(),
    scalp_condition: '健康',
    hair_condition: '普通',
    skin_sensitivity: '敏感肌',
    allergies: ['化学薬品全般に反応しやすい'],
    preferences: ['オーガニック製品', '自然な仕上がり', '肌に優しい施術'],
    recommendations: `
3ヶ月後にパーマの状態確認。
オーガニックホームケア製品の使用を継続。
次回施術時もオーガニック系薬剤を使用。
    `.trim(),
    beforePhotoUrl: '/images/records/before-005.jpg',
    afterPhotoUrl: '/images/records/after-005.jpg',
    photos: [
      {
        id: 'photo-010',
        url: '/images/records/before-005.jpg',
        type: 'before',
        caption: '施術前（ストレートヘア）'
      },
      {
        id: 'photo-011',
        url: '/images/records/after-005.jpg',
        type: 'after',
        caption: '施術後（自然なウェーブ）'
      }
    ],
    stylist: '山田 花音',
    duration: 120,
    totalCost: 8000,
    nextAppointment: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Validate customer ID format
function validateCustomerId(id) {
  if (!id) {
    throw new Error('Customer ID is required');
  }
  
  const isValidId = /^[a-zA-Z0-9\-_]+$/.test(id);
  if (!isValidId) {
    throw new Error('Invalid customer ID format');
  }
  
  return true;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Extract customer ID from URL parameter
    const customerId = req.query.id;
    
    // Validate customer ID
    validateCustomerId(customerId);

    switch (req.method) {
      case 'GET':
        // Find all records for this customer
        const customerRecords = mockRecords.filter(record => record.customerId === customerId);
        
        // Sort by visit date (most recent first)
        customerRecords.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));

        // Calculate summary stats
        const totalVisits = customerRecords.length;
        const totalSpent = customerRecords.reduce((sum, record) => sum + record.totalCost, 0);
        const averageCost = totalVisits > 0 ? Math.round(totalSpent / totalVisits) : 0;
        const lastVisit = totalVisits > 0 ? customerRecords[0].visitDate : null;

        res.json({
          records: customerRecords,
          summary: {
            totalVisits,
            totalSpent,
            averageCost,
            lastVisit
          },
          customerId: customerId
        });
        break;

      case 'POST':
        // Create new record for this customer
        const newRecord = {
          id: uuidv4(),
          customerId: customerId,
          ...req.body,
          visitDate: req.body.visitDate || new Date().toISOString().split('T')[0],
          photos: req.body.photos || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockRecords.push(newRecord);
        
        res.status(201).json({
          message: 'Medical record created successfully',
          record: newRecord
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Medical records API error:', error);
    
    // Handle specific error types
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    if (error.message === 'Customer ID is required' || error.message === 'Invalid customer ID format') {
      return res.status(400).json({ message: error.message });
    }
    
    // Generic server error
    res.status(500).json({ 
      message: 'Failed to process medical records request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}