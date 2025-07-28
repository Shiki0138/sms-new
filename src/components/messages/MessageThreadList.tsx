import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClockIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { MessageThread, MessageFilter, ChannelType } from '../../types/message';
import { animations } from '../../styles/design-system';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MessageThreadListProps {
  filter: MessageFilter;
  selectedThread: MessageThread | null;
  onThreadSelect: (thread: MessageThread) => void;
  onUnreadCountChange: (count: number) => void;
}

export default function MessageThreadList({
  filter,
  selectedThread,
  onThreadSelect,
  onUnreadCountChange,
}: MessageThreadListProps) {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // チャンネルタイプのアイコンマッピング
  const channelIcons = {
    line: '💬',
    instagram: '📷',
    email: '✉️',
  };

  const channelColors = {
    line: 'bg-green-100 text-green-700',
    instagram: 'bg-pink-100 text-pink-700',
    email: 'bg-blue-100 text-blue-700',
  };

  // メッセージスレッドのモックデータ（実際の実装では API から取得）
  useEffect(() => {
    const loadThreads = async () => {
      setLoading(true);
      try {
        // TODO: 実際のAPI呼び出しに置き換え
        const mockThreads: MessageThread[] = [
          {
            customer: {
              id: '1',
              name: '田中花子',
              phone_number: '090-1234-5678',
              email: 'tanaka@example.com',
            },
            channels: [
              {
                id: 'ch1',
                tenant_id: 'tenant1',
                customer_id: '1',
                channel_type: 'line',
                channel_id: 'line_user_1',
                channel_name: '田中花子',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 'ch2',
                tenant_id: 'tenant1',
                customer_id: '1',
                channel_type: 'email',
                channel_id: 'tanaka@example.com',
                channel_name: '田中花子',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            messages: [
              {
                id: 'msg1',
                tenant_id: 'tenant1',
                customer_id: '1',
                channel_id: 'ch1',
                message_type: 'received',
                content: '明日の予約時間を変更したいのですが可能でしょうか？',
                is_read: false,
                is_ai_reply: false,
                sent_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30分前
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            unread_count: 1,
            latest_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            customer: {
              id: '2',
              name: '佐藤美咲',
              phone_number: '090-8765-4321',
            },
            channels: [
              {
                id: 'ch3',
                tenant_id: 'tenant1',
                customer_id: '2',
                channel_type: 'instagram',
                channel_id: 'sato_misaki',
                channel_name: '佐藤美咲',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            messages: [
              {
                id: 'msg2',
                tenant_id: 'tenant1',
                customer_id: '2',
                channel_id: 'ch3',
                message_type: 'sent',
                content: 'ありがとうございました！次回もよろしくお願いします✨',
                is_read: true,
                is_ai_reply: false,
                sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2時間前
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            unread_count: 0,
            latest_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            customer: {
              id: '3',
              name: '山田太郎',
              phone_number: '090-5555-6666',
              email: 'yamada@example.com',
            },
            channels: [
              {
                id: 'ch4',
                tenant_id: 'tenant1',
                customer_id: '3',
                channel_type: 'line',
                channel_id: 'line_user_3',
                channel_name: '山田太郎',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            messages: [
              {
                id: 'msg3',
                tenant_id: 'tenant1',
                customer_id: '3',
                channel_id: 'ch4',
                message_type: 'received',
                content: '次回のカット予約をお願いします',
                is_read: false,
                is_ai_reply: false,
                sent_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5分前
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            unread_count: 1,
            latest_message_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
        ];

        // フィルターを適用
        let filteredThreads = mockThreads;

        if (filter.search_query) {
          const query = filter.search_query.toLowerCase();
          filteredThreads = filteredThreads.filter(thread =>
            thread.customer.name.toLowerCase().includes(query) ||
            thread.messages.some(msg => msg.content.toLowerCase().includes(query))
          );
        }

        if (filter.channel_types && filter.channel_types.length > 0) {
          filteredThreads = filteredThreads.filter(thread =>
            thread.channels.some(channel =>
              filter.channel_types!.includes(channel.channel_type)
            )
          );
        }

        // 最新メッセージ順でソート
        filteredThreads.sort((a, b) =>
          new Date(b.latest_message_at).getTime() - new Date(a.latest_message_at).getTime()
        );

        setThreads(filteredThreads);

        // 未読件数を計算
        const totalUnread = filteredThreads.reduce((sum, thread) => sum + thread.unread_count, 0);
        onUnreadCountChange(totalUnread);
      } catch (err) {
        setError('メッセージの読み込みに失敗しました');
        console.error('Error loading message threads:', err);
      } finally {
        setLoading(false);
      }
    };

    loadThreads();
  }, [filter, onUnreadCountChange]);

  const getLatestMessage = (thread: MessageThread) => {
    if (thread.messages.length === 0) return null;
    return thread.messages[thread.messages.length - 1];
  };

  const formatMessageTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), {
      addSuffix: true,
      locale: ja,
    });
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 w-48 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <ExclamationCircleIcon className="h-12 w-12 text-red-400 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 text-sm">
          {filter.search_query || filter.channel_types?.length
            ? '条件に一致するメッセージがありません'
            : 'メッセージがありません'}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      <AnimatePresence>
        {threads.map((thread) => {
          const latestMessage = getLatestMessage(thread);
          const isSelected = selectedThread?.customer.id === thread.customer.id;

          return (
            <motion.div
              key={thread.customer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={animations.spring.gentle}
              onClick={() => onThreadSelect(thread)}
              className={`p-4 border-b border-gray-200 cursor-pointer transition-all hover:bg-gray-100 ${
                isSelected ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                {/* アバター */}
                <div className="relative">
                  <div className="h-12 w-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                    {thread.customer.name.charAt(0)}
                  </div>
                  {thread.unread_count > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium"
                    >
                      {thread.unread_count > 9 ? '9+' : thread.unread_count}
                    </motion.div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* 顧客名と時刻 */}
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-medium truncate ${
                      thread.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {thread.customer.name}
                    </h3>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <ClockIcon className="h-3 w-3" />
                      <span>{latestMessage ? formatMessageTime(latestMessage.sent_at) : ''}</span>
                    </div>
                  </div>

                  {/* チャンネルバッジ */}
                  <div className="flex items-center space-x-1 mb-2">
                    {thread.channels.map((channel) => (
                      <span
                        key={channel.id}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${channelColors[channel.channel_type]}`}
                      >
                        <span className="mr-1">{channelIcons[channel.channel_type]}</span>
                      </span>
                    ))}
                  </div>

                  {/* 最新メッセージプレビュー */}
                  {latestMessage && (
                    <div className="flex items-center space-x-2">
                      {latestMessage.message_type === 'sent' && (
                        <CheckIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      )}
                      <p className={`text-sm truncate ${
                        thread.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                      }`}>
                        {latestMessage.is_ai_reply && (
                          <span className="text-purple-600 mr-1">🤖</span>
                        )}
                        {truncateMessage(latestMessage.content)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}