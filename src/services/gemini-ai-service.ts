import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AiReplyOptions {
  messageContent: string;
  customerName?: string;
  conversationContext?: string;
  responseType: 'inquiry_response' | 'booking_response' | 'general_response';
  tone?: 'formal' | 'casual' | 'friendly';
  messageType?: string;
  customerHistory?: string;
  salonInfo?: {
    name?: string;
    businessHours?: string;
    phone?: string;
    services?: string[];
  };
}

export interface AiReplyResult {
  suggestedReply: string;
  confidence: number;
  detectedIntent: string;
  suggestedActions: Array<{
    type: string;
    label: string;
    data: any;
  }>;
}

export class GeminiAiService {
  private apiKey: string;
  private model: any;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * 美容室向けの自動返信文を生成
   */
  async generateSalonReply(options: AiReplyOptions): Promise<AiReplyResult> {
    try {
      const prompt = this.buildSalonPrompt(options);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // レスポンスをパース
      const parsedResponse = this.parseAiResponse(text);
      
      return {
        suggestedReply: parsedResponse.reply,
        confidence: parsedResponse.confidence,
        detectedIntent: parsedResponse.intent,
        suggestedActions: parsedResponse.actions,
      };
    } catch (error) {
      console.error('Error generating AI reply:', error);
      return this.getFallbackReply(options);
    }
  }

