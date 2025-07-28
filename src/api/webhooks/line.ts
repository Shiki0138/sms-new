// LINE Webhook エンドポイント
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { handleLineWebhook } from '../../hooks/useMessages';

// LINE署名検証
function validateSignature(body: string, signature: string, channelSecret: string): boolean {
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 署名検証
    const signature = req.headers['x-line-signature'] as string;
    const channelSecret = process.env.LINE_CHANNEL_SECRET!;
    const body = JSON.stringify(req.body);

    if (!validateSignature(body, signature, channelSecret)) {
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