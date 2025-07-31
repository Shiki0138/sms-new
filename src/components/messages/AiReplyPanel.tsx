import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { MessageThread, AiSuggestion } from '../../types/message';
import { animations } from '../../styles/design-system';
import { useAiReply } from '../../hooks/useAiReply';

interface AiReplyPanelProps {
  thread: MessageThread;
  onClose: () => void;
  onSelectReply?: (suggestion: AiSuggestion) => void;
}

export default function AiReplyPanel({
  thread,
  onClose,
  onSelectReply,
}: AiReplyPanelProps) {
  const {
    suggestions,
    selectedSuggestion,
    aiUsageCount,
    monthlyLimit,
    isGenerating,
    remainingUsage,
    usagePercentage,
    isNearLimit,
    isLimitReached,
    generateSuggestions,
    selectSuggestion,
    submitFeedback,
    markAsUsed,
    fetchUsageCount,
  } = useAiReply({
    onSuccess: (response) => {
      console.log('AI suggestions generated:', response);
    },
  });

  const [feedbackRating, setFeedbackRating] = useState<number>(0);

  // トーンのラベルと説明
  const toneConfig = {
    formal: {
      label: 'フォーマル',
      description: '丁寧で礼儀正しい',
      emoji: '🎩',
      color: 'bg-blue-100 text-blue-700',
    },
    casual: {
      label: 'カジュアル',
      description: '親しみやすい',
      emoji: '😊',
      color: 'bg-green-100 text-green-700',
    },
    friendly: {
      label: 'フレンドリー',
      description: '温かみのある',
      emoji: '💖',
      color: 'bg-pink-100 text-pink-700',
    },
  };

  // 最新のメッセージを取得
  const getLatestReceivedMessage = () => {
    const receivedMessages = thread.messages.filter(msg => msg.message_type === 'received');
    return receivedMessages[receivedMessages.length - 1];
  };

  // コンポーネントマウント時に使用回数を取得し、自動生成
  useEffect(() => {
    fetchUsageCount();
    if (!isLimitReached) {
      generateSuggestions(thread);
    }
  }, [thread]);

  // 返信候補を選択
  const handleSelectSuggestion = async (suggestion: AiSuggestion) => {
    selectSuggestion(suggestion);
    if (onSelectReply) {
      onSelectReply(suggestion);
      await markAsUsed(suggestion.id);
    }
  };

  // フィードバック送信
  const handleFeedback = async (rating: number) => {
    setFeedbackRating(rating);
    await submitFeedback(rating);
  };

  const latestMessage = getLatestReceivedMessage();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-purple-600" />
            <h3 className="font-bold text-gray-800">AI返信アシスタント</h3>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </motion.button>
        </div>

        {/* AI使用状況 */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>今月のAI返信使用回数</span>
            <span className={`font-medium ${
              isNearLimit ? 'text-orange-600' : 'text-gray-700'
            }`}>
              {aiUsageCount} / {monthlyLimit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${usagePercentage}%` }}
              transition={animations.spring.smooth}
              className={`h-full rounded-full ${
                isNearLimit ? 'bg-orange-500' : 'bg-purple-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* 元のメッセージ */}
      {latestMessage && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="text-xs text-gray-600 mb-1">返信対象メッセージ:</div>
          <div className="bg-white p-3 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-800">{latestMessage.content}</p>
          </div>
        </div>
      )}

      {/* AI返信候補 */}
      <div className="flex-1 overflow-y-auto p-4">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mb-4"
            >
              <SparklesIcon className="h-12 w-12 text-purple-600" />
            </motion.div>
            <p className="text-gray-600">AI返信を生成中...</p>
            <p className="text-xs text-gray-500 mt-2">
              お客様の履歴を分析しています
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, ...animations.spring.gentle }}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedSuggestion?.id === suggestion.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  {/* トーンバッジ */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      toneConfig[suggestion.tone].color
                    }`}>
                      <span className="mr-1">{toneConfig[suggestion.tone].emoji}</span>
                      {toneConfig[suggestion.tone].label}
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="text-xs text-gray-500">
                        信頼度: {Math.round(suggestion.confidence * 100)}%
                      </div>
                      {selectedSuggestion?.id === suggestion.id && (
                        <CheckIcon className="h-4 w-4 text-purple-600" />
                      )}
                    </div>
                  </div>

                  {/* 返信内容 */}
                  <p className="text-sm text-gray-800 leading-relaxed">
                    {suggestion.content}
                  </p>

                  {/* 説明 */}
                  <p className="text-xs text-gray-500 mt-2">
                    {toneConfig[suggestion.tone].description}な対応
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* 再生成ボタン */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => generateSuggestions(thread)}
              disabled={isGenerating || isLimitReached}
              className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span className="text-sm font-medium">別の候補を生成</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* フィードバック */}
      {selectedSuggestion && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">この返信は役立ちましたか？</div>
            <div className="flex items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleFeedback(star)}
                  className="p-1"
                >
                  {star <= feedbackRating ? (
                    <StarSolidIcon className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <StarIcon className="h-5 w-5 text-gray-400 hover:text-yellow-500" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ヒント */}
      <div className="px-4 py-3 bg-purple-50 border-t border-purple-200">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-purple-700">
            <p className="font-medium mb-1">💡 AIアシスタントのヒント</p>
            <p>お客様の過去の来店履歴や好みを分析して、最適な返信を提案します。</p>
            <p className="mt-1">選択した返信は編集可能です。</p>
          </div>
        </div>
      </div>
    </div>
  );
}