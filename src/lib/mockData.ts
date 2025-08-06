// デモ用のモックデータ

export const mockCustomers = [
  {
    id: '1',
    name: '田中 太郎',
    phone_number: '090-1234-5678',
    email: 'tanaka@example.com',
    visit_count: 12,
    last_visit_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    name: '鈴木 花子',
    phone_number: '080-2345-6789',
    email: 'suzuki@example.com',
    visit_count: 8,
    last_visit_date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    name: '佐藤 美咲',
    phone_number: '070-3456-7890',
    email: 'sato@example.com',
    visit_count: 15,
    last_visit_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockReservations = [
  {
    id: '1',
    customer_id: '1',
    customer: mockCustomers[0],
    start_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    menu_content: 'カット + カラー',
    status: 'CONFIRMED',
    price: 8500,
  },
  {
    id: '2',
    customer_id: '2',
    customer: mockCustomers[1],
    start_time: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    end_time: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
    menu_content: 'パーマ',
    status: 'TENTATIVE',
    price: 12000,
  },
];

export const mockSales = [
  {
    id: '1',
    customer_id: '1',
    reservation_id: '1',
    amount: 8500,
    payment_method: 'cash',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    customer_id: '2',
    reservation_id: '2',
    amount: 12000,
    payment_method: 'card',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockPlanUsage = {
  customer_count: 45,
  reservation_count: 120,
};