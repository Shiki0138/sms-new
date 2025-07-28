import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  PhoneIcon,
  LinkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { animations } from '../styles/design-system';
import BookingDetectionCard from '../components/messages/BookingDetectionCard';
import { GeminiAiService } from '../services/gemini-ai-service';

interface MessageChannel {
  id: string;
  customerId?: string;
  customerName: string;
  channelType: 'line' | 'instagram' | 'email';
  channelId: string;
  isLinked: boolean;
  lastMessageAt: string;
  unreadCount: number;
  avatar?: string;
}

interface Message {
  id: string;
  channelId: string;
  type: 'received' | 'sent';
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'file';
  isAiReply?: boolean;
  sentAt: string;
  isRead?: boolean;
}

// モックデータ
const mockChannels: MessageChannel[] = [
  {
    id: '1',
    customerId: 'cust1',
    customerName: '田中花子',
    channelType: 'line',
    channelId: 'line_tanaka',
    isLinked: true,
    lastMessageAt: '2024-11-15T15:30:00Z',
    unreadCount: 2,
  },
  {
    id: '2',
    customerId: 'cust2',
    customerName: '佐藤太郎',
    channelType: 'instagram',
    channelId: 'instagram_sato',
    isLinked: true,
    lastMessageAt: '2024-11-15T14:20:00Z',
    unreadCount: 1,
  },
  {
    id: '3',
    customerName: '未連携ユーザー123',
    channelType: 'line',
    channelId: 'line_unknown',
    isLinked: false,
    lastMessageAt: '2024-11-15T12:10:00Z',
    unreadCount: 3,
  },
];

const mockMessages: { [channelId: string]: Message[] } = {
  '1': [
    {
      id: 'm1',
      channelId: '1',
      type: 'received',
      content: 'こんにちは！来週の予約をお願いしたいのですが、カットとカラーで空いている時間はありますか？',
      sentAt: '2024-11-15T15:00:00Z',
      isRead: true,
    },
    {
      id: 'm2',
      channelId: '1',
      type: 'sent',
      content: 'こんにちは！来週のご予約をご希望ですね。カットとカラーでしたら2〜3時間ほどお時間をいただいております。来週の火曜日14時からいかがでしょうか？',
      sentAt: '2024-11-15T15:15:00Z',
      isAiReply: true,
    },
    {
      id: 'm3',
      channelId: '1',
      type: 'received',
      content: 'ありがとうございます！火曜日の14時で大丈夫です。お願いします。',
      sentAt: '2024-11-15T15:30:00Z',
    },
  ],
  '2': [
    {
      id: 'm4',
      channelId: '2',
      type: 'received',
      content: 'お疲れ様です。今度パーマをかけたいと思っているのですが、どのくらいの時間がかかりますか？',
      sentAt: '2024-11-15T14:20:00Z',
    },
  ],
  '3': [
    {
      id: 'm5',
      channelId: '3',
      type: 'received',
      content: '初めまして！ホットペッパーで見つけました。カットの予約は可能ですか？',
      sentAt: '2024-11-15T12:10:00Z',
    },
    {
      id: 'm6',
      channelId: '3',
      type: 'received',
      content: '明日の午後は空いていますか？',
      sentAt: '2024-11-15T12:15:00Z',
    },
    {
      id: 'm7',
      channelId: '3',
      type: 'received',
      content: 'お返事お待ちしています。',
      sentAt: '2024-11-15T12:20:00Z',
    },
  ],
};

