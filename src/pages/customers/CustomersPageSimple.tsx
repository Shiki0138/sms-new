import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Phone, Mail, User, Calendar } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';

// モックデータ
const mockCustomers = [
  {
    id: '1',
    name: '山田花子',
    phone_number: '090-1234-5678',
    email: 'yamada@example.com',
    notes: '髪が細いため、優しい施術を希望',
    visit_count: 5,
    last_visit_date: '2024-01-15',
    created_at: '2024-01-01',
  },
  {
    id: '2',
    name: '佐藤太郎',
    phone_number: '080-9876-5432',
    email: 'sato@example.com',
    notes: '',
    visit_count: 3,
    last_visit_date: '2024-01-20',
    created_at: '2024-01-05',
  },
  {
    id: '3',
    name: '鈴木美咲',
    phone_number: '070-5555-1234',
    email: '',
    notes: 'カラーアレルギーあり',
    visit_count: 8,
    last_visit_date: '2024-01-22',
    created_at: '2023-12-15',
  },
  {
    id: '4',
    name: '田中一郎',
    phone_number: '090-9999-0000',
    email: 'tanaka@example.com',
    notes: '短時間での施術を希望',
    visit_count: 12,
    last_visit_date: '2024-01-25',
    created_at: '2023-10-10',
  },
  {
    id: '5',
    name: '高橋みどり',
    phone_number: '080-1111-2222',
    email: 'takahashi@example.com',
    notes: '敏感肌',
    visit_count: 7,
    last_visit_date: '2024-01-18',
    created_at: '2023-11-20',
  },
];

const CustomersPageSimple: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // フィルタリングされた顧客リスト
  const filteredCustomers = mockCustomers.filter(customer =>
    customer.name.includes(searchTerm) ||
    customer.phone_number.includes(searchTerm) ||
    customer.email.includes(searchTerm)
  );

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              登録顧客数: {mockCustomers.length} / 100名
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button 
              onClick={() => alert('新規顧客登録機能（デモ版）')}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              新規顧客登録
            </Button>
          </div>
        </div>
      </div>

      {/* 検索バー */}
      <Card className="mb-6" padding="sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="顧客名、電話番号、メールアドレスで検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* 顧客リスト */}
      {filteredCustomers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="顧客が見つかりません"
          description={searchTerm ? "検索条件に該当する顧客がいません" : "まだ顧客が登録されていません"}
          action={
            <Button onClick={() => alert('新規顧客登録機能（デモ版）')}>
              <Plus className="h-4 w-4 mr-2" />
              新規顧客登録
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {customer.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      来店回数: {customer.visit_count}回
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {customer.phone_number && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{customer.phone_number}</span>
                    </div>
                  )}
                  
                  {customer.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  
                  {customer.last_visit_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>最終来店: {new Date(customer.last_visit_date).toLocaleDateString('ja-JP')}</span>
                    </div>
                  )}
                </div>

                {customer.notes && (
                  <div className="mt-3 p-2 bg-gray-50 rounded-md">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {customer.notes}
                    </p>
                  </div>
                )}

                <div className="mt-4 flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => alert(`${customer.name}の詳細表示（デモ版）`)}
                  >
                    詳細
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => alert(`${customer.name}の編集（デモ版）`)}
                  >
                    編集
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 統計情報 */}
      <Card className="mt-6">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">顧客統計</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{mockCustomers.length}</div>
              <div className="text-sm text-gray-600">総顧客数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {mockCustomers.filter(c => c.visit_count >= 5).length}
              </div>
              <div className="text-sm text-gray-600">リピーター</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(mockCustomers.reduce((sum, c) => sum + c.visit_count, 0) / mockCustomers.length)}
              </div>
              <div className="text-sm text-gray-600">平均来店回数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {mockCustomers.filter(c => new Date(c.last_visit_date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
              </div>
              <div className="text-sm text-gray-600">今月の来店</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomersPageSimple;