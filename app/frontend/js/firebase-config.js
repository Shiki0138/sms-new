// Firebase フロントエンド設定
const firebaseConfig = {
  apiKey: "AIzaSyCZukwkWlqkaO46LlF865cyg_7TVpusvWY",
  authDomain: "salon-system-138.firebaseapp.com",
  projectId: "salon-system-138",
  storageBucket: "salon-system-138.appspot.com",
  messagingSenderId: "167894754021",
  appId: "1:167894754021:web:0bf348fc7a1787137dea0c"
};

// Firebase初期化（フロントエンド用）
if (typeof firebase !== 'undefined') {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  // Firestore初期化
  const db = firebase.firestore();
  
  // 認証初期化
  const auth = firebase.auth();
  
  console.log('Firebase フロントエンド初期化完了');
  
  // グローバル参照
  window.firebaseDb = db;
  window.firebaseAuth = auth;
}

// 顧客データ取得（Firebase接続版）
async function getCustomerData(customerId) {
  try {
    if (window.firebaseDb) {
      const doc = await window.firebaseDb.collection('customers').doc(customerId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    }
    
    // フォールバック: ローカルデータ
    return getLocalCustomerData(customerId);
  } catch (error) {
    console.error('Firebase顧客データ取得エラー:', error);
    return getLocalCustomerData(customerId);
  }
}

// カルテデータ取得（Firebase接続版）
async function getMedicalRecord(customerId) {
  try {
    if (window.firebaseDb) {
      const snapshot = await window.firebaseDb
        .collection('medical_records')
        .where('customerId', '==', customerId)
        .orderBy('createdAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    
    // フォールバック: ローカルデータ
    return getLocalMedicalRecord(customerId);
  } catch (error) {
    console.error('Firebase医療記録取得エラー:', error);
    return getLocalMedicalRecord(customerId);
  }
}

// ローカル データフォールバック
function getLocalCustomerData(customerId) {
  const customers = {
    '1': { id: '1', name: '山田花子', phone: '090-1234-5678', email: 'yamada@email.com' },
    '2': { id: '2', name: '佐藤美咲', phone: '080-9876-5432', email: 'sato@email.com' }
  };
  return customers[customerId] || null;
}

function getLocalMedicalRecord(customerId) {
  const records = {
    '1': [
      {
        date: '2024-03-10',
        service: 'カット+カラー',
        notes: '前髪短めに。8トーンアッシュブラウン。',
        staff: '田中',
        photos: 2,
        allergies: 'ジアミン系アレルギーあり',
        warnings: '敏感肌、パッチテスト必須'
      }
    ]
  };
  return records[customerId] || [];
}