import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { animations } from '../styles/design-system';
import TreatmentHistoryCard, { TreatmentRecord } from '../components/customers/TreatmentHistoryCard';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  lineId?: string;
  instagramId?: string;
  visitCount: number;
  lastVisit?: string;
  totalSpent: number;
  notes?: string;
  createdAt: string;
}

// モックデータ
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: '田中花子',
    phone: '090-1234-5678',
    email: 'tanaka@example.com',
    lineId: 'tanaka_line',
    visitCount: 12,
    lastVisit: '2024-11-15',
    totalSpent: 48000,
    notes: 'ショートヘアを好む。カラーは明るめが希望。',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: '佐藤太郎',
    phone: '090-8765-4321',
    email: 'sato@example.com',
    instagramId: 'sato_instagram',
    visitCount: 8,
    lastVisit: '2024-11-10',
    totalSpent: 32000,
    notes: 'ビジネスマン。短時間での施術を希望。',
    createdAt: '2024-03-20',
  },
  {
    id: '3',
    name: '鈴木一郎',
    phone: '090-5555-1111',
    visitCount: 15,
    lastVisit: '2024-11-08',
    totalSpent: 75000,
    notes: 'パーマを定期的に施術。',
    createdAt: '2023-12-10',
  },
];

const mockTreatmentHistory: { [customerId: string]: TreatmentRecord[] } = {
  '1': [
    {
      id: 't1',
      treatmentDate: '2024-11-15T10:00:00Z',
      serviceName: 'カット + カラー',
      staffName: '山田美咲',
      notes: '根元のプリンが気になるとのことで、全体的にカラーリング。明るめのブラウンで仕上げました。',
      customerRequests: '明るめの髪色にしたい。根元が気になる。',
      treatmentPhotos: [
        'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400',
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
      ],
      price: 8000,
      durationMinutes: 120,
      satisfactionRating: 5,
    },
    {
      id: 't2',
      treatmentDate: '2024-10-15T14:00:00Z',
      serviceName: 'カット',
      staffName: '山田美咲',
      notes: 'レイヤーを入れて軽やかな印象に。',
      customerRequests: '毛先を軽くしたい',
      treatmentPhotos: [
        'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400',
      ],
      price: 4000,
      durationMinutes: 60,
      satisfactionRating: 4,
    },
  ],
  '2': [
    {
      id: 't3',
      treatmentDate: '2024-11-10T09:00:00Z',
      serviceName: 'カット',
      staffName: '佐々木次郎',
      notes: 'ビジネススタイルで短時間での仕上げ。',
      customerRequests: '短時間で仕上げてほしい',
      treatmentPhotos: [],
      price: 3500,
      durationMinutes: 30,
      satisfactionRating: 4,
    },
  ],
};

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.includes(searchQuery) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCustomerDetail = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailModalOpen(true);
  };

  const closeCustomerDetail = () => {
    setIsDetailModalOpen(false);
    setSelectedCustomer(null);
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'yyyy年M月d日', { locale: ja });
  };

  const handleAddTreatment = async (treatment: Omit<TreatmentRecord, 'id'>) => {
    console.log('新規施術記録追加:', treatment);
    // 実際の実装では API を呼び出し
  };

  const handleUpdateTreatment = async (id: string, treatment: Partial<TreatmentRecord>) => {
    console.log('施術記録更新:', id, treatment);
    // 実際の実装では API を呼び出し
  };

  const handleDeleteTreatment = async (id: string) => {
    console.log('施術記録削除:', id);
    // 実際の実装では API を呼び出し
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <UserGroupIcon className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">顧客管理</h1>
                <p className="text-gray-600">
                  {filteredCustomers.length}名の顧客を管理中
                </p>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              <span>新規顧客</span>
            </motion.button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 顧客一覧 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* 検索バー */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="顧客を検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* 顧客リスト */}
              <div className="max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer, index) => (
                  <motion.div
                    key={customer.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                    onClick={() => openCustomerDetail(customer)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-800">{customer.name}</h3>
                          <EyeIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                          <span>来店 {customer.visitCount}回</span>
                          <span>{formatCurrency(customer.totalSpent)}</span>
                        </div>
                        {customer.lastVisit && (
                          <div className="text-xs text-gray-500 mt-1">
                            最終来店: {formatDate(customer.lastVisit)}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 統計情報 */}
            <div className="mt-6 grid grid-cols-1 gap-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">総顧客数</p>
                    <p className="text-2xl font-bold text-gray-900">{mockCustomers.length}名</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserGroupIcon className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">今月新規</p>
                    <p className="text-2xl font-bold text-gray-900">8名</p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <PlusIcon className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 顧客詳細 */}
          <div className="lg:col-span-2">
            {selectedCustomer ? (
              <motion.div
                key={selectedCustomer.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={animations.spring.gentle}
                className="space-y-6"
              >
                {/* 顧客基本情報 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 font-bold text-lg">
                            {selectedCustomer.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-800">{selectedCustomer.name}</h2>
                          <p className="text-sm text-gray-600">
                            来店回数: {selectedCustomer.visitCount}回 | 
                            総額: {formatCurrency(selectedCustomer.totalSpent)}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* 連絡先情報 */}
                      <div>
                        <h3 className="font-medium text-gray-800 mb-3">連絡先情報</h3>
                        <div className="space-y-3">
                          {selectedCustomer.phone && (
                            <div className="flex items-center space-x-2">
                              <PhoneIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{selectedCustomer.phone}</span>
                            </div>
                          )}
                          {selectedCustomer.email && (
                            <div className="flex items-center space-x-2">
                              <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">{selectedCustomer.email}</span>
                            </div>
                          )}
                          {selectedCustomer.lineId && (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-green-500 rounded"></div>
                              <span className="text-sm text-gray-600">LINE連携済み</span>
                            </div>
                          )}
                          {selectedCustomer.instagramId && (
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 bg-pink-500 rounded"></div>
                              <span className="text-sm text-gray-600">Instagram連携済み</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 来店情報 */}
                      <div>
                        <h3 className="font-medium text-gray-800 mb-3">来店情報</h3>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              初回来店: {formatDate(selectedCustomer.createdAt)}
                            </span>
                          </div>
                          {selectedCustomer.lastVisit && (
                            <div className="flex items-center space-x-2">
                              <ClockIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                最終来店: {formatDate(selectedCustomer.lastVisit)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* メモ */}
                    {selectedCustomer.notes && (
                      <div className="mt-6">
                        <h3 className="font-medium text-gray-800 mb-2">メモ</h3>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm text-gray-700">{selectedCustomer.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 施術履歴 */}
                <TreatmentHistoryCard
                  customerId={selectedCustomer.id}
                  customerName={selectedCustomer.name}
                  treatmentHistory={mockTreatmentHistory[selectedCustomer.id] || []}
                  onAddTreatment={handleAddTreatment}
                  onUpdateTreatment={handleUpdateTreatment}
                  onDeleteTreatment={handleDeleteTreatment}
                />
              </motion.div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">顧客を選択してください</p>
                <p className="text-sm text-gray-400">
                  左側の一覧から顧客を選択すると詳細情報が表示されます
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}