  /**
   * 予約関連メッセージの解析
   */
  async analyzeBookingMessage(messageContent: string): Promise<{
    isBookingRequest: boolean;
    extractedInfo?: {
      preferredDate?: string;
      preferredTime?: string;
      serviceType?: string;
      customerRequests?: string;
    };
    confidence: number;
  }> {
    try {
      const prompt = `
以下の美容室への顧客メッセージを分析し、予約に関する情報を抽出してください。

メッセージ: "${messageContent}"

以下のJSON形式で回答してください：
{
  "isBookingRequest": true/false,
  "extractedInfo": {
    "preferredDate": "YYYY-MM-DD形式または相対的な表現",
    "preferredTime": "HH:MM形式または時間帯",
    "serviceType": "カット、カラー、パーマなどのサービス名",
    "customerRequests": "お客様の具体的な要望"
  },
  "confidence": 0.0-1.0の数值
}

メッセージが予約に関連しない場合は、isBookingRequestをfalseにしてください。
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
        return parsed;
      } catch (parseError) {
        console.error('Error parsing booking analysis:', parseError);
        return {
          isBookingRequest: false,
          confidence: 0,
        };
      }
    } catch (error) {
      console.error('Error analyzing booking message:', error);
      return {
        isBookingRequest: false,
        confidence: 0,
      };
    }
  }

  /**
   * 顧客の感情分析
   */
  async analyzeSentiment(messageContent: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    emotion: string;
    urgency: 'low' | 'medium' | 'high';
    confidence: number;
  }> {
    try {
      const prompt = `
以下の美容室への顧客メッセージの感情を分析してください。

メッセージ: "${messageContent}"

以下のJSON形式で回答してください：
{
  "sentiment": "positive/neutral/negative",
  "emotion": "感情の詳細（喜び、不満、期待など）",
  "urgency": "low/medium/high",
  "confidence": 0.0-1.0の数値
}
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
        return parsed;
      } catch (parseError) {
        return {
          sentiment: 'neutral',
          emotion: '不明',
          urgency: 'low',
          confidence: 0.5,
        };
      }
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      return {
        sentiment: 'neutral',
        emotion: '不明',
        urgency: 'low',
        confidence: 0.5,
      };
    }
  }

  /**
   * 美容室向けプロンプトの構築
   */
  private buildSalonPrompt(options: AiReplyOptions): string {
    const { messageContent, customerName, customerHistory, tone = 'friendly', messageType = 'general', salonInfo } = options;

    const toneInstructions = {
      formal: '丁寧語を使用し、敬語を適切に使った礼儀正しい返信',
      casual: 'フレンドリーで親しみやすい、少しカジュアルな返信',
      friendly: '温かみがあり、顧客との関係性を重視した親近感のある返信'
    };

    const basePrompt = `
あなたは美容室の受付スタッフとして、顧客からのメッセージに返信を作成します。

## 基本情報
- サロン名: ${salonInfo?.name || '美容室'}
- 営業時間: ${salonInfo?.businessHours || '9:00-18:00'}
- 電話番号: ${salonInfo?.phone || ''}
- 提供サービス: ${salonInfo?.services?.join('、') || 'カット、カラー、パーマ、トリートメント'}

## 顧客情報
- お客様名: ${customerName || ''}
- 過去の履歴: ${customerHistory || '新規のお客様'}

## メッセージ内容
"${messageContent}"

## 返信の指示
- トーン: ${toneInstructions[tone]}
- メッセージタイプ: ${messageType}
- 150文字以内で簡潔に
- 美容室らしい専門性と温かさを表現
- 絵文字を適度に使用（2-3個程度）
- 具体的なアクションがある場合は提案する

## 必須事項
- 顧客の名前を使って親近感を演出（名前がある場合）
- 美容室の営業時間内での対応を基本とする
- 予約関連の場合は具体的な日時の提案
- クレーム系の場合は誠意を持った対応

以下のJSON形式で回答してください：
{
  "reply": "返信メッセージ",
  "intent": "メッセージの意図（予約希望、問い合わせ、クレーム、etc）",
  "confidence": 0.0-1.0の信頼度,
  "actions": [
    {
      "type": "create_booking/send_menu/schedule_callback",
      "label": "アクションボタンのラベル",
      "data": {}
    }
  ]
}
`;

    return basePrompt;
  }

  /**
   * AIレスポンスの解析
   */
  private parseAiResponse(text: string): {
    reply: string;
    intent: string;
    confidence: number;
    actions?: Array<any>;
  } {
    try {
      // JSONブロックを抽出
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonText = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonText);
        return {
          reply: parsed.reply || parsed.response || text,
          intent: parsed.intent || 'general',
          confidence: parsed.confidence || 0.8,
          actions: parsed.actions || [],
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // フォールバック: プレーンテキストとして処理
    return {
      reply: text.replace(/```json\n?|\n?```/g, '').trim(),
      intent: 'general',
      confidence: 0.6,
      actions: [],
    };
  }

  /**
   * フォールバック返信
   */
  private getFallbackReply(options: AiReplyOptions): AiReplyResult {
    const { customerName, messageType = 'general' } = options;
    const name = customerName ? `${customerName}様` : 'お客様';

    const fallbackReplies: Record<string, string> = {
      inquiry: `${name}、お問い合わせありがとうございます！詳細については、お電話でご相談いただけますでしょうか？📞`,
      booking: `${name}、ご予約のお問い合わせありがとうございます！お時間を確認して折り返しご連絡いたします✨`,
      complaint: `${name}、ご不便をおかけして申し訳ございません。すぐに確認いたしますので、少々お待ちください🙏`,
      compliment: `${name}、温かいお言葉をありがとうございます！スタッフ一同、大変嬉しく思います💕`,
      general: `${name}、メッセージありがとうございます！確認してご返信いたします😊`,
    };

    return {
      suggestedReply: fallbackReplies[messageType] || fallbackReplies.general,
      confidence: 0.5,
      detectedIntent: messageType,
      suggestedActions: [],
    };
  }

  /**
   * カスタムプロンプトでの生成
   */
  async generateCustomReply(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating custom reply:', error);
      return '申し訳ございませんが、返信の生成中にエラーが発生しました。';
    }
  }

  /**
   * 複数の返信候補を生成
   */
  async generateMultipleReplies(options: AiReplyOptions, count: number = 3): Promise<AiReplyResult[]> {
    const promises = Array.from({ length: count }, () => this.generateSalonReply(options));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<AiReplyResult> => result.status === 'fulfilled')
      .map(result => result.value);
  }
}