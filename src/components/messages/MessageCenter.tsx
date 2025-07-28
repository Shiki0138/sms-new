import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  BellIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  ChatBubbleLeftIcon,
  PhoneIcon,
} from '@heroicons/react/24/solid';
import { MessageThread, MessageFilter, ChannelType, Message } from '../../types/message';
import { salonTheme, animations } from '../../styles/design-system';
import MessageThreadList from './MessageThreadList';
import MessageConversation from './MessageConversation';
import MessageComposer from './MessageComposer';
import AiReplyPanel from './AiReplyPanel';
import { InstagramApiService } from '../../services/instagram-api';
import { LineApiService } from '../../services/line-api';

interface MessageCenterProps {
  className?: string;
}

export default function MessageCenter({ className = '' }: MessageCenterProps) {
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<MessageFilter>({});
  const [selectedChannelTypes, setSelectedChannelTypes] = useState<ChannelType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // チャンネルタイプのアイコンマッピング
  const channelIcons = {
    line: '💬',
    instagram: '📷',
    email: '✉️',
  };

  const channelColors = {
    line: 'bg-green-100 text-green-800',
    instagram: 'bg-pink-100 text-pink-800',
    email: 'bg-blue-100 text-blue-800',
  };

  const channelLabels = {
    line: 'LINE',
    instagram: 'Instagram',
    email: 'メール',
  };

  // フィルターの切り替え
  const toggleChannelFilter = (channelType: ChannelType) => {
    setSelectedChannelTypes(prev => 
      prev.includes(channelType)
        ? prev.filter(type => type !== channelType)
        : [...prev, channelType]
    );
  };

  // 検索とフィルターの適用
  useEffect(() => {
    const newFilter: MessageFilter = {
      search_query: searchQuery || undefined,
      channel_types: selectedChannelTypes.length > 0 ? selectedChannelTypes : undefined,
    };
    setActiveFilter(newFilter);
  }, [searchQuery, selectedChannelTypes]);

  return (
    <div className={`h-full bg-white rounded-xl shadow-elegant overflow-hidden ${className}`}>
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.div>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">メッセージセンター</h1>
              <p className="text-primary-100 text-sm">ライトプラン - 基本的なメッセージ管理</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAiPanel(!showAiPanel)}
              className={`p-2 rounded-lg transition-colors ${
                showAiPanel 
                  ? 'bg-white text-primary-600' 
                  : 'bg-primary-700 text-white hover:bg-primary-800'
              }`}
            >
              <SparklesIcon className="h-5 w-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
            >
              <BellIcon className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        {/* 検索バー */}
        <div className="mt-4 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="顧客名またはメッセージを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border-0 shadow-sm focus:ring-2 focus:ring-primary-200 focus:outline-none text-gray-800 placeholder-gray-500"
          />
        </div>

        {/* チャンネルフィルター */}
        <div className="mt-4 flex items-center space-x-2">
          <FunnelIcon className="h-4 w-4 text-primary-100" />
          <span className="text-primary-100 text-sm font-medium">チャンネル:</span>
          {Object.entries(channelLabels).map(([type, label]) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleChannelFilter(type as ChannelType)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                selectedChannelTypes.includes(type as ChannelType)
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'bg-primary-700 text-primary-100 hover:bg-primary-600'
              }`}
            >
              <span className="mr-1">{channelIcons[type as ChannelType]}</span>
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="flex h-full">
        {/* サイドバー - メッセージスレッド一覧 */}
        <div className="w-1/3 border-r border-gray-200 bg-gray-50">
          <MessageThreadList
            filter={activeFilter}
            selectedThread={selectedThread}
            onThreadSelect={setSelectedThread}
            onUnreadCountChange={setUnreadCount}
          />
        </div>

        {/* メインエリア - 会話表示 */}
        <div className="flex-1 flex flex-col">
          {selectedThread ? (
            <>
              {/* 会話ヘッダー */}
              <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                      {selectedThread.customer.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-800">{selectedThread.customer.name}</h2>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        {selectedThread.customer.phone_number && (
                          <div className="flex items-center space-x-1">
                            <PhoneIcon className="h-3 w-3" />
                            <span>{selectedThread.customer.phone_number}</span>
                          </div>
                        )}
                        <div className="flex space-x-1">
                          {selectedThread.channels.map((channel) => (
                            <span
                              key={channel.id}
                              className={`px-2 py-1 rounded-full text-xs font-medium ${channelColors[channel.channel_type]}`}
                            >
                              {channelIcons[channel.channel_type]} {channelLabels[channel.channel_type]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedThread.unread_count > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium"
                    >
                      {selectedThread.unread_count}件未読
                    </motion.div>
                  )}
                </div>
              </div>

              {/* 会話表示エリア */}
              <div className="flex-1 overflow-hidden">
                <MessageConversation
                  thread={selectedThread}
                  showAiSuggestions={showAiPanel}
                />
              </div>

              {/* メッセージ作成エリア */}
              <div className="border-t border-gray-200 bg-white">
                <MessageComposer
                  thread={selectedThread}
                  showAiPanel={showAiPanel}
                />
              </div>
            </>
          ) : (
            // 会話未選択時の表示
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={animations.spring.gentle}
                className="text-center"
              >
                <ChatBubbleLeftIcon className="h-24 w-24 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  メッセージを選択してください
                </h3>
                <p className="text-gray-500">
                  左側のリストから顧客との会話を選択して、<br />
                  メッセージの送受信を開始できます。
                </p>
              </motion.div>
            </div>
          )}
        </div>

        {/* AI返信パネル */}
        <AnimatePresence>
          {showAiPanel && selectedThread && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={animations.spring.smooth}
              className="w-80 border-l border-gray-200 bg-white"
            >
              <AiReplyPanel
                thread={selectedThread}
                onClose={() => setShowAiPanel(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}