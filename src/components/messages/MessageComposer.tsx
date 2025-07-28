import React, { useState, useRef, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  PhotoIcon,
  FaceSmileIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { MessageThread, ChannelType, MessageSendRequest } from '../../types/message';
import { animations } from '../../styles/design-system';

interface MessageComposerProps {
  thread: MessageThread;
  showAiPanel: boolean;
  onSendMessage?: (request: MessageSendRequest) => void;
}

export default function MessageComposer({
  thread,
  showAiPanel,
  onSendMessage,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<ChannelType>(
    thread.channels[0]?.channel_type || 'line'
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // チャンネルアイコンとカラー
  const channelConfig = {
    line: {
      icon: '💬',
      label: 'LINE',
      color: 'bg-green-100 text-green-700 hover:bg-green-200',
      borderColor: 'border-green-500',
    },
    instagram: {
      icon: '📷',
      label: 'Instagram',
      color: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
      borderColor: 'border-pink-500',
    },
    email: {
      icon: '✉️',
      label: 'メール',
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      borderColor: 'border-blue-500',
    },
  };

  // 利用可能なチャンネルを取得
  const availableChannels = thread.channels.map(ch => ch.channel_type);

  // メッセージ送信処理
  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    try {
      // 送信するチャンネルIDを取得
      const channel = thread.channels.find(ch => ch.channel_type === selectedChannel);
      if (!channel) {
        console.error('Channel not found');
        return;
      }

      const sendRequest: MessageSendRequest = {
        channel_id: channel.id,
        content: message.trim(),
        is_ai_reply: false,
      };

      // TODO: 実際のAPI呼び出し
      if (onSendMessage) {
        await onSendMessage(sendRequest);
      } else {
        // モック送信処理
        console.log('Sending message:', sendRequest);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 送信成功後、入力欄をクリア
      setMessage('');
      
      // テキストエリアの高さをリセット
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // TODO: エラー表示
    } finally {
      setIsSending(false);
    }
  };

  // キーボードイベント処理
  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // テキストエリアの自動リサイズ
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // 自動高さ調整
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // ファイルアップロード処理
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // TODO: 実際のファイルアップロード処理
      console.log('Uploading file:', file);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // アップロード成功後、ファイルURLをメッセージに追加
      // 実際の実装では、アップロードされたファイルのURLを使用
      const fileUrl = `[ファイル: ${file.name}]`;
      setMessage(prev => prev + (prev ? '\n' : '') + fileUrl);
    } catch (error) {
      console.error('Error uploading file:', error);
      // TODO: エラー表示
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 絵文字ピッカー（簡易版）
  const insertEmoji = (emoji: string) => {
    const start = textareaRef.current?.selectionStart || 0;
    const end = textareaRef.current?.selectionEnd || 0;
    const newMessage = message.slice(0, start) + emoji + message.slice(end);
    setMessage(newMessage);
    
    // カーソル位置を絵文字の後に移動
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + emoji.length;
        textareaRef.current.selectionEnd = start + emoji.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const commonEmojis = ['😊', '😍', '👍', '❤️', '✨', '🙏', '😄', '🎉'];

  return (
    <div className="p-4">
      {/* チャンネル選択（複数チャンネルがある場合のみ表示） */}
      {availableChannels.length > 1 && (
        <div className="mb-3 flex items-center space-x-2">
          <span className="text-sm text-gray-600">送信先:</span>
          <div className="flex space-x-2">
            {availableChannels.map((channelType) => (
              <motion.button
                key={channelType}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedChannel(channelType)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedChannel === channelType
                    ? channelConfig[channelType].color + ' ring-2 ring-offset-1 ' + channelConfig[channelType].borderColor
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{channelConfig[channelType].icon}</span>
                {channelConfig[channelType].label}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* 絵文字クイック選択 */}
      <div className="mb-2 flex items-center space-x-1">
        {commonEmojis.map((emoji) => (
          <motion.button
            key={emoji}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => insertEmoji(emoji)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <span className="text-lg">{emoji}</span>
          </motion.button>
        ))}
        <button className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500">
          <FaceSmileIcon className="h-5 w-5" />
        </button>
      </div>

      {/* メッセージ入力エリア */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextChange}
          onKeyPress={handleKeyPress}
          placeholder={`${thread.customer.name}さんにメッセージを送信...`}
          className="w-full px-4 py-3 pr-24 bg-gray-100 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
          rows={1}
          disabled={isSending}
        />

        {/* アクションボタン */}
        <div className="absolute right-2 bottom-2 flex items-center space-x-2">
          {/* ファイル添付 */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isSending}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            {isUploading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
            ) : (
              <PaperClipIcon className="h-5 w-5" />
            )}
          </motion.button>
          
          {/* 画像添付 */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled={isUploading || isSending}
            className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            <PhotoIcon className="h-5 w-5" />
          </motion.button>

          {/* AI候補ボタン（AI パネルが開いている場合） */}
          {showAiPanel && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-purple-600 hover:text-purple-700 transition-colors"
            >
              <SparklesIcon className="h-5 w-5" />
            </motion.button>
          )}

          {/* 送信ボタン */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            className={`p-2 rounded-lg transition-all ${
              message.trim() && !isSending
                ? 'bg-primary-500 text-white hover:bg-primary-600'
                : 'bg-gray-300 text-gray-500'
            } disabled:opacity-50`}
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </motion.button>
        </div>
      </div>

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
      />

      {/* ヒントテキスト */}
      <div className="mt-2 text-xs text-gray-500">
        <span>Enter で送信、Shift + Enter で改行</span>
        {selectedChannel === 'line' && (
          <span className="ml-2">• LINEスタンプは画像として送信されます</span>
        )}
      </div>
    </div>
  );
}