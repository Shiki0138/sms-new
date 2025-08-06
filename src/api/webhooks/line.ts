// LINE Webhook API エンドポイント
// Vercel Functions または Express.js で利用

// Webhook イベントの型定義
interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'postback';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId: string;
    groupId?: string;
    roomId?: string;
  };
  replyToken?: string;
  message?: {
    id: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
    text?: string;
    packageId?: string;
    stickerId?: string;
  };
}

interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

// 署名検証（サーバーサイドのみ）
function validateSignature(body: string, signature: string, channelSecret: string): boolean {
  // Node.js環境でのみ実行
  if (typeof window !== 'undefined') {
    return true; // ブラウザ環境ではスキップ
  }
  
  const crypto = require('crypto');
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

// LINE APIへの返信
async function replyMessage(replyToken: string, messages: any[], accessToken: string) {
  const response = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: messages.slice(0, 5), // 最大5メッセージ
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to reply: ${response.statusText}`);
  }
}

// メッセージをデータベースに保存
async function saveMessage(event: LineWebhookEvent, tenantId: string) {
  // TODO: データベースに保存する実装
  console.log('Saving message to database:', { event, tenantId });
  
  // Supabaseやその他のデータベースに保存
  // const { data, error } = await supabase
  //   .from('messages')
  //   .insert({
  //     tenant_id: tenantId,
  //     channel_type: 'line',
  //     channel_id: event.source.userId,
  //     message_type: 'received',
  //     content: event.message?.text || '[メディア]',
  //     external_message_id: event.message?.id,
  //     sent_at: new Date(event.timestamp).toISOString(),
  //   });
}

// 自動応答の生成
function generateAutoReply(messageText: string): string {
  const lowerText = messageText.toLowerCase();
  
  // 予約関連
  if (lowerText.includes('予約') || lowerText.includes('空き') || lowerText.includes('時間')) {
    return 'ご予約ありがとうございます！\n\n予約状況の確認は以下のリンクからご確認いただけます。\nhttps://salon.example.com/booking\n\nお急ぎの場合はお電話でもお受けしております。';
  }
  
  // 営業時間
  if (lowerText.includes('営業') || lowerText.includes('時間') || lowerText.includes('開店')) {
    return '【営業時間のご案内】\n月〜土：9:00-19:00\n定休日：日曜日\n\n※祝日の営業についてはお問い合わせください。';
  }
  
  // 料金
  if (lowerText.includes('料金') || lowerText.includes('値段') || lowerText.includes('価格')) {
    return '料金についてのお問い合わせありがとうございます。\n\n詳しいメニュー・料金はこちらでご確認いただけます：\nhttps://salon.example.com/menu\n\nご不明な点がございましたらお気軽にお聞きください。';
  }
  
  // アクセス・場所
  if (lowerText.includes('場所') || lowerText.includes('住所') || lowerText.includes('アクセス')) {
    return '【アクセス情報】\n住所：東京都渋谷区...\n最寄駅：...\n\n詳しいアクセス方法はこちら：\nhttps://salon.example.com/access';
  }
  
  // デフォルト応答
  return 'メッセージありがとうございます！\n\n営業時間内（9:00-19:00）であれば、お返事させていただきます。\nお急ぎの場合はお電話でもお気軽にお問い合わせください。\n\n📞 03-XXXX-XXXX';
}

// Vercel API Routes用ハンドラー
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = JSON.stringify(req.body);
    const signature = req.headers['x-line-signature'];
    
    if (!signature) {
      return res.status(400).json({ error: 'No signature' });
    }

    // 環境変数からLINE設定を取得
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (!channelSecret || !accessToken) {
      console.error('LINE credentials not configured');
      return res.status(500).json({ error: 'Not configured' });
    }

    // 署名検証
    if (!validateSignature(body, signature, channelSecret)) {
      console.error('Invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const webhookBody: LineWebhookBody = req.body;
    
    // 各イベントを処理
    for (const event of webhookBody.events) {
      try {
        // メッセージイベントの場合
        if (event.type === 'message' && event.message?.type === 'text') {
          const messageText = event.message.text;
          
          // TODO: テナントIDを取得（LINEユーザーIDから）
          const tenantId = 'default-tenant'; // 実際はデータベースから取得
          
          // メッセージをデータベースに保存
          await saveMessage(event, tenantId);
          
          // 自動応答を生成
          const replyText = generateAutoReply(messageText || '');
          
          // 返信
          if (event.replyToken) {
            await replyMessage(
              event.replyToken,
              [{ type: 'text', text: replyText }],
              accessToken
            );
          }
        }
        
        // フォローイベントの場合
        else if (event.type === 'follow') {
          const welcomeMessage = `ご登録ありがとうございます！\n\n当サロンのLINE公式アカウントです。\n\n• 予約の確認・変更\n• 営業時間のお問い合わせ\n• その他ご質問\n\nなどお気軽にメッセージしてください。\n\n今後ともよろしくお願いいたします✨`;
          
          if (event.replyToken) {
            await replyMessage(
              event.replyToken,
              [{ type: 'text', text: welcomeMessage }],
              accessToken
            );
          }
        }
        
      } catch (eventError) {
        console.error('Error processing event:', eventError);
        // 個々のイベントエラーは続行
      }
    }
    
    res.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal error' });
  }
}