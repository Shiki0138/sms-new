import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { GeminiAiService } from '../../services/gemini-ai-service';
import { animations } from '../../styles/design-system';

interface BookingDetectionCardProps {
  messageContent: string;
  customerInfo: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
  };
  onCreateBooking?: (bookingInfo: any) => void;
  className?: string;
}

export default function BookingDetectionCard({
  messageContent,
  customerInfo,
  onCreateBooking,
  className = '',
}: BookingDetectionCardProps) {
  const [bookingAnalysis, setBookingAnalysis] = useState<{
    isBookingRequest: boolean;
    extractedInfo?: {
      preferredDate?: string;
      preferredTime?: string;
      serviceType?: string;
      customerRequests?: string;
    };
    confidence: number;
  } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    analyzeMessage();
  }, [messageContent]);

  const analyzeMessage = async () => {
    try {
      setIsAnalyzing(true);
      
      // Gemini APIキーが設定されている場合のみ分析実行
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        // 開発環境用のモック分析
        setBookingAnalysis(getMockAnalysis());
        return;
      }

      const aiService = new GeminiAiService(apiKey);
      const analysis = await aiService.analyzeBookingMessage(messageContent);
      setBookingAnalysis(analysis);
    } catch (error) {
      console.error('Error analyzing message for booking:', error);
      setBookingAnalysis(getMockAnalysis());
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getMockAnalysis = () => {
    // 開発環境用のモック分析結果
    const bookingKeywords = ['予約', 'カット', 'カラー', 'パーマ', '時間', '空いて', '可能'];
    const hasBookingKeywords = bookingKeywords.some(keyword => 
      messageContent.includes(keyword)
    );

    if (hasBookingKeywords) {
      return {
        isBookingRequest: true,
        extractedInfo: {
          preferredDate: '来週',
          preferredTime: '午後',
          serviceType: messageContent.includes('カット') ? 'カット' : 
                      messageContent.includes('カラー') ? 'カラー' : 
                      messageContent.includes('パーマ') ? 'パーマ' : undefined,
          customerRequests: messageContent,
        },
        confidence: 0.8,
      };
    }

    return {
      isBookingRequest: false,
      confidence: 0.2,
    };
  };

  const handleCreateBooking = () => {
    const bookingData = {
      customerId: customerInfo.id,
      customerName: customerInfo.name,
      preferredDate: bookingAnalysis?.extractedInfo?.preferredDate,
      preferredTime: bookingAnalysis?.extractedInfo?.preferredTime,
      serviceType: bookingAnalysis?.extractedInfo?.serviceType,
      customerRequests: bookingAnalysis?.extractedInfo?.customerRequests,
      originalMessage: messageContent,
    };

    if (onCreateBooking) {
      onCreateBooking(bookingData);
    } else {
      // 予約管理画面に遷移（クエリパラメータで情報を渡す）
      const params = new URLSearchParams();
      if (bookingData.customerId) params.set('customerId', bookingData.customerId);
      if (bookingData.customerName) params.set('customerName', bookingData.customerName);
      if (bookingData.serviceType) params.set('serviceType', bookingData.serviceType);
      if (bookingData.customerRequests) params.set('requests', bookingData.customerRequests);
      
      navigate(`/reservations/new?${params.toString()}`);
    }
  };

  const formatDateTimeInfo = () => {
    const info = bookingAnalysis?.extractedInfo;
    if (!info) return null;

    const parts = [];
    if (info.preferredDate) parts.push(`📅 ${info.preferredDate}`);
    if (info.preferredTime) parts.push(`🕐 ${info.preferredTime}`);
    if (info.serviceType) parts.push(`💇‍♀️ ${info.serviceType}`);

    return parts.length > 0 ? parts.join(' ') : null;
  };

  if (isAnalyzing) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 ${className}`}
      >
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span className="text-blue-700 text-sm font-medium">メッセージを分析中...</span>
        </div>
      </motion.div>
    );
  }

  if (!bookingAnalysis || !bookingAnalysis.isBookingRequest || bookingAnalysis.confidence < 0.6) {
    return null; // 予約関連でない場合は表示しない
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={animations.spring.smooth}
        className={`bg-gradient-to-r from-primary-50 to-secondary-50 rounded-xl border-2 border-primary-200 overflow-hidden ${className}`}
      >
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-primary-500 to-secondary-500 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5 text-white" />
              <span className="text-white font-medium text-sm">予約のご相談を検出</span>
              <div className="flex items-center space-x-1">
                <CheckCircleIcon className="h-4 w-4 text-green-200" />
                <span className="text-green-200 text-xs">
                  {Math.round(bookingAnalysis.confidence * 100)}%
                </span>
              </div>
            </div>
            
            {bookingAnalysis.confidence < 0.8 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-300" />
              </motion.div>
            )}
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-4 space-y-4">
          {/* 顧客情報 */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
              <UserIcon className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{customerInfo.name}</p>
              <p className="text-xs text-gray-600">
                {customerInfo.phone || customerInfo.email || '連絡先未登録'}
              </p>
            </div>
          </div>

          {/* 抽出された予約情報 */}
          {bookingAnalysis.extractedInfo && (
            <div className="bg-white rounded-lg p-3 space-y-2">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                メッセージから抽出された情報：
              </h4>
              
              {formatDateTimeInfo() && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
                  {formatDateTimeInfo()}
                </div>
              )}

              {bookingAnalysis.extractedInfo.customerRequests && (
                <div className="text-xs text-gray-500 italic">
                  「{bookingAnalysis.extractedInfo.customerRequests.substring(0, 100)}
                  {bookingAnalysis.extractedInfo.customerRequests.length > 100 ? '...' : ''}」
                </div>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex space-x-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateBooking}
              className="flex-1 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white px-4 py-3 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-all shadow-sm"
            >
              <CalendarIcon className="h-4 w-4" />
              <span>予約を作成する</span>
              <ArrowRightIcon className="h-4 w-4" />
            </motion.button>
          </div>

          {/* ヒント */}
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
            💡 この機能は顧客からのメッセージを自動分析し、予約の可能性を検出します。
            確認の上、予約管理画面で正式な予約を作成してください。
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}