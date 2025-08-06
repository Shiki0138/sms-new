import React, { useState } from 'react';
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  User,
  Calendar,
  Eye,
  Edit,
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import { useCustomers } from '../../hooks/useCustomers';
import CustomerForm from '../../components/customers/CustomerForm';

// 詳細なモックデータ
const mockCustomers = [
  {
    id: '1',
    name: '山田花子',
    phone_number: '090-1234-5678',
    email: 'yamada@example.com',
    notes:
      '髪が細いため、優しい施術を希望。カラー剤アレルギーあり（パッチテスト必須）',
    visit_count: 5,
    last_visit_date: '2024-01-15',
    created_at: '2024-01-01',
    gender: 'female',
    birth_date: '1985-03-15',
    address: '東京都渋谷区',
    preferred_contact_method: 'phone',
    total_spent: 42500,
    avg_visit_interval: 45, // 日数
    treatment_history: [
      {
        id: 't1',
        date: '2024-01-15',
        menu_name: 'カット & カラー',
        price: 8500,
        duration_minutes: 120,
        staff_name: '田中美容師',
        notes: '根元のリタッチ。アッシュブラウン系希望',
        staff_notes: 'パッチテスト実施済み。次回もリタッチでOK',
        before_photo:
          'https://via.placeholder.com/150x200/E5E7EB/9CA3AF?text=Before',
        after_photo:
          'https://via.placeholder.com/150x200/F3F4F6/6B7280?text=After',
        satisfaction_rating: 5,
      },
      {
        id: 't2',
        date: '2023-11-30',
        menu_name: 'カット & トリートメント',
        price: 6500,
        duration_minutes: 90,
        staff_name: '田中美容師',
        notes: '毛先の傷みが気になる',
        staff_notes: 'ダメージが進行。次回はカラーの頻度を減らすことを提案',
        before_photo:
          'https://via.placeholder.com/150x200/E5E7EB/9CA3AF?text=Before2',
        after_photo:
          'https://via.placeholder.com/150x200/F3F4F6/6B7280?text=After2',
        satisfaction_rating: 4,
      },
    ],
    allergies: ['カラー剤（アンモニア系）', 'パーマ液'],
    preferences: ['ショートヘア', 'ナチュラルメイク', '静かな環境'],
    visit_pattern: '月1〜2回の定期来店。土曜日の午前中が多い',
  },
  {
    id: '2',
    name: '鈴木美咲',
    phone_number: '080-9876-5432',
    email: 'suzuki@example.com',
    notes: '会話を楽しみながらの施術を希望。SNS投稿OK',
    visit_count: 12,
    last_visit_date: '2024-01-18',
    created_at: '2023-08-15',
    gender: 'female',
    birth_date: '1990-07-22',
    address: '東京都世田谷区',
    preferred_contact_method: 'line',
    total_spent: 78000,
    avg_visit_interval: 30,
    treatment_history: [],
    allergies: [],
    preferences: ['ロングヘア', 'トレンドスタイル', 'おしゃべり好き'],
    visit_pattern: '月1回の定期来店。平日夕方が多い',
  },
  {
    id: '3',
    name: '田中太郎',
    phone_number: '090-1111-2222',
    email: 'tanaka@example.com',
    notes: '短時間での施術希望。仕事の話は避けてほしい',
    visit_count: 8,
    last_visit_date: '2024-01-10',
    created_at: '2023-10-01',
    gender: 'male',
    birth_date: '1978-12-05',
    address: '東京都新宿区',
    preferred_contact_method: 'email',
    total_spent: 36000,
    avg_visit_interval: 45,
    treatment_history: [],
    allergies: [],
    preferences: ['ビジネススタイル', '短時間施術', '静かな環境'],
    visit_pattern: '1.5ヶ月に1回。土曜日午後が多い',
  },
];

// インターフェース定義
interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email: string;
  notes: string;
  visit_count: number;
  last_visit_date: string;
  created_at: string;
  gender: string;
  birth_date: string;
  address: string;
  preferred_contact_method: string;
  total_spent: number;
  avg_visit_interval: number;
  treatment_history: TreatmentHistory[];
  allergies: string[];
  preferences: string[];
  visit_pattern: string;
}

interface TreatmentHistory {
  id: string;
  date: string;
  menu_name: string;
  price: number;
  duration_minutes: number;
  staff_name: string;
  notes: string;
  staff_notes: string;
  before_photo: string;
  after_photo: string;
  satisfaction_rating: number;
}

