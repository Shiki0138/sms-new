import { useState } from 'react';

interface DemoData {
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string;
    created_at: string;
  }[];
  reservations: {
    id: string;
    customer: {
      id: string;
      name: string;
      email: string;
      phone: string;
      created_at: string;
    };
    date: string;
    start_time: string;
    menu_content: string;
    price: number;
    status: string;
  }[];
  messages: unknown[];
}

export const useDemo = () => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoData, setDemoData] = useState<DemoData>({
    customers: [],
    reservations: [],
    messages: [],
  });

  const initializeDemo = () => {
    try {
      setIsDemoMode(true);

      // Generate demo data
      const customers = Array.from({ length: 5 }, (_, i) => ({
        id: `demo-customer-${i}`,
        name: `デモ顧客 ${i + 1}`,
        email: `demo${i + 1}@example.com`,
        phone: `090-1234-${String(5000 + i).padStart(4, '0')}`,
        created_at: new Date().toISOString(),
      }));

      const today = new Date();
      const reservations = Array.from({ length: 3 }, (_, i) => ({
        id: `demo-reservation-${i}`,
        customer: customers[i],
        date: today.toISOString().split('T')[0],
        start_time: new Date(
          today.getTime() + i * 2 * 60 * 60 * 1000
        ).toISOString(),
        menu_content: ['カット', 'カラー', 'パーマ'][i],
        price: [5000, 8000, 12000][i],
        status: 'confirmed',
      }));

      setDemoData({
        customers,
        reservations,
        messages: [],
      });
    } catch (error) {
      console.error('Failed to initialize demo:', error);
    }
  };

  const exitDemo = () => {
    setIsDemoMode(false);
    setDemoData({
      customers: [],
      reservations: [],
      messages: [],
    });
  };

  return {
    isDemoMode,
    demoData,
    initializeDemo,
    exitDemo,
  };
};
