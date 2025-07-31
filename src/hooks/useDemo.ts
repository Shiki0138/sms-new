import { useState, useCallback } from 'react';
import { toast } from 'sonner';

// デモデータ生成用のヘルパー関数
const generateDemoCustomers = () => {
  const firstNames = ['田中', '佐藤', '鈴木', '高橋', '渡辺', '伊藤', '山本', '中村', '小林', '加藤'];
  const givenNames = ['花子', '美咲', '由美', '恵子', '愛子', '裕子', '智子', '和子', '幸子', '陽子'];
  
  return Array.from({ length: 15 }, (_, i) => ({
    id: `demo-customer-${i + 1}`,
    name: `${firstNames[i % firstNames.length]} ${givenNames[i % givenNames.length]}`,
    email: `customer${i + 1}@example.com`,
    phone: `090-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    last_visit: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    total_visits: Math.floor(Math.random() * 20) + 1,
    notes: ['カラー希望', 'パーマ注意', '肌が弱い', '予約変更多い'][Math.floor(Math.random() * 4)],
  }));
};

const generateDemoReservations = () => {
  const customers = generateDemoCustomers();
  const menus = [
    { name: 'カット', price: 3500, duration: 60 },
    { name: 'カット&カラー', price: 8500, duration: 120 },
    { name: 'パーマ', price: 7000, duration: 150 },
    { name: 'トリートメント', price: 4000, duration: 45 },
    { name: 'ヘッドスパ', price: 3000, duration: 30 },
  ];

  const reservations = [];
  const today = new Date();
  
  // 今週の予約を生成
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    
    const reservationsPerDay = Math.floor(Math.random() * 5) + 3;
    
    for (let r = 0; r < reservationsPerDay; r++) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const menu = menus[Math.floor(Math.random() * menus.length)];
      const hour = 9 + Math.floor(Math.random() * 9); // 9:00-17:00
      
      reservations.push({
        id: `demo-reservation-${reservations.length + 1}`,
        customer_id: customer.id,
        customer_name: customer.name,
        date: date.toISOString().split('T')[0],
        time: `${hour.toString().padStart(2, '0')}:${['00', '30'][Math.floor(Math.random() * 2)]}`,
        menu: menu.name,
        price: menu.price,
        duration: menu.duration,
        status: ['confirmed', 'pending', 'completed'][Math.floor(Math.random() * 3)],
      });
    }
  }
  
  return reservations;
};

const generateDemoMessages = () => {
  const customers = generateDemoCustomers();
  const messages = [
    '予約の確認をお願いします。',
    '明日の予約時間を変更できますか？',
    'カラーの色味について相談したいです。',
    'ありがとうございました！とても満足です。',
    '次回の予約はいつ頃が空いていますか？',
  ];
  
  return Array.from({ length: 10 }, (_, i) => {
    const customer = customers[Math.floor(Math.random() * customers.length)];
    return {
      id: `demo-message-${i + 1}`,
      customer_id: customer.id,
      customer_name: customer.name,
      channel: ['line', 'instagram', 'email'][Math.floor(Math.random() * 3)],
      message: messages[Math.floor(Math.random() * messages.length)],
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_read: Math.random() > 0.3,
    };
  });
};

export function useDemo() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoData, setDemoData] = useState<{
    customers: any[];
    reservations: any[];
    messages: any[];
  }>({
    customers: [],
    reservations: [],
    messages: [],
  });

  const initializeDemo = useCallback(() => {
    setIsDemoMode(true);
    const data = {
      customers: generateDemoCustomers(),
      reservations: generateDemoReservations(),
      messages: generateDemoMessages(),
    };
    setDemoData(data);
    
    toast.success('デモデータを読み込みました', {
      description: 'サンプルデータで機能をお試しいただけます',
      duration: 5000,
    });
  }, []);

  const exitDemo = useCallback(() => {
    setIsDemoMode(false);
    setDemoData({
      customers: [],
      reservations: [],
      messages: [],
    });
    
    toast.info('デモモードを終了しました');
  }, []);

  const addDemoReservation = useCallback((reservation: any) => {
    setDemoData(prev => ({
      ...prev,
      reservations: [...prev.reservations, {
        ...reservation,
        id: `demo-reservation-${Date.now()}`,
      }],
    }));
    
    toast.success('予約を追加しました（デモ）');
  }, []);

  const addDemoCustomer = useCallback((customer: any) => {
    setDemoData(prev => ({
      ...prev,
      customers: [...prev.customers, {
        ...customer,
        id: `demo-customer-${Date.now()}`,
      }],
    }));
    
    toast.success('顧客を追加しました（デモ）');
  }, []);

  const sendDemoMessage = useCallback((message: any) => {
    setDemoData(prev => ({
      ...prev,
      messages: [...prev.messages, {
        ...message,
        id: `demo-message-${Date.now()}`,
        timestamp: new Date().toISOString(),
      }],
    }));
    
    toast.success('メッセージを送信しました（デモ）');
  }, []);

  return {
    isDemoMode,
    demoData,
    initializeDemo,
    exitDemo,
    addDemoReservation,
    addDemoCustomer,
    sendDemoMessage,
  };
}