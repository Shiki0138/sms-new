import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  PhotoIcon,
  StarIcon,
  ClockIcon,
  CurrencyYenIcon,
  UserIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { animations } from '../../styles/design-system';
import { TreatmentRecord } from './TreatmentHistoryCard';

interface TreatmentHistoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  treatment: TreatmentRecord;
  customerName: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  className?: string;
}

export default function TreatmentHistoryDetailModal({
  isOpen,
  onClose,
  treatment,
  customerName,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  className = '',
}: TreatmentHistoryDetailModalProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'HH:mm');
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

  const renderStars = (rating?: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = rating && rating >= star;
          const StarComponent = isFilled ? StarIconSolid : StarIcon;
          
          return (
            <StarComponent
              key={star}
              className={`h-5 w-5 ${
                isFilled ? 'text-yellow-400' : 'text-gray-300'
              }`}
            />
          );
        })}
        {rating && <span className="text-sm text-gray-600 ml-2">({rating}/5)</span>}
      </div>
    );
  };

  const openPhotoModal = (photoIndex: number) => {
    setSelectedPhotoIndex(photoIndex);
    setIsPhotoModalOpen(true);
  };

  const closePhotoModal = () => {
    setIsPhotoModalOpen(false);
    setSelectedPhotoIndex(null);
  };

  const navigatePhoto = (direction: 'prev' | 'next') => {
    if (selectedPhotoIndex === null) return;
    
    if (direction === 'prev' && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    } else if (direction === 'next' && selectedPhotoIndex < treatment.treatmentPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* メインモーダル */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={animations.spring.gentle}
              onClick={(e) => e.stopPropagation()}
              className={`bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}
            >
              {/* ヘッダー */}
              <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-6 py-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                      <ClockIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">施術履歴詳細</h2>
                      <p className="text-primary-100 text-sm">
                        {customerName}さん - {formatDate(treatment.treatmentDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* 前後ナビゲーション */}
                    {hasPrevious && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onPrevious}
                        className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                        title="前の施術"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </motion.button>
                    )}

                    {hasNext && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onNext}
                        className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                        title="次の施術"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </motion.button>
                    )}

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* コンテンツ */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div className="space-y-6">
                  {/* 基本情報 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <CalendarIcon className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">施術日時</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-800">
                        {formatDate(treatment.treatmentDate)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatTime(treatment.treatmentDate)}
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <UserIcon className="h-5 w-5 text-gray-600" />
                        <span className="text-sm font-medium text-gray-700">担当スタッフ</span>
                      </div>
                      <div className="text-lg font-semibold text-gray-800">
                        {treatment.staffName || '未設定'}
                      </div>
                    </div>

                    {treatment.price && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <CurrencyYenIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">料金</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                          ¥{treatment.price.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {treatment.durationMinutes && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <ClockIcon className="h-5 w-5 text-gray-600" />
                          <span className="text-sm font-medium text-gray-700">施術時間</span>
                        </div>
                        <div className="text-lg font-semibold text-gray-800">
                          {formatDuration(treatment.durationMinutes)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* サービス名 */}
                  <div className="bg-primary-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-primary-800 mb-2">施術内容</h3>
                    <p className="text-primary-700 text-xl font-medium">{treatment.serviceName}</p>
                  </div>

                  {/* 満足度評価 */}
                  {treatment.satisfactionRating && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-3">満足度評価</h3>
                      {renderStars(treatment.satisfactionRating)}
                    </div>
                  )}

                  {/* 施術写真 */}
                  {treatment.treatmentPhotos.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <PhotoIcon className="h-5 w-5 mr-2" />
                        施術写真 ({treatment.treatmentPhotos.length}枚)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {treatment.treatmentPhotos.map((photo, index) => (
                          <motion.div
                            key={index}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => openPhotoModal(index)}
                            className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group shadow-md hover:shadow-lg transition-shadow"
                          >
                            <img
                              src={photo}
                              alt={`施術写真 ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGM0Y0RjYiLz48cGF0aCBkPSJNMTAwIDcwQzEwNS41MjMgNzAgMTEwIDc0LjQ3NyAxMTAgODBDMTEwIDg1LjUyMyAxMDUuNTIzIDkwIDEwMCA5MEM5NC40NzcgOTAgOTAgODUuNTIzIDkwIDgwQzkwIDc0LjQ3NyA5NC40NzcgNzAgMTAwIDcwWiIgZmlsbD0iIzlDQTNBRiIvPjxwYXRoIGQ9Ik0xNzAgMTMwTDE0MCAuMUwxMzAgMTAwTDcwIDEzMEwzMCAxNzBIMTcwVjEzMFoiIGZpbGw9IiM5Q0EzQUYiLz48L3N2Zz4K';
                              }}
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                              <MagnifyingGlassIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 施術メモ */}
                  {treatment.notes && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">施術メモ</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {treatment.notes}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* お客様の要望 */}
                  {treatment.customerRequests && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">お客様のご要望</h3>
                      <div className="bg-yellow-50 border-l-4 border-yellow-300 rounded-lg p-4">
                        <div className="flex items-start space-x-2">
                          <span className="text-yellow-600 text-lg">💬</span>
                          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {treatment.customerRequests}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 写真拡大モーダル */}
      <AnimatePresence>
        {isPhotoModalOpen && selectedPhotoIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-60"
            onClick={closePhotoModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 写真 */}
              <img
                src={treatment.treatmentPhotos[selectedPhotoIndex]}
                alt={`施術写真 ${selectedPhotoIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />

              {/* ナビゲーション */}
              {treatment.treatmentPhotos.length > 1 && (
                <>
                  {selectedPhotoIndex > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => navigatePhoto('prev')}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-colors"
                    >
                      <ChevronLeftIcon className="h-6 w-6" />
                    </motion.button>
                  )}

                  {selectedPhotoIndex < treatment.treatmentPhotos.length - 1 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => navigatePhoto('next')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-colors"
                    >
                      <ChevronRightIcon className="h-6 w-6" />
                    </motion.button>
                  )}
                </>
              )}

              {/* 閉じるボタン */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={closePhotoModal}
                className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-full transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </motion.button>

              {/* 写真情報 */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
                <span className="text-sm">
                  {selectedPhotoIndex + 1} / {treatment.treatmentPhotos.length}
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}