export default function MessagesPage() {
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showLinkingModal, setShowLinkingModal] = useState(false);

  const filteredChannels = mockChannels.filter(channel =>
    channel.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    channel.channelId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedMessages = selectedChannel ? mockMessages[selectedChannel.id] || [] : [];

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm', { locale: ja });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      return '今日';
    }
    
    return format(date, 'M月d日', { locale: ja });
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'line':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'instagram':
        return <div className="w-2 h-2 bg-pink-500 rounded-full"></div>;
      case 'email':
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full"></div>;
    }
  };

  const generateAiReply = async (lastMessage: string) => {
    setIsGeneratingReply(true);
    setAiSuggestions([]);

    try {
      // 実際の実装では環境変数からAPIキーを取得
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        // モック応答
        setTimeout(() => {
          setAiSuggestions([
            'ありがとうございます！パーマの施術時間は通常2〜3時間ほどいただいております。ご都合の良い日時はございますか？',
            'お問い合わせありがとうございます。パーマの種類やお客様の髪質により時間が変わりますが、2〜3時間程度を目安にしていただければと思います。',
            'パーマをご希望ですね！詳しくはご来店時にカウンセリングさせていただきますが、2〜3時間ほどお時間をいただいております。',
          ]);
          setIsGeneratingReply(false);
        }, 2000);
        return;
      }

      const aiService = new GeminiAiService(apiKey);
      const result = await aiService.generateSalonReply({
        messageContent: lastMessage,
        customerName: selectedChannel?.customerName || '',
        conversationContext: selectedMessages.map(m => m.content).join('\n'),
        responseType: 'inquiry_response',
      });

      setAiSuggestions(result.suggestions);
    } catch (error) {
      console.error('AI返信生成エラー:', error);
      setAiSuggestions(['申し訳ございません。AI返信の生成に失敗しました。']);
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const selectAiSuggestion = (suggestion: string) => {
    setNewMessage(suggestion);
    setAiSuggestions([]);
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedChannel) return;

    console.log('メッセージ送信:', {
      channelId: selectedChannel.id,
      content: newMessage,
    });

    setNewMessage('');
  };

  const linkCustomer = () => {
    if (!selectedChannel) return;
    
    console.log('顧客連携:', selectedChannel);
    setShowLinkingModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">メッセージ管理</h1>
              <p className="text-gray-600">
                LINE・Instagram・メールでの顧客とのやり取りを管理
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* チャンネル一覧 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* 検索バー */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="チャンネルを検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* チャンネルリスト */}
              <div className="max-h-96 overflow-y-auto">
                {filteredChannels.map((channel, index) => (
                  <motion.div
                    key={channel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, ...animations.spring.gentle }}
                    onClick={() => setSelectedChannel(channel)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedChannel?.id === channel.id ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div className="absolute -bottom-1 -right-1">
                            {getChannelIcon(channel.channelType)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-800 truncate">
                              {channel.customerName}
                            </p>
                            {!channel.isLinked && (
                              <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatDate(channel.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                      {channel.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {channel.unreadCount}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* 統計情報 */}
            <div className="mt-6 space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">未読メッセージ</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {mockChannels.reduce((sum, channel) => sum + channel.unreadCount, 0)}件
                    </p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ChatBubbleLeftRightIcon className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">未連携チャンネル</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {mockChannels.filter(c => !c.isLinked).length}件
                    </p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <LinkIcon className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* メッセージエリア */}
          <div className="lg:col-span-2">
            {selectedChannel ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[600px] flex flex-col">
                {/* ヘッダー */}
                <div className="bg-gradient-to-r from-primary-50 to-secondary-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                          {getChannelIcon(selectedChannel.channelType)}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{selectedChannel.customerName}</h3>
                        <p className="text-sm text-gray-600">
                          {selectedChannel.channelType.toUpperCase()} • 
                          {selectedChannel.isLinked ? ' 連携済み' : ' 未連携'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {!selectedChannel.isLinked && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={linkCustomer}
                          className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                        >
                          <LinkIcon className="h-4 w-4" />
                          <span>顧客連携</span>
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
                      >
                        <PhoneIcon className="h-5 w-5" />
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* 予約検出カード */}
                {selectedMessages.length > 0 && (
                  <div className="p-4 border-b border-gray-100">
                    <BookingDetectionCard
                      messageContent={selectedMessages[selectedMessages.length - 1]?.content || ''}
                      customerInfo={{
                        id: selectedChannel.customerId,
                        name: selectedChannel.customerName,
                      }}
                    />
                  </div>
                )}

                {/* メッセージ一覧 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedMessages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.type === 'sent'
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-xs ${
                            message.type === 'sent' ? 'text-primary-200' : 'text-gray-500'
                          }`}>
                            {formatTime(message.sentAt)}
                          </p>
                          {message.isAiReply && (
                            <SparklesIcon className="h-3 w-3 text-yellow-400" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* AI返信候補 */}
                <AnimatePresence>
                  {aiSuggestions.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200 p-4 bg-blue-50"
                    >
                      <div className="flex items-center space-x-2 mb-3">
                        <SparklesIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-800">AI返信候補</span>
                      </div>
                      <div className="space-y-2">
                        {aiSuggestions.map((suggestion, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => selectAiSuggestion(suggestion)}
                            className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                          >
                            {suggestion}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* メッセージ入力 */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => generateAiReply(selectedMessages[selectedMessages.length - 1]?.content || '')}
                      disabled={isGeneratingReply || selectedMessages.length === 0}
                      className="p-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400 rounded-lg hover:bg-blue-50 transition-colors disabled:cursor-not-allowed"
                      title="AI返信を生成"
                    >
                      {isGeneratingReply ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      ) : (
                        <SparklesIcon className="h-5 w-5" />
                      )}
                    </motion.button>
                    
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="メッセージを入力..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="p-2 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-[600px] flex items-center justify-center">
                <div>
                  <ChatBubbleLeftRightIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">チャンネルを選択してください</p>
                  <p className="text-sm text-gray-400">
                    左側の一覧からチャンネルを選択するとメッセージが表示されます
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}