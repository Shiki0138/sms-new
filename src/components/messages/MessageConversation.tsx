import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckIcon,
  CheckCircleIcon,
  ClockIcon,
  PhotoIcon,
  PlayIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { MessageThread, Message, MediaType } from '../../types/message';
import { animations } from '../../styles/design-system';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MessageConversationProps {
  thread: MessageThread;
  showAiSuggestions?: boolean;
}

export default function MessageConversation({
  thread,
  showAiSuggestions = false,
}: MessageConversationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // チャンネルタイプのアイコンマッピング
  const channelIcons = {
    line: '💬',
    instagram: '📷',
    email: '✉️',
  };

  const channelColors = {
    line: 'border-green-200',
    instagram: 'border-pink-200',
    email: 'border-blue-200',
  };

  // メッセージを読み込み（実際にはAPIからリアルタイムで取得）
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        // TODO: 実際のAPI呼び出しに置き換え
        // WebSocketまたはSupabaseのリアルタイム機能を使用してメッセージを取得
        const mockMessages: Message[] = [
          {
            id: 'msg1',
            tenant_id: 'tenant1',
            customer_id: thread.customer.id,
            channel_id: 'ch1',
            message_type: 'received',
            content: 'こんにちは！来週の予約を取りたいのですが、空いている時間はありますか？',
            is_read: true,
            is_ai_reply: false,
            sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2時間前
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'msg2',
            tenant_id: 'tenant1',
            customer_id: thread.customer.id,
            channel_id: 'ch1',
            message_type: 'sent',
            content: 'こんにちは！ありがとうございます。来週でしたら、火曜日の14時〜と木曜日の10時〜が空いております。いかがでしょうか？',
            is_read: true,
            is_ai_reply: false,
            sent_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 90分前
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'msg3',
            tenant_id: 'tenant1',
            customer_id: thread.customer.id,
            channel_id: 'ch1',
            message_type: 'received',
            content: '火曜日の14時でお願いします！',
            is_read: true,
            is_ai_reply: false,
            sent_at: new Date(Date.now() - 80 * 60 * 1000).toISOString(), // 80分前
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'msg4',
            tenant_id: 'tenant1',
            customer_id: thread.customer.id,
            channel_id: 'ch1',
            message_type: 'sent',
            content: 'かしこまりました！火曜日14時からご予約をお取りしました。当日お待ちしております✨',
            is_read: true,
            is_ai_reply: true, // AI返信
            sent_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(), // 70分前
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'msg5',
            tenant_id: 'tenant1',
            customer_id: thread.customer.id,
            channel_id: 'ch1',
            message_type: 'received',
            content: 'ありがとうございます！楽しみにしています😊',
            media_url: 'https://example.com/sticker.png',
            media_type: 'image',
            is_read: true,
            is_ai_reply: false,
            sent_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 60分前
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'msg6',
            tenant_id: 'tenant1',
            customer_id: thread.customer.id,
            channel_id: 'ch1',
            message_type: 'received',
            content: '明日の予約時間を変更したいのですが可能でしょうか？',
            is_read: false,
            is_ai_reply: false,
            sent_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30分前
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];

        setMessages(mockMessages);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [thread.customer.id]);

  // 自動スクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `昨日 ${format(date, 'HH:mm')}`;
    } else if (isThisWeek(date)) {
      return format(date, 'E HH:mm', { locale: ja });
    } else {
      return format(date, 'M/d HH:mm');
    }
  };

  const getChannelInfo = (channelId: string) => {
    return thread.channels.find(ch => ch.id === channelId);
  };

  const renderMediaContent = (message: Message) => {
    if (!message.media_url || !message.media_type) return null;

    const mediaType = message.media_type as MediaType;

    switch (mediaType) {
      case 'image':
        return (
          <div className="mt-2 relative group">
            <img
              src={message.media_url}
              alt="送信された画像"
              className="max-w-xs rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                // TODO: 画像モーダルを開く
                console.log('Open image modal:', message.media_url);
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all flex items-center justify-center">
              <PhotoIcon className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="mt-2 relative group max-w-xs">
            <div className="bg-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-300 transition-colors">
              <PlayIcon className="h-12 w-12 text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-700 text-center">動画を再生</p>
            </div>
          </div>
        );
      
      case 'file':
        return (
          <div className="mt-2 max-w-xs">
            <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 cursor-pointer hover:bg-gray-200 transition-colors">
              <div className="flex items-center space-x-2">
                <DocumentIcon className="h-6 w-6 text-gray-600" />
                <span className="text-sm text-gray-700 truncate">添付ファイル</span>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderMessage = (message: Message, index: number) => {
    const isReceived = message.message_type === 'received';
    const channel = getChannelInfo(message.channel_id);
    const showAvatar = isReceived && (index === 0 || messages[index - 1]?.message_type !== 'received');
    const showTime = index === messages.length - 1 || 
                    messages[index + 1]?.message_type !== message.message_type ||
                    new Date(messages[index + 1]?.sent_at).getTime() - new Date(message.sent_at).getTime() > 5 * 60 * 1000; // 5分以上間隔が空いた場合

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={animations.spring.gentle}
        className={`flex ${isReceived ? 'justify-start' : 'justify-end'} mb-4`}
      >
        <div className={`flex max-w-xs lg:max-w-md ${isReceived ? 'flex-row' : 'flex-row-reverse'}`}>
          {/* アバター */}
          <div className={`flex-shrink-0 ${isReceived ? 'mr-3' : 'ml-3'}`}>
            {showAvatar && isReceived ? (
              <div className="h-8 w-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {thread.customer.name.charAt(0)}
              </div>
            ) : (
              <div className="h-8 w-8"></div>
            )}
          </div>

          {/* メッセージバブル */}
          <div className="flex flex-col">
            <div
              className={`px-4 py-2 rounded-2xl shadow-sm ${
                isReceived
                  ? `bg-white border-2 ${channel ? channelColors[channel.channel_type] : 'border-gray-200'}`
                  : 'bg-primary-500 text-white'
              } ${!message.is_read && isReceived ? 'ring-2 ring-primary-200' : ''}`}
            >
              {/* チャンネル表示 */}
              {channel && isReceived && showAvatar && (
                <div className="flex items-center space-x-1 mb-1 opacity-70">
                  <span className="text-xs">{channelIcons[channel.channel_type]}</span>
                  <span className="text-xs text-gray-500">
                    {channel.channel_type === 'line' ? 'LINE' : 
                     channel.channel_type === 'instagram' ? 'Instagram' : 'Email'}
                  </span>
                </div>
              )}

              <p className={`text-sm ${isReceived ? 'text-gray-800' : 'text-white'}`}>
                {message.content}
              </p>

              {/* AI返信表示 */}
              {message.is_ai_reply && !isReceived && (
                <div className="flex items-center space-x-1 mt-1 opacity-80">
                  <span className="text-xs">🤖</span>
                  <span className="text-xs">AI返信</span>
                </div>
              )}

              {/* メディアコンテンツ */}
              {renderMediaContent(message)}
            </div>

            {/* タイムスタンプと既読状態 */}
            {showTime && (
              <div className={`mt-1 flex items-center space-x-1 text-xs text-gray-500 ${
                isReceived ? 'justify-start' : 'justify-end'
              }`}>
                <ClockIcon className="h-3 w-3" />
                <span>{formatMessageTime(message.sent_at)}</span>
                
                {!isReceived && (
                  <>
                    {message.is_read ? (
                      <CheckCircleIcon className="h-3 w-3 text-primary-500" />
                    ) : (
                      <CheckIcon className="h-3 w-3 text-gray-400" />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>まだメッセージがありません</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <AnimatePresence>
            {messages.map((message, index) => renderMessage(message, index))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* AI候補表示エリア（showAiSuggestionsがtrueの場合） */}
      {showAiSuggestions && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg"
        >
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-purple-600">🤖</span>
            <span className="text-sm font-medium text-purple-800">AI返信候補</span>
          </div>
          <div className="text-sm text-purple-600">
            最新のメッセージに対するAI返信候補がここに表示されます
          </div>
        </motion.div>
      )}
    </div>
  );
}