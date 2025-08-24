// Centralized customer data management (ES6 module version)

// Simple ID generator
function generateId() {
  return `cust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Centralized customer database - single source of truth
let customers = [
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
    allergies: ['化学系染料に軽度の反応'],
    skinType: '敏感肌',
    hairType: '細毛、乾燥毛',
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
    allergies: [],
    skinType: '普通肌',
    hairType: '普通毛',
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
    allergies: [],
    skinType: '乾燥肌',
    hairType: '太毛、ウェーブ',
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
    allergies: [],
    skinType: '敏感肌',
    hairType: '細毛、乾燥毛',
    tags: ['パーマ好き', '自然派', 'オーガニック志向'],
    isActive: true,
    createdAt: new Date('2023-09-30').toISOString(),
    updatedAt: new Date('2024-01-18').toISOString()
  }
];

// Centralized data management functions
const customerData = {
  // Get all active customers
  getAllCustomers() {
    return customers.filter(c => c.isActive);
  },

  // Get customer by ID
  getCustomerById(id) {
    return customers.find(c => c.id === id);
  },

  // Create new customer
  createCustomer(data) {
    const newId = generateId();
    const newCustomer = {
      ...data,
      id: newId,
      visitCount: 0,
      totalSpent: 0,
      totalSales: 0,
      lastVisit: null,
      lastVisitDate: null,
      firstVisitDate: new Date().toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    customers.push(newCustomer);
    console.log(`Created new customer: ${newId}`);
    return newCustomer;
  },

  // Update customer
  updateCustomer(id, updates) {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) {
      return null;
    }

    customers[index] = {
      ...customers[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    console.log(`Updated customer: ${id}`);
    return customers[index];
  },

  // Soft delete customer
  deleteCustomer(id) {
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) {
      return null;
    }

    customers[index].isActive = false;
    customers[index].updatedAt = new Date().toISOString();
    
    console.log(`Deleted customer: ${id}`);
    return customers[index];
  },

  // Search customers
  searchCustomers(query) {
    const searchLower = query.toLowerCase();
    return customers.filter(c => 
      c.isActive && (
        c.firstName.toLowerCase().includes(searchLower) ||
        c.lastName.toLowerCase().includes(searchLower) ||
        c.firstNameKana.toLowerCase().includes(searchLower) ||
        c.lastNameKana.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.phoneNumber.includes(query)
      )
    );
  },

  // Get customer count
  getCustomerCount() {
    return customers.filter(c => c.isActive).length;
  }
};

export default customerData;