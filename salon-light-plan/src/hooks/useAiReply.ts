// AI返信機能のカスタムフック
import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { 
  AiSuggestion, 
  AiReplyRequest, 
  AiReplyResponse,
  MessageThread 
} from '../types/message';
import { getAiReplyService } from '../services/ai-reply-service';
import { supabase } from '../lib/supabase';

interface UseAiReplyOptions {
  monthlyLimit?: number;
  onSuccess?: (response: AiReplyResponse) => void;
  onError?: (error: Error) => void;
}

export function useAiReply(options: UseAiReplyOptions = {}) {
  const { monthlyLimit = 200, onSuccess, onError } = options;
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState<AiSuggestion | null>(null);
  const [aiUsageCount, setAiUsageCount] = useState<number>(0);

  // AI使用回数を取得
  const fetchUsageCount = useCallback(async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      
      const { count, error } = await supabase
        .from('ai_replies')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${currentMonth}-01`)
        .lte('created_at', `${currentMonth}-31`);

      if (error) throw error;
      setAiUsageCount(count || 0);
    } catch (error) {
      console.error('Error fetching AI usage count:', error);
    }
  }, []);

  // AI返信生成
  const generateMutation = useMutation({
    mutationFn: async (thread: MessageThread) => {
      // 使用制限チェック
      if (aiUsageCount >= monthlyLimit) {
        throw new Error('今月のAI返信使用回数が上限に達しました');
      }

      // 最新の受信メッセージを取得
      const latestReceivedMessage = thread.messages
        .filter(msg => msg.message_type === 'received')
        .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())[0];

      if (!latestReceivedMessage) {
        throw new Error('返信対象のメッセージが見つかりません');
      }

      // 顧客の来店履歴を取得
      const { data: visitHistory } = await supabase
        .from('reservations')
        .select('start_time, menu_content')
        .eq('customer_id', thread.customer.id)
        .eq('status', 'COMPLETED')
        .order('start_time', { ascending: false })
        .limit(5);

      // サロン情報を取得（実際の実装では認証情報から取得）
      const salonContext = {
        name: 'ビューティーサロン',
        services: ['カット', 'カラー', 'パーマ', 'トリートメント'],
        business_hours: {
          1: { open: '09:00', close: '18:00' },
          2: { open: '09:00', close: '18:00' },
          3: { open: '09:00', close: '18:00' },
          4: { open: '09:00', close: '18:00' },
          5: { open: '09:00', close: '18:00' },
          6: { open: '09:00', close: '17:00' },
          0: { closed: true },
        },
      };

      // AI返信リクエストを構築
      const request: AiReplyRequest = {
        message_id: latestReceivedMessage.id,
        original_message: latestReceivedMessage.content,
        customer_context: {
          name: thread.customer.name,
          visit_history: (visitHistory || []).map(v => ({
            date: new Date(v.start_time).toLocaleDateString('ja-JP'),
            menu: v.menu_content,
          })),
          preferences: undefined, // Customer preferences not available in thread
        },
        salon_context: salonContext,
      };

      // AI返信を生成
      const aiService = getAiReplyService();
      const response = await aiService.generateReplySuggestions(request);

      // 生成履歴を保存
      await supabase.from('ai_replies').insert({
        tenant_id: latestReceivedMessage.tenant_id,
        message_id: latestReceivedMessage.id,
        original_message: request.original_message,
        ai_suggestions: response.suggestions,
        is_sent: false,
      });

      return response;
    },
    onSuccess: (response) => {
      setSuggestions(response.suggestions);
      setAiUsageCount(prev => prev + 1);
      
      if (response.model_version === 'fallback') {
        toast('ネットワークエラーのため、基本的な返信候補を表示しています', {
          icon: '⚠️',
        });
      }

      onSuccess?.(response);
    },
    onError: (error: Error) => {
      console.error('AI reply generation error:', error);
      toast.error(error.message || 'AI返信の生成に失敗しました');
      onError?.(error);
    },
  });

  // 返信候補を選択
  const selectSuggestion = useCallback((suggestion: AiSuggestion) => {
    setSelectedSuggestion(suggestion);
  }, []);

  // フィードバックを送信
  const submitFeedback = useCallback(async (rating: number) => {
    if (!selectedSuggestion) return;

    try {
      await supabase
        .from('ai_replies')
        .update({ feedback_rating: rating })
        .eq('id', selectedSuggestion.id);

      // AIサービスにもフィードバックを送信
      const aiService = getAiReplyService();
      await aiService.saveFeedback(selectedSuggestion.id, rating);

      toast.success('フィードバックを送信しました');
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  }, [selectedSuggestion]);

  // 使用済み返信としてマーク
  const markAsUsed = useCallback(async (suggestionId: string) => {
    try {
      await supabase
        .from('ai_replies')
        .update({ is_sent: true })
        .eq('id', suggestionId);
    } catch (error) {
      console.error('Error marking reply as used:', error);
    }
  }, []);

  return {
    // State
    suggestions,
    selectedSuggestion,
    aiUsageCount,
    monthlyLimit,
    isGenerating: generateMutation.isPending,
    
    // Actions
    generateSuggestions: generateMutation.mutate,
    selectSuggestion,
    submitFeedback,
    markAsUsed,
    fetchUsageCount,
    
    // Computed
    remainingUsage: monthlyLimit - aiUsageCount,
    usagePercentage: (aiUsageCount / monthlyLimit) * 100,
    isNearLimit: aiUsageCount >= monthlyLimit * 0.8,
    isLimitReached: aiUsageCount >= monthlyLimit,
  };
}

// AI返信の学習データを取得（管理画面用）
export function useAiReplyAnalytics() {
  return useQuery({
    queryKey: ['ai-reply-analytics'],
    queryFn: async () => {
      // 評価の高い返信を取得
      const { data: highRatedReplies } = await supabase
        .from('ai_replies')
        .select('*')
        .gte('feedback_rating', 4)
        .order('created_at', { ascending: false })
        .limit(20);

      // 使用統計を取得
      const { data: usageStats } = await supabase
        .from('ai_replies')
        .select('created_at, feedback_rating')
        .order('created_at', { ascending: false });

      // トーン別の統計を計算
      const toneStats = {
        formal: { count: 0, avgRating: 0 },
        casual: { count: 0, avgRating: 0 },
        friendly: { count: 0, avgRating: 0 },
      };

      highRatedReplies?.forEach(reply => {
        reply.ai_suggestions?.forEach((suggestion: AiSuggestion) => {
          if (suggestion.tone && toneStats[suggestion.tone]) {
            toneStats[suggestion.tone].count++;
            if (reply.feedback_rating) {
              toneStats[suggestion.tone].avgRating += reply.feedback_rating;
            }
          }
        });
      });

      // 平均評価を計算
      Object.keys(toneStats).forEach(tone => {
        const stats = toneStats[tone as keyof typeof toneStats];
        if (stats.count > 0) {
          stats.avgRating = stats.avgRating / stats.count;
        }
      });

      return {
        highRatedReplies,
        usageStats,
        toneStats,
        totalUsage: usageStats?.length || 0,
        averageRating: usageStats
          ?.filter(s => s.feedback_rating)
          .reduce((acc, s) => acc + s.feedback_rating, 0) / 
          (usageStats?.filter(s => s.feedback_rating).length || 1),
      };
    },
  });
}