// メッセージ関連のカスタムフック
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { 
  Message, 
  MessageThread, 
  MessageChannel, 
  MessageFilter,
  MessageSendRequest,
  ChannelType 
} from '../types/message';
import { toast } from 'react-hot-toast';

// Supabaseリアルタイム接続を使用してメッセージを監視
export function useRealtimeMessages(tenantId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;

    // メッセージテーブルの変更を監視
    const channel = supabase
      .channel(`messages:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          console.log('New message received:', payload);
          
          // 新着メッセージの場合、キャッシュを更新
          if (payload.eventType === 'INSERT') {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['message-threads'] });
            
            // 新着メッセージ通知
            if (payload.new.message_type === 'received') {
              toast('新着メッセージがあります', {
                icon: '💬',
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);
}

// メッセージスレッド一覧を取得
export function useMessageThreads(filter?: MessageFilter) {
  return useQuery({
    queryKey: ['message-threads', filter],
    queryFn: async () => {
      // 1. 顧客ごとの最新メッセージを取得
      let query = supabase
        .from('messages')
        .select(`
          *,
          customer:customers!customer_id(*),
          channel:message_channels!channel_id(*)
        `)
        .order('sent_at', { ascending: false });

      // フィルター適用
      if (filter?.channel_types && filter.channel_types.length > 0) {
        query = query.in('channel.channel_type', filter.channel_types);
      }

      if (filter?.search_query) {
        query = query.or(`content.ilike.%${filter.search_query}%,customer.name.ilike.%${filter.search_query}%`);
      }

      const { data: messages, error } = await query;

      if (error) throw error;

      // 2. 顧客ごとにグループ化してスレッドを作成
      const threadsMap = new Map<string, MessageThread>();

      messages?.forEach((message) => {
        const customerId = message.customer_id;
        
        if (!threadsMap.has(customerId)) {
          threadsMap.set(customerId, {
            customer: message.customer,
            channels: [],
            messages: [],
            unread_count: 0,
            latest_message_at: message.sent_at,
          });
        }

        const thread = threadsMap.get(customerId)!;
        
        // チャンネル情報を追加（重複を避ける）
        if (message.channel && !thread.channels.find(ch => ch.id === message.channel.id)) {
          thread.channels.push(message.channel);
        }

        // メッセージを追加
        thread.messages.push(message);

        // 未読数をカウント
        if (!message.is_read && message.message_type === 'received') {
          thread.unread_count++;
        }

        // 最新メッセージ時刻を更新
        if (new Date(message.sent_at) > new Date(thread.latest_message_at)) {
          thread.latest_message_at = message.sent_at;
        }
      });

      // 3. 配列に変換してソート
      const threads = Array.from(threadsMap.values()).sort(
        (a, b) => new Date(b.latest_message_at).getTime() - new Date(a.latest_message_at).getTime()
      );

      return threads;
    },
    refetchInterval: 30000, // 30秒ごとに更新
  });
}

// 特定の顧客とのメッセージ履歴を取得
export function useMessages(customerId: string) {
  return useQuery({
    queryKey: ['messages', customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          channel:message_channels!channel_id(*)
        `)
        .eq('customer_id', customerId)
        .order('sent_at', { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!customerId,
  });
}

// メッセージを送信
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: MessageSendRequest) => {
      // 1. チャンネル情報を取得
      const { data: channel, error: channelError } = await supabase
        .from('message_channels')
        .select('*')
        .eq('id', request.channel_id)
        .single();

      if (channelError) throw channelError;

      // 2. チャンネルタイプに応じて外部APIを呼び出し
      switch (channel.channel_type) {
        case 'line':
          // LINE APIを使用して送信
          const response = await fetch('/api/messages/line/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: channel.channel_id,
              message: request.content,
              mediaUrl: request.media_url,
            }),
          });
          if (!response.ok) throw new Error('LINE送信エラー');
          break;

        case 'instagram':
          // Instagram APIを使用して送信
          // Instagram APIは将来の実装予定
          break;

        case 'email':
          // メール送信
          // メール送信は将来の実装予定
          break;
      }

      // 3. データベースに保存
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          tenant_id: channel.tenant_id,
          customer_id: channel.customer_id,
          channel_id: request.channel_id,
          message_type: 'sent',
          content: request.content,
          media_url: request.media_url,
          media_type: request.media_type,
          is_read: true,
          is_ai_reply: request.is_ai_reply || false,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (messageError) throw messageError;
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
      toast.success('メッセージを送信しました');
    },
    onError: (error) => {
      console.error('Send message error:', error);
      toast.error('メッセージの送信に失敗しました');
    },
  });
}

// メッセージを既読にする
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .in('id', messageIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['message-threads'] });
    },
  });
}

// LINE Webhookイベントを処理
export async function handleLineWebhook(event: any) {
  try {
    // LINE APIサービスを使用してイベントを処理
    const { data: profile } = await fetch('/api/line/profile/' + event.source.userId).then(res => res.json());

    // チャンネルが存在するか確認
    const { data: existingChannel } = await supabase
      .from('message_channels')
      .select('*')
      .eq('channel_type', 'line')
      .eq('channel_id', event.source.userId)
      .single();

    let channelId = existingChannel?.id;

    let customerId: string | undefined;
    
    // チャンネルが存在しない場合は作成
    if (!existingChannel) {
      // 顧客を検索または作成
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('name', profile.displayName)
        .single();

      if (!customer) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            tenant_id: tenantId,
            name: profile.displayName,
          })
          .select()
          .single();
        customerId = newCustomer?.id;
      } else {
        customerId = customer.id;
      }

      // チャンネルを作成
      const { data: newChannel } = await supabase
        .from('message_channels')
        .insert({
          tenant_id: tenantId,
          customer_id: customerId,
          channel_type: 'line',
          channel_id: event.source.userId,
          channel_name: profile.displayName,
        })
        .select()
        .single();
      
      channelId = newChannel?.id;
    }

    // メッセージを保存
    if (event.type === 'message' && channelId) {
      await supabase
        .from('messages')
        .insert({
          tenant_id: tenantId,
          customer_id: existingChannel?.customer_id || customerId,
          channel_id: channelId,
          message_type: 'received',
          content: event.message.text || '[メディア]',
          external_message_id: event.message.id,
          sent_at: new Date(event.timestamp).toISOString(),
        });
    }
  } catch (error) {
    console.error('LINE webhook error:', error);
    throw error;
  }
}