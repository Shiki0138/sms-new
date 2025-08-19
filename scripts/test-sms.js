#!/usr/bin/env node

const dotenv = require('dotenv');
const twilioService = require('../src/services/twilioService');

// 環境変数の読み込み
dotenv.config();

async function testSMS() {
  console.log('🧪 SMS送信テストを開始します...\n');
  
  // Twilio設定の確認
  console.log('📋 Twilio設定確認:');
  console.log(`Account SID: ${process.env.TWILIO_ACCOUNT_SID ? '設定済み' : '未設定'}`);
  console.log(`Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '設定済み' : '未設定'}`);
  console.log(`Phone Number: ${process.env.TWILIO_PHONE_NUMBER || '未設定'}\n`);
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log('❌ Twilio認証情報が設定されていません。');
    console.log('📝 .envファイルに以下を設定してください:');
    console.log('TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('TWILIO_PHONE_NUMBER=+8150xxxxxxxx');
    return;
  }
  
  try {
    // テスト用電話番号（実際の番号に変更してください）
    const testPhoneNumber = '+819012345678'; // ← ここを実際の番号に変更
    
    console.log('📱 SMS送信テスト実行中...');
    
    const result = await twilioService.sendSMS({
      to: testPhoneNumber,
      message: 'Salon Lumière SMSシステムのテストメッセージです。🌟'
    });
    
    console.log('✅ SMS送信成功！');
    console.log('📄 送信結果:', {
      messageId: result.messageId,
      status: result.status,
      to: result.to
    });
    
    // 送信ステータスの確認
    console.log('\n⏳ 送信ステータス確認中...');
    setTimeout(async () => {
      try {
        const status = await twilioService.checkStatus(result.messageId);
        console.log('📊 最新ステータス:', status);
      } catch (error) {
        console.log('⚠️  ステータス確認エラー:', error.message);
      }
    }, 3000);
    
  } catch (error) {
    console.log('❌ SMS送信エラー:', error.message);
    
    // よくあるエラーのトラブルシューティング
    if (error.message.includes('phone number')) {
      console.log('\n🔧 トラブルシューティング:');
      console.log('- 電話番号は国際形式（+81...）で入力してください');
      console.log('- Twilioで購入した番号からのみ送信可能です');
    }
    
    if (error.message.includes('credentials')) {
      console.log('\n🔧 トラブルシューティング:');
      console.log('- Account SIDとAuth Tokenを確認してください');
      console.log('- Twilioコンソールの「Account Info」から取得できます');
    }
  }
}

// 一括送信テスト
async function testBulkSMS() {
  console.log('\n📨 一括SMS送信テスト...');
  
  const recipients = [
    { phone: '+819012345678', message: 'テストメッセージ1' },
    { phone: '+819087654321', message: 'テストメッセージ2' }
  ];
  
  try {
    const results = await twilioService.sendBulkSMS(recipients);
    console.log('📊 一括送信結果:', results);
  } catch (error) {
    console.log('❌ 一括送信エラー:', error.message);
  }
}

// メイン実行
async function main() {
  await testSMS();
  
  // 一括送信テストも実行する場合はコメントアウト
  // await testBulkSMS();
  
  console.log('\n🎉 テスト完了！');
}

main().catch(console.error);