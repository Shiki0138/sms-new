// LINE Webhook エンドポイント
import crypto from 'crypto';
import { handleLineWebhook } from '../../hooks/useMessages';

interface VercelRequest {
  method?: string;
  body: any;
  headers: any;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
}

// LINE署名検証
function validateSignature(body: string, signature: string, channelSecret: string): boolean {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // セキュリティヘッダーを追加
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 必須環境変数チェック
    const channelSecret = process.env.LINE_CHANNEL_SECRET;
    if (!channelSecret) {
      console.error('LINE_CHANNEL_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // 署名検証（本番環境では必須）
    const signature = req.headers['x-line-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing signature header' });
    }

    const body = JSON.stringify(req.body);
    if (!validateSignature(body, signature, channelSecret)) {
      console.warn('Invalid LINE webhook signature detected');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // イベントを処理
    const { events } = req.body;
    
    for (const event of events) {
      await handleLineWebhook(event);
    }

    // LINEプラットフォームに成功を返す
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('LINE webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}