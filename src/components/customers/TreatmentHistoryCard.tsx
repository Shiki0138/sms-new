import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhotoIcon,
  PencilIcon,
  StarIcon,
  ClockIcon,
  CurrencyYenIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrashIcon,
  PlusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { animations } from '../../styles/design-system';
import TreatmentHistoryDetailModal from './TreatmentHistoryDetailModal';

export interface TreatmentRecord {
  id: string;
  treatmentDate: string;
  serviceName: string;
  staffName?: string;
  notes?: string;
  customerRequests?: string;
  treatmentPhotos: string[]; // 最大3枚
  price?: number;
  durationMinutes?: number;
  satisfactionRating?: number; // 1-5
}

interface TreatmentHistoryCardProps {
  customerId: string;
  customerName: string;
  treatmentHistory: TreatmentRecord[];
  onAddTreatment?: (treatment: Omit<TreatmentRecord, 'id'>) => void;
  onUpdateTreatment?: (id: string, treatment: Partial<TreatmentRecord>) => void;
  onDeleteTreatment?: (id: string) => void;
  className?: string;
}

export default function TreatmentHistoryCard({
  customerId,
  customerName,
  treatmentHistory,
  onAddTreatment,
  onUpdateTreatment,
  onDeleteTreatment,
  className = '',
}: TreatmentHistoryCardProps) {
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [isAddingTreatment, setIsAddingTreatment] = useState(false);
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const toggleExpanded = (recordId: string) => {
    const newExpanded = new Set(expandedRecords);
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId);
    } else {
      newExpanded.add(recordId);
    }
    setExpandedRecords(newExpanded);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}時間${mins > 0 ? `${mins}分` : ''}`;
    }
    return `${mins}分`;
  };

  const renderStars = (rating?: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = rating && rating >= star;
          const StarComponent = isFilled ? StarIconSolid : StarIcon;
          
          return (
            <motion.button
              key={star}
              whileHover={interactive ? { scale: 1.1 } : {}}
              whileTap={interactive ? { scale: 0.9 } : {}}
              onClick={() => interactive && onRate?.(star)}
              disabled={!interactive}
              className={`h-4 w-4 ${
                isFilled ? 'text-yellow-400' : 'text-gray-300'
              } ${interactive ? 'cursor-pointer hover:text-yellow-300' : ''}`}
            >
              <StarComponent className="h-4 w-4" />
            </motion.button>
          );
        })}
        {rating && <span className="text-xs text-gray-600 ml-2">({rating}/5)</span>}
      </div>
    );
  };

  const openDetailModal = (treatment: TreatmentRecord) => {
    setSelectedTreatment(treatment);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedTreatment(null);
  };

  const navigateToTreatment = (direction: 'prev' | 'next') => {
    if (!selectedTreatment) return;
    
    const currentIndex = treatmentHistory.findIndex(t => t.id === selectedTreatment.id);
    let newIndex = -1;
    
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < treatmentHistory.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex >= 0) {
      setSelectedTreatment(treatmentHistory[newIndex]);
    }
  };

  const renderPhotoGallery = (photos: string[], isEditing = false, onPhotosChange?: (photos: string[]) => void) => {
    const maxPhotos = 3;
    
    return (
      <div className="grid grid-cols-3 gap-2">
        {photos.slice(0, maxPhotos).map((photo, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1, ...animations.spring.gentle }}
            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
          >
            <img
              src={photo}
              alt={`施術写真 ${index + 1}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                // 画像読み込みエラー時のフォールバック
                const target = e.target as HTMLImageElement;
                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMTAwIDcwQzEwNS41MjMgNzAgMTEwIDc0LjQ3NyAxMTAgODBDMTEwIDg1LjUyMyAxMDUuNTIzIDkwIDEwMCA5MEM5NC40NzcgOTAgOTAgODUuNTIzIDkwIDgwQzkwIDc0LjQ3NyA5NC40NzcgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTNBRiIvPjxwYXRoIGQ9Ik0xNzAgMTMwTDE0MCAuMEwxMzAgMTAwTDcwIDEzMEwzMCAxNzBIMTcwVjEzMFoiIGZpbGw9IiM5Q0EzQUYiLz48L3N2Zz4K';
              }}
            />
            {isEditing && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const newPhotos = photos.filter((_, i) => i !== index);
                  onPhotosChange?.(newPhotos);
                }}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TrashIcon className="h-3 w-3" />
              </motion.button>
            )}
          </motion.div>
        ))}
        
        {/* 写真追加ボタン（編集時かつ3枚未満の場合） */}
        {isEditing && photos.length < maxPhotos && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              // 実際の実装では画像アップロード処理
              const newPhoto = 'https://via.placeholder.com/150x150/e5e7eb/9ca3af?text=NEW';
              onPhotosChange?.([...photos, newPhoto]);
            }}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            <div className="text-center">
              <PhotoIcon className="h-6 w-6 text-gray-400 mx-auto mb-1" />
              <span className="text-xs text-gray-500">写真追加</span>
            </div>
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <ClockIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">施術履歴</h3>
              <p className="text-sm text-gray-600">
                {customerName}さんの過去の施術記録 ({treatmentHistory.length}件)
              </p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsAddingTreatment(true)}
            className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>新規記録</span>
          </motion.button>
        </div>
      </div>

      {/* 履歴一覧 */}
      <div className="p-6">
        {treatmentHistory.length === 0 ? (
          <div className="text-center py-12">
            <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">まだ施術履歴がありません</p>
            <p className="text-sm text-gray-400">初回施術後に記録を追加してください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {treatmentHistory.map((record, index) => {
              const isExpanded = expandedRecords.has(record.id);
              const isEditing = editingRecord === record.id;

              return (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* 施術記録ヘッダー */}
                  <div 
                    className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => openDetailModal(record)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary-600">
                            {formatDate(record.treatmentDate).split(' ')[1]} {/* 日付のみ */}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDate(record.treatmentDate).split(' ')[0]} {/* 年月 */}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-800">{record.serviceName}</h4>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              className="p-1 text-primary-600 hover:text-primary-700"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </motion.div>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            {record.staffName && (
                              <span>👤 {record.staffName}</span>
                            )}
                            {record.price && (
                              <span className="flex items-center">
                                <CurrencyYenIcon className="h-4 w-4 mr-1" />
                                {record.price.toLocaleString()}
                              </span>
                            )}
                            {record.durationMinutes && (
                              <span>⏱️ {formatDuration(record.durationMinutes)}</span>
                            )}
                          </div>
                          {record.satisfactionRating && (
                            <div className="mt-2">
                              {renderStars(record.satisfactionRating)}
                            </div>
                          )}
                          {record.treatmentPhotos.length > 0 && (
                            <div className="mt-2 flex items-center space-x-1 text-xs text-gray-500">
                              <PhotoIcon className="h-3 w-3" />
                              <span>{record.treatmentPhotos.length}枚の写真</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditingRecord(isEditing ? null : record.id)}
                          className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                          title="編集"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleExpanded(record.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title={isExpanded ? "詳細を閉じる" : "詳細を開く"}
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="h-4 w-4" />
                          )}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* 展開可能な詳細情報 */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={animations.spring.gentle}
                        className="overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* 施術写真 */}
                          {record.treatmentPhotos.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">施術写真</h5>
                              {renderPhotoGallery(
                                record.treatmentPhotos,
                                isEditing,
                                (photos) => onUpdateTreatment?.(record.id, { treatmentPhotos: photos })
                              )}
                            </div>
                          )}

                          {/* 施術メモ */}
                          {(record.notes || isEditing) && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">施術メモ</h5>
                              {isEditing ? (
                                <textarea
                                  value={record.notes || ''}
                                  onChange={(e) => onUpdateTreatment?.(record.id, { notes: e.target.value })}
                                  placeholder="施術時の気づきや特記事項を入力..."
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                  rows={3}
                                />
                              ) : (
                                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{record.notes}</p>
                              )}
                            </div>
                          )}

                          {/* お客様の要望 */}
                          {(record.customerRequests || isEditing) && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">お客様のご要望</h5>
                              {isEditing ? (
                                <textarea
                                  value={record.customerRequests || ''}
                                  onChange={(e) => onUpdateTreatment?.(record.id, { customerRequests: e.target.value })}
                                  placeholder="お客様からのご要望やリクエストを記録..."
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                                  rows={2}
                                />
                              ) : (
                                <p className="text-gray-600 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-300">
                                  💬 {record.customerRequests}
                                </p>
                              )}
                            </div>
                          )}

                          {/* 満足度評価（編集時） */}
                          {isEditing && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-2">満足度評価</h5>
                              {renderStars(
                                record.satisfactionRating,
                                true,
                                (rating) => onUpdateTreatment?.(record.id, { satisfactionRating: rating })
                              )}
                            </div>
                          )}

                          {/* 編集時のアクションボタン */}
                          {isEditing && (
                            <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setEditingRecord(null)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                              >
                                キャンセル
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setEditingRecord(null)}
                                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium"
                              >
                                保存
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* 施術履歴詳細モーダル */}
      {selectedTreatment && (
        <TreatmentHistoryDetailModal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          treatment={selectedTreatment}
          customerName={customerName}
          onPrevious={() => navigateToTreatment('prev')}
          onNext={() => navigateToTreatment('next')}
          hasPrevious={treatmentHistory.findIndex(t => t.id === selectedTreatment.id) > 0}
          hasNext={treatmentHistory.findIndex(t => t.id === selectedTreatment.id) < treatmentHistory.length - 1}
        />
      )}
    </div>
  );
}