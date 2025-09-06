const { db } = require('./firebase-config');

/**
 * Firebase初期化およびデータ投入ユーティリティ
 * 美容室VOTAN（ボタン）の実際のデータを使用
 */

const VOTAN_SALON_DATA = {
  salon: {
    id: 'salon_votan_001',
    name: 'ボタン(VOTAN)',
    nameEn: 'VOTAN',
    address: '愛知県西尾市徳永町稲場70-6',
    phone: '0563-65-5823',
    nearestStations: [
      { name: '福地駅', travelTime: '車で8分' },
      { name: '西尾駅', travelTime: '車で20分' }
    ],
    businessHours: {
      cut: { start: '09:00', end: '18:00' },
      color: { start: '09:00', end: '17:00' },
      perm: { start: '09:00', end: '17:00' },
      straight: { start: '09:00', end: '16:00' }
    },
    closedDays: ['月曜日', '火曜日'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true
  },
  
  staff: [
    {
      id: 'staff_fujii_001',
      salonId: 'salon_votan_001',
      name: 'フジイ',
      experience: 1,
      position: 'スタイリスト',
      specialties: ['カット', 'カラー'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff_okabe_001',
      salonId: 'salon_votan_001',
      name: 'オカベ',
      experience: 16,
      position: 'トップスタイリスト',
      specialties: ['カット', 'カラー', 'パーマ', '縮毛矯正'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff_stylist_001',
      salonId: 'salon_votan_001',
      name: 'スタイリストA',
      experience: 3,
      position: 'スタイリスト',
      specialties: ['カット', 'カラー'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff_stylist_002',
      salonId: 'salon_votan_001',
      name: 'スタイリストB',
      experience: 5,
      position: 'スタイリスト',
      specialties: ['カット', 'パーマ'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff_stylist_003',
      salonId: 'salon_votan_001',
      name: 'スタイリストC',
      experience: 2,
      position: 'スタイリスト',
      specialties: ['カット', 'カラー'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff_stylist_004',
      salonId: 'salon_votan_001',
      name: 'スタイリストD',
      experience: 4,
      position: 'スタイリスト',
      specialties: ['カット', 'トリートメント'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'staff_stylist_005',
      salonId: 'salon_votan_001',
      name: 'スタイリストE',
      experience: 7,
      position: 'スタイリスト',
      specialties: ['カット', 'カラー', 'パーマ'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  services: [
    {
      id: 'service_cut_basic',
      salonId: 'salon_votan_001',
      name: 'カット',
      category: 'cut',
      price: 5800,
      duration: 60,
      description: '基本のカットサービス',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'service_cut_premium',
      salonId: 'salon_votan_001',
      name: 'プレミアムカット',
      category: 'cut',
      price: 7500,
      duration: 90,
      description: '上級スタイリストによる丁寧なカット',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'service_color_basic',
      salonId: 'salon_votan_001',
      name: '髪質改善カラー',
      category: 'color',
      price: 8500,
      duration: 120,
      description: '髪にやさしい髪質改善カラー',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'service_treatment_premium',
      salonId: 'salon_votan_001',
      name: 'プレミアム美髪トリートメント',
      category: 'treatment',
      price: 12000,
      duration: 90,
      description: '特別なプレミアム美髪トリートメント',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'service_straight_next',
      salonId: 'salon_votan_001',
      name: '次世代縮毛矯正',
      category: 'straight',
      price: 15000,
      duration: 180,
      description: '最新技術による次世代縮毛矯正',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'service_perm_basic',
      salonId: 'salon_votan_001',
      name: 'パーマ',
      category: 'perm',
      price: 9800,
      duration: 120,
      description: '基本のパーマサービス',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  
  settings: {
    id: 'settings_votan_001',
    salonId: 'salon_votan_001',
    businessHours: {
      monday: { isOpen: false, start: null, end: null },
      tuesday: { isOpen: false, start: null, end: null },
      wednesday: { isOpen: true, start: '09:00', end: '18:00' },
      thursday: { isOpen: true, start: '09:00', end: '18:00' },
      friday: { isOpen: true, start: '09:00', end: '18:00' },
      saturday: { isOpen: true, start: '09:00', end: '18:00' },
      sunday: { isOpen: true, start: '09:00', end: '18:00' }
    },
    bookingSettings: {
      advanceBookingDays: 30,
      cancellationHours: 24,
      reminderHours: 24
    },
    notifications: {
      sms: true,
      email: false,
      push: true
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

/**
 * サロンデータの初期化
 */
async function initializeSalonData() {
  try {
    console.log('美容室VOTANのデータ初期化を開始します...');
    
    // サロン基本情報の投入
    const salonRef = db.collection('salons').doc(VOTAN_SALON_DATA.salon.id);
    await salonRef.set(VOTAN_SALON_DATA.salon);
    console.log('✓ サロン基本情報を投入しました');
    
    // スタッフ情報の投入
    const staffBatch = db.batch();
    VOTAN_SALON_DATA.staff.forEach(staff => {
      const staffRef = db.collection('staff').doc(staff.id);
      staffBatch.set(staffRef, staff);
    });
    await staffBatch.commit();
    console.log(`✓ スタッフ情報${VOTAN_SALON_DATA.staff.length}件を投入しました`);
    
    // サービス情報の投入
    const serviceBatch = db.batch();
    VOTAN_SALON_DATA.services.forEach(service => {
      const serviceRef = db.collection('services').doc(service.id);
      serviceBatch.set(serviceRef, service);
    });
    await serviceBatch.commit();
    console.log(`✓ サービス情報${VOTAN_SALON_DATA.services.length}件を投入しました`);
    
    // 設定情報の投入
    const settingsRef = db.collection('settings').doc(VOTAN_SALON_DATA.settings.id);
    await settingsRef.set(VOTAN_SALON_DATA.settings);
    console.log('✓ 設定情報を投入しました');
    
    console.log('美容室VOTANのデータ初期化が完了しました！');
    return true;
    
  } catch (error) {
    console.error('データ初期化中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * データの存在確認
 */
async function checkExistingData() {
  try {
    const salonDoc = await db.collection('salons').doc(VOTAN_SALON_DATA.salon.id).get();
    return salonDoc.exists;
  } catch (error) {
    console.error('データ確認中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * データのクリア（開発用）
 */
async function clearAllData() {
  try {
    console.log('既存データのクリアを開始します...');
    
    // サロンデータの削除
    await db.collection('salons').doc(VOTAN_SALON_DATA.salon.id).delete();
    
    // スタッフデータの削除
    const staffBatch = db.batch();
    VOTAN_SALON_DATA.staff.forEach(staff => {
      const staffRef = db.collection('staff').doc(staff.id);
      staffBatch.delete(staffRef);
    });
    await staffBatch.commit();
    
    // サービスデータの削除
    const serviceBatch = db.batch();
    VOTAN_SALON_DATA.services.forEach(service => {
      const serviceRef = db.collection('services').doc(service.id);
      serviceBatch.delete(serviceRef);
    });
    await serviceBatch.commit();
    
    // 設定データの削除
    await db.collection('settings').doc(VOTAN_SALON_DATA.settings.id).delete();
    
    console.log('✓ 既存データをクリアしました');
    return true;
    
  } catch (error) {
    console.error('データクリア中にエラーが発生しました:', error);
    return false;
  }
}

module.exports = {
  VOTAN_SALON_DATA,
  initializeSalonData,
  checkExistingData,
  clearAllData
};