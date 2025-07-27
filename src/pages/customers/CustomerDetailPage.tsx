import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Calendar, Phone, Mail, FileText, Plus, History } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useCustomer } from '../../hooks/useCustomer';
import { useDeleteCustomer } from '../../hooks/useDeleteCustomer';
import { useTreatmentRecords } from '../../hooks/useTreatmentRecords';
import TreatmentHistoryModal from '../../components/treatments/TreatmentHistoryModal';

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isLoading } = useCustomer(id!);
  const { data: treatmentRecords } = useTreatmentRecords(id!);
  const deleteCustomer = useDeleteCustomer();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showTreatmentModal, setShowTreatmentModal] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteCustomer.mutateAsync(id);
      toast.success('顧客を削除しました');
      navigate('/customers');
    } catch (error) {
      toast.error('顧客の削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-1/4" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-500">顧客が見つかりません</p>
            <Link to="/customers" className="text-blue-600 hover:text-blue-800 mt-4 inline-block">
              顧客一覧に戻る
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Link
              to="/customers"
              className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">顧客詳細</h1>
          </div>
          <div className="flex space-x-2">
            <Link to={`/customers/${id}/edit`}>
              <Button variant="secondary">
                <Edit2 className="h-4 w-4 mr-2" />
                編集
              </Button>
            </Link>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              削除
            </Button>
          </div>
        </div>
      </div>

      {/* 基本情報 */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 text-xl font-medium">
                {customer.name.charAt(0)}
              </span>
            </div>
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-gray-900">{customer.name}</h2>
              <p className="text-sm text-gray-500">顧客ID: {customer.id}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 連絡先情報 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">連絡先情報</h3>
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
            </div>
          </div>

          {/* 来店情報 */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">来店情報</h3>
            <div className="space-y-3">
              <div className="flex items-center text-gray-700">
                <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                <span>来店回数: {customer.visit_count}回</span>
              </div>
              {customer.last_visit_date && (
                <div className="flex items-center text-gray-700">
                  <Calendar className="h-4 w-4 mr-3 text-gray-400" />
                  <span>
                    最終来店日: {new Date(customer.last_visit_date).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 備考・要望・注意事項 */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-500 flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              要望・注意事項
            </h3>
            <button
              onClick={() => {
                // TODO: 要望・注意事項編集モーダルを開く
                toast('要望・注意事項の編集機能は開発中です');
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              編集
            </button>
          </div>
          
          <div className="space-y-4">
            {/* 基本的な備考 */}
            {customer.notes && (
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="text-xs font-medium text-gray-700 mb-1">基本情報</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
            
            {/* アレルギー・注意事項（モックデータ） */}
            <div className="bg-red-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-red-700 mb-1">アレルギー・注意事項</h4>
              <div className="space-y-1">
                <p className="text-sm text-red-600">• カラー剤アレルギーあり（パッチテスト必須）</p>
                <p className="text-sm text-red-600">• 首が敏感なため、シャンプー時は注意</p>
              </div>
            </div>
            
            {/* お客様の好み */}
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-blue-700 mb-1">好み・要望</h4>
              <div className="space-y-1">
                <p className="text-sm text-blue-600">• ナチュラルなスタイルを好む</p>
                <p className="text-sm text-blue-600">• あまり短くしたくない</p>
                <p className="text-sm text-blue-600">• セット時間は短めを希望</p>
              </div>
            </div>
            
            {/* 来店パターン */}
            <div className="bg-green-50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-green-700 mb-1">来店パターン</h4>
              <div className="space-y-1">
                <p className="text-sm text-green-600">• 2ヶ月に1回程度のペース</p>
                <p className="text-sm text-green-600">• 土日の午後を好む</p>
                <p className="text-sm text-green-600">• 予約変更が多い</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 施術履歴 */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <History className="h-5 w-5 mr-2" />
            施術履歴
          </h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowTreatmentModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            施術記録を追加
          </Button>
        </div>

        {treatmentRecords && treatmentRecords.length > 0 ? (
          <div className="space-y-4">
            {treatmentRecords.slice(0, 3).map((record) => (
              <div
                key={record.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{record.menu_name}</h4>
                      <span className="text-sm text-gray-500">
                        {new Date(record.date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      料金: ¥{record.price.toLocaleString()} | 施術時間: {record.duration_minutes}分
                    </div>
                    {record.notes && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">お客様メモ:</span> {record.notes}
                      </p>
                    )}
                    {record.staff_notes && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">スタッフメモ:</span> {record.staff_notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {treatmentRecords.length > 3 && (
              <div className="text-center">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  全ての履歴を表示 ({treatmentRecords.length}件)
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">まだ施術履歴がありません</p>
            <Button
              variant="secondary"
              onClick={() => setShowTreatmentModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              最初の施術記録を追加
            </Button>
          </div>
        )}
      </Card>

      {/* 削除確認ダイアログ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              顧客を削除しますか？
            </h3>
            <p className="text-gray-500 mb-6">
              この操作は取り消せません。{customer.name}さんの情報が完全に削除されます。
            </p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 施術記録追加モーダル */}
      <TreatmentHistoryModal
        isOpen={showTreatmentModal}
        onClose={() => setShowTreatmentModal(false)}
        customerId={id!}
        customerName={customer?.name || ''}
      />
    </div>
  );
};

export default CustomerDetailPage;