const CustomersPageAdvanced: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { createCustomer } = useCustomers(searchTerm);

  // フィルタリングされた顧客リスト
  const filteredCustomers = mockCustomers.filter(
    (customer) =>
      customer.name.includes(searchTerm) ||
      customer.phone_number.includes(searchTerm) ||
      customer.email.includes(searchTerm)
  );

  // 顧客詳細モーダルコンポーネント
  const CustomerDetailModal = ({
    customer,
    onClose,
  }: {
    customer: Customer;
    onClose: () => void;
  }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {customer.name.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {customer.name}
                </h2>
                <p className="text-gray-500">
                  顧客ID: {customer.id} | 来店回数: {customer.visit_count}回
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* 基本情報 */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                基本情報
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center text-gray-700">
                    <Phone className="h-4 w-4 mr-3 text-gray-400" />
                    <span>{customer.phone_number}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center text-gray-700">
                      <Mail className="h-4 w-4 mr-3 text-gray-400" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center text-gray-700">
                      <span className="text-gray-400 mr-3">🏠</span>
                      <span>{customer.address}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="text-gray-700">
                    <span className="font-medium">総利用金額:</span> ¥
                    {customer.total_spent.toLocaleString()}
                  </div>
                  <div className="text-gray-700">
                    <span className="font-medium">平均来店間隔:</span>{' '}
                    {customer.avg_visit_interval}日
                  </div>
                  <div className="text-gray-700">
                    <span className="font-medium">最終来店:</span>{' '}
                    {new Date(customer.last_visit_date).toLocaleDateString(
                      'ja-JP'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* アレルギー・注意事項 */}
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                アレルギー・注意事項
              </h3>
              <div className="space-y-4">
                {customer.allergies.length > 0 && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-medium text-red-700 mb-2">
                      ⚠️ アレルギー
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {customer.allergies.map(
                        (allergy: string, index: number) => (
                          <span
                            key={index}
                            className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm"
                          >
                            {allergy}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 mb-2">
                    💝 お客様の好み・要望
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {customer.preferences.map((pref: string, index: number) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-700 mb-2">
                    📅 来店パターン
                  </h4>
                  <p className="text-green-800 text-sm">
                    {customer.visit_pattern}
                  </p>
                </div>

                {customer.notes && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">📝 備考</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">
                      {customer.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 施術履歴 */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                施術履歴
              </h3>
              <div className="space-y-4">
                {customer.treatment_history.map((treatment) => (
                  <div
                    key={treatment.id}
                    className="border-l-4 border-purple-400 pl-4 py-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {treatment.menu_name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {new Date(treatment.date).toLocaleDateString('ja-JP')}{' '}
                          •{treatment.staff_name} • ¥
                          {treatment.price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-lg ${
                              i < treatment.satisfaction_rating
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 写真 */}
                    {(treatment.before_photo || treatment.after_photo) && (
                      <div className="mt-3 flex space-x-4">
                        {treatment.before_photo && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Before</p>
                            <img
                              src={treatment.before_photo}
                              alt="Before"
                              className="w-32 h-40 object-cover rounded-lg"
                            />
                          </div>
                        )}
                        {treatment.after_photo && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">After</p>
                            <img
                              src={treatment.after_photo}
                              alt="After"
                              className="w-32 h-40 object-cover rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* メモ */}
                    <div className="mt-3 space-y-2">
                      {treatment.notes && (
                        <div className="bg-blue-50 rounded-lg p-3">
                          <h5 className="text-sm font-medium text-blue-700 mb-1">
                            👁 お客様の要望
                          </h5>
                          <p className="text-sm text-blue-800">
                            {treatment.notes}
                          </p>
                        </div>
                      )}
                      {treatment.staff_notes && (
                        <div className="bg-purple-50 rounded-lg p-3">
                          <h5 className="text-sm font-medium text-purple-700 mb-1">
                            📋 スタッフメモ
                          </h5>
                          <p className="text-sm text-purple-800">
                            {treatment.staff_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={onClose}>
              閉じる
            </Button>
            <Button
              onClick={() => alert(`${customer.name}さんの編集画面（デモ版）`)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Edit className="h-4 w-4 mr-2" />
              編集
            </Button>
            <Button
              onClick={() =>
                alert(`${customer.name}さんの新規予約作成（デモ版）`)
              }
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Calendar className="h-4 w-4 mr-2" />
              予約作成
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
            <p className="mt-1 text-sm text-gray-600">
              登録顧客数: {mockCustomers.length} / 100名 | 総売上: ¥
              {mockCustomers
                .reduce((sum, c) => sum + c.total_spent, 0)
                .toLocaleString()}
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <Button
              onClick={() => setShowCreateForm(true)}
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
          description={
            searchTerm
              ? '検索条件に該当する顧客がいません'
              : 'まだ顧客が登録されていません'
          }
          action={
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新規顧客登録
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {customer.name}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>来店: {customer.visit_count}回</span>
                      <span>•</span>
                      <span>¥{customer.total_spent.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
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
                      <span>
                        最終来店:{' '}
                        {new Date(customer.last_visit_date).toLocaleDateString(
                          'ja-JP'
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* アレルギー警告 */}
                {customer.allergies.length > 0 && (
                  <div className="mb-3 p-2 bg-red-50 rounded-md">
                    <div className="flex items-center">
                      <span className="text-red-600 text-sm font-medium">
                        ⚠️ アレルギー:{' '}
                      </span>
                      <span className="text-red-700 text-xs ml-1">
                        {customer.allergies.join(', ')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowDetailModal(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    詳細
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      alert(`${customer.name}さんの編集（デモ版）`)
                    }
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    編集
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* 統計情報 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {mockCustomers.length}
            </div>
            <div className="text-sm text-gray-600">総顧客数</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {mockCustomers.filter((c) => c.visit_count >= 5).length}
            </div>
            <div className="text-sm text-gray-600">リピーター</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              ¥
              {Math.round(
                mockCustomers.reduce((sum, c) => sum + c.total_spent, 0) /
                  mockCustomers.length
              ).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">平均利用額</div>
          </div>
        </Card>
        <Card>
          <div className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {
                mockCustomers.filter(
                  (c) =>
                    new Date(c.last_visit_date) >
                    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                ).length
              }
            </div>
            <div className="text-sm text-gray-600">今月の来店</div>
          </div>
        </Card>
      </div>

      {/* 顧客詳細モーダル */}
      {showDetailModal && selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}

      {/* 新規顧客登録フォーム */}
      {showCreateForm && (
        <CustomerForm
          onSubmit={(data) => {
            createCustomer.mutate(data, {
              onSuccess: () => {
                setShowCreateForm(false);
              },
            });
          }}
          onCancel={() => setShowCreateForm(false)}
          isLoading={createCustomer.isPending}
        />
      )}
    </div>
  );
};

export default CustomersPageAdvanced;
