// マルチチャンネルメッセージング API
const express = require('express');
const router = express.Router();

// メッセージ送信API
router.post('/send', async (req, res) => {
  try {
    const { customerId, message, channel } = req.body;
    const customer = await getCustomerById(customerId);
    const targetChannel = channel || determinePreferredChannel(customer);
    
    const result = await sendMessage(customerId, message, targetChannel);
    
    res.json({
      success: true,
      sentChannel: targetChannel,
      messageId: result.messageId
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// 一斉送信API
router.post('/broadcast', async (req, res) => {
  try {
    const { message, excludeIds = [], conditions = {} } = req.body;
    const targetCustomers = await getTargetCustomers(conditions, excludeIds);
    const results = [];
    
    for (const customer of targetCustomers) {
      try {
        const channel = determinePreferredChannel(customer);
        const personalizedMessage = personalizeMessage(message, customer);
        const result = await sendMessage(customer.id, personalizedMessage, channel);
        
        results.push({
          customerId: customer.id,
          channel: channel,
          status: 'sent',
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          customerId: customer.id,
          status: 'failed',
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      totalSent: results.filter(r => r.status === 'sent').length,
      results: results
    });
  } catch (error) {
    res.status(500).json({ error: 'Broadcast failed' });
  }
});

// Webhook受信
router.post('/webhooks/line', async (req, res) => {
  try {
    const events = req.body.events || [];
    
    for (const event of events) {
      if (event.type === 'message') {
        await handleIncomingMessage({
          channel: 'line',
          customerId: event.source.userId,
          content: event.message.text || '',
          timestamp: new Date(event.timestamp)
        });
      }
    }
    
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ヘルパー関数
function determinePreferredChannel(customer) {
  if (customer.lineId) return 'line';
  if (customer.instagramId) return 'instagram';
  if (customer.phone) return 'sms';
  if (customer.email) return 'email';
  return 'sms';
}

async function sendMessage(customerId, message, channel) {
  // 開発環境ではモック送信
  if (process.env.NODE_ENV === 'development') {
    console.log(`[MOCK] ${channel}送信: ${customerId} - ${message}`);
    return { messageId: `${channel}_${Date.now()}` };
  }
  
  // 本番環境での実装
  const customer = await getCustomerById(customerId);
  
  switch (channel) {
    case 'line':
      return await sendLineMessage(customer.lineId, message);
    case 'sms':
      return await sendSMS(customer.phone, message);
    default:
      return { messageId: `${channel}_${Date.now()}` };
  }
}

function personalizeMessage(template, customer) {
  return template
    .replace(/\{customer_name\}/g, customer.name || 'お客様')
    .replace(/\{salon_name\}/g, 'Salon Lumière');
}

async function getCustomerById(customerId) {
  const dummyCustomers = {
    '1': { id: '1', name: '山田花子', phone: '090-1234-5678', lineId: 'line123' },
    '2': { id: '2', name: '佐藤美咲', phone: '080-9876-5432', instagramId: 'ig456' }
  };
  return dummyCustomers[customerId] || null;
}

async function getTargetCustomers(conditions, excludeIds) {
  const dummyCustomers = [
    { id: '1', name: '山田花子', phone: '090-1234-5678', type: 'vip' },
    { id: '2', name: '佐藤美咲', phone: '080-9876-5432', type: 'regular' }
  ];
  
  return dummyCustomers.filter(c => !excludeIds.includes(c.id));
}

async function handleIncomingMessage(messageData) {
  console.log('受信メッセージ:', messageData);
}

module.exports = router;