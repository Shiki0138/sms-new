// AI返信支援サービス
import { AiSuggestion, AiReplyRequest, AiReplyResponse } from '../types/message';

// OpenAI APIクライアント設定
interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

// 美容業界専用のプロンプトテンプレート
const SALON_SYSTEM_PROMPT = `
あなたは美容サロンのスタッフとして、お客様からのメッセージに返信するアシスタントです。
以下の点に注意して返信を作成してください：

1. 丁寧で親しみやすい対応
2. 美容業界の専門知識を活用
3. お客様の要望を正確に理解
4. 具体的な提案や解決策の提示
5. 適切な絵文字の使用（過度にならない程度）

サロン情報：
- 営業時間、メニュー、料金などの正確な情報提供
- 予約の確認・変更対応
- アフターケアのアドバイス
`;

// トーン別のプロンプト修飾子
const TONE_MODIFIERS = {
  formal: '丁寧語・敬語を使用し、プロフェッショナルな印象で',
  casual: 'です・ます調で親しみやすく、フレンドリーな雰囲気で',
  friendly: '絵文字を適度に使い、温かみのある親近感のある口調で',
};

export class AiReplyService {
  private config: OpenAIConfig;

  constructor(config: Partial<OpenAIConfig> = {}) {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: config.model || 'gpt-4-turbo-preview',
      maxTokens: config.maxTokens || 300,
      temperature: config.temperature || 0.7,
    };
  }

  // AI返信候補を生成
  async generateReplySuggestions(request: AiReplyRequest): Promise<AiReplyResponse> {
    const startTime = Date.now();

    try {
      // 顧客コンテキストを構築
      const customerContext = this.buildCustomerContext(request);
      
      // 3つの異なるトーンで返信を生成
      const suggestions = await Promise.all([
        this.generateSingleReply(request, 'formal', customerContext),
        this.generateSingleReply(request, 'casual', customerContext),
        this.generateSingleReply(request, 'friendly', customerContext),
      ]);

      return {
        suggestions: suggestions.filter(s => s !== null) as AiSuggestion[],
        processing_time: Date.now() - startTime,
        model_version: this.config.model,
      };
    } catch (error) {
      console.error('AI reply generation error:', error);
      
      // フォールバック返信を提供
      return {
        suggestions: this.getFallbackSuggestions(request.original_message),
        processing_time: Date.now() - startTime,
        model_version: 'fallback',
      };
    }
  }

  // 単一の返信を生成
  private async generateSingleReply(
    request: AiReplyRequest,
    tone: 'formal' | 'casual' | 'friendly',
    customerContext: string
  ): Promise<AiSuggestion | null> {
    try {
      const prompt = this.buildPrompt(request, tone, customerContext);
      
      // OpenAI API呼び出し（実際の実装）
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: SALON_SYSTEM_PROMPT },
            { role: 'user', content: prompt },
          ],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();

      if (!content) {
        return null;
      }

      return {
        id: crypto.randomUUID(),
        content,
        confidence: this.calculateConfidence(content, request.original_message),
        tone,
      };
    } catch (error) {
      console.error(`Error generating ${tone} reply:`, error);
      return null;
    }
  }

  // プロンプトを構築
  private buildPrompt(
    request: AiReplyRequest,
    tone: 'formal' | 'casual' | 'friendly',
    customerContext: string
  ): string {
    return `
お客様情報：
${customerContext}

お客様からのメッセージ：
「${request.original_message}」

${TONE_MODIFIERS[tone]}返信を作成してください。

サロン営業情報：
- 営業時間: ${this.formatBusinessHours(request.salon_context.business_hours)}
- 提供サービス: ${request.salon_context.services.join('、')}

注意事項：
- 予約に関する質問の場合は、空き状況を確認する旨を伝える
- 技術的な質問には専門知識を活かして回答
- 次回来店を促す自然な提案を含める
`;
  }

  // 顧客コンテキストを構築
  private buildCustomerContext(request: AiReplyRequest): string {
    const { customer_context } = request;
    let context = `名前: ${customer_context.name}\n`;

    if (customer_context.visit_history.length > 0) {
      context += '来店履歴:\n';
      customer_context.visit_history.slice(-3).forEach(visit => {
        context += `- ${visit.date}: ${visit.menu}\n`;
      });
    }

    if (customer_context.preferences) {
      context += `好み・注意事項: ${customer_context.preferences}\n`;
    }

    return context;
  }

  // 営業時間をフォーマット
  private formatBusinessHours(hours: Record<string, any>): string {
    const days = ['月', '火', '水', '木', '金', '土', '日'];
    return days
      .map((day, index) => {
        const hour = hours[index];
        if (!hour || hour.closed) return `${day}:定休`;
        return `${day}:${hour.open}-${hour.close}`;
      })
      .join(' ');
  }

  // 返信の信頼度を計算
  private calculateConfidence(reply: string, originalMessage: string): number {
    let confidence = 0.7; // ベースライン

    // 質問に対する回答の適切性をチェック
    if (originalMessage.includes('？') || originalMessage.includes('?')) {
      if (reply.includes('はい') || reply.includes('いいえ') || reply.includes('可能')) {
        confidence += 0.1;
      }
    }

    // 予約関連キーワードのマッチング
    const reservationKeywords = ['予約', '空き', '時間', '変更', 'キャンセル'];
    if (reservationKeywords.some(kw => originalMessage.includes(kw))) {
      if (reservationKeywords.some(kw => reply.includes(kw))) {
        confidence += 0.15;
      }
    }

    // 返信の長さが適切か
    if (reply.length >= 30 && reply.length <= 200) {
      confidence += 0.05;
    }

    return Math.min(confidence, 0.99);
  }

  // フォールバック返信を提供
  private getFallbackSuggestions(originalMessage: string): AiSuggestion[] {
    const suggestions: AiSuggestion[] = [];

    // 予約関連
    if (originalMessage.includes('予約') || originalMessage.includes('空き')) {
      suggestions.push({
        id: '1',
        content: 'ご連絡ありがとうございます。予約の空き状況を確認させていただきますので、ご希望の日時をいくつかお教えいただけますでしょうか？',
        confidence: 0.8,
        tone: 'formal',
      });
      suggestions.push({
        id: '2',
        content: 'お問い合わせありがとうございます！😊 空き状況を確認しますね。ご希望の日時はありますか？',
        confidence: 0.8,
        tone: 'casual',
      });
    } 
    // 挨拶
    else if (originalMessage.match(/こんにちは|はじめまして|お世話になって/)) {
      suggestions.push({
        id: '1',
        content: 'こんにちは！ご連絡ありがとうございます。どのようなご用件でしょうか？お気軽にお申し付けください。',
        confidence: 0.9,
        tone: 'formal',
      });
      suggestions.push({
        id: '2',
        content: 'こんにちは〜！💕 ご連絡嬉しいです！今日はどんなご用件ですか？',
        confidence: 0.9,
        tone: 'friendly',
      });
    }
    // デフォルト
    else {
      suggestions.push({
        id: '1',
        content: 'ご連絡ありがとうございます。お問い合わせ内容について確認させていただきます。少々お待ちください。',
        confidence: 0.6,
        tone: 'formal',
      });
      suggestions.push({
        id: '2',
        content: 'メッセージありがとうございます！確認して返信させていただきますね😊',
        confidence: 0.6,
        tone: 'casual',
      });
    }

    // 常に3つの候補を返す
    while (suggestions.length < 3) {
      suggestions.push({
        id: String(suggestions.length + 1),
        content: 'ご連絡ありがとうございます。詳しくお伺いさせていただけますでしょうか？',
        confidence: 0.5,
        tone: 'formal',
      });
    }

    return suggestions.slice(0, 3);
  }

  // 美容業界特化の返信テンプレート
  getTemplateReplies(category: string): string[] {
    const templates: Record<string, string[]> = {
      // 予約確認
      reservation_confirm: [
        '〇〇様、ご予約ありがとうございます！〇月〇日〇時からお待ちしております✨',
        'ご予約承りました。当日を楽しみにしています！何かご不明点があればお気軽にどうぞ。',
        '予約完了です💕 〇〇のメニューでお取りしました。変更等ございましたらご連絡ください。',
      ],
      
      // 予約変更
      reservation_change: [
        '承知いたしました。ご希望の日時をいくつかお教えいただけますか？',
        '変更承ります！新しいご希望日時を教えてください😊',
        'もちろん大丈夫です。いつがご都合よろしいでしょうか？',
      ],
      
      // アフターケア
      aftercare: [
        '仕上がりはいかがですか？ホームケアでご不明な点があればいつでもご相談ください✨',
        'ご来店ありがとうございました！スタイリングで困ったことがあれば遠慮なくメッセージください💕',
        '本日はありがとうございました。次回は〇〇もおすすめです。またお待ちしています！',
      ],
      
      // 技術相談
      technical: [
        'そのお悩み、よくわかります。実は〇〇という方法がおすすめです。詳しくは来店時にご説明しますね！',
        'いいご質問ですね！〇〇の場合は△△がおすすめです。お客様の髪質に合わせて最適な方法をご提案します😊',
        'なるほど！それなら〇〇メニューがぴったりかもしれません。詳しくカウンセリングさせていただきますね。',
      ],
    };

    return templates[category] || templates.reservation_confirm;
  }

  // 学習データを保存（フィードバックを基に改善）
  async saveFeedback(
    suggestionId: string,
    rating: number,
    actualReply?: string
  ): Promise<void> {
    // TODO: フィードバックデータをSupabaseに保存
    // このデータを使って、将来的にファインチューニングを行う
    console.log('Saving feedback:', { suggestionId, rating, actualReply });
  }
}

// シングルトンインスタンス
let aiReplyService: AiReplyService | null = null;

export function getAiReplyService(): AiReplyService {
  if (!aiReplyService) {
    aiReplyService = new AiReplyService();
  }
  return aiReplyService;
}