const twilio = require('twilio');
const logger = require('../utils/logger');

class TwilioService {
  constructor() {
    this.client = null;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.isEnabled = false;
    
    // Twilioの設定を確認
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.isEnabled = true;
        logger.info('Twilio service initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Twilio:', error);
      }
    } else {
      logger.info('Twilio credentials not configured - SMS機能は無効です');
    }
  }

  /**
   * SMS送信
   * @param {Object} params - 送信パラメータ
   * @param {string} params.to - 送信先電話番号（国際形式）
   * @param {string} params.message - メッセージ内容
   * @returns {Promise<Object>} - 送信結果
   */
  async sendSMS({ to, message }) {
    if (!this.isEnabled) {
      logger.warn('SMS送信をスキップ（Twilio未設定）:', { to, message });
      return {
        success: false,
        error: 'SMS機能は現在利用できません（Twilio未設定）',
        to: to,
        skipped: true
      };
    }

    try {
      // 電話番号の検証
      const formattedNumber = this.formatPhoneNumber(to);
      
      // メッセージ送信
      const result = await this.client.messages.create({
        body: message,
        from: this.phoneNumber,
        to: formattedNumber
      });

      logger.info('SMS sent successfully', {
        sid: result.sid,
        to: formattedNumber,
        status: result.status
      });

      return {
        success: true,
        messageId: result.sid,
        status: result.status,
        to: formattedNumber
      };
    } catch (error) {
      logger.error('SMS sending failed:', error);
      throw new Error(`SMS送信に失敗しました: ${error.message}`);
    }
  }

  /**
   * 電話番号を国際形式に変換
   * @param {string} phoneNumber - 電話番号
   * @returns {string} - 国際形式の電話番号
   */
  formatPhoneNumber(phoneNumber) {
    // 既に国際形式の場合はそのまま返す
    if (phoneNumber.startsWith('+')) {
      return phoneNumber;
    }

    // 日本の電話番号の場合、+81を追加
    let formatted = phoneNumber.replace(/[^0-9]/g, '');
    
    // 先頭の0を削除
    if (formatted.startsWith('0')) {
      formatted = formatted.substring(1);
    }

    return `+81${formatted}`;
  }

  /**
   * 送信ステータスの確認
   * @param {string} messageSid - メッセージSID
   * @returns {Promise<Object>} - ステータス情報
   */
  async checkStatus(messageSid) {
    if (!this.isEnabled) {
      throw new Error('Twilio service is not configured');
    }

    try {
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage,
        dateSent: message.dateSent,
        price: message.price
      };
    } catch (error) {
      logger.error('Failed to check message status:', error);
      throw error;
    }
  }

  /**
   * 一括SMS送信
   * @param {Array} recipients - 送信先リスト [{phone, message}]
   * @returns {Promise<Array>} - 送信結果リスト
   */
  async sendBulkSMS(recipients) {
    const results = [];
    
    for (const recipient of recipients) {
      try {
        const result = await this.sendSMS({
          to: recipient.phone,
          message: recipient.message
        });
        results.push({
          phone: recipient.phone,
          ...result
        });
      } catch (error) {
        results.push({
          phone: recipient.phone,
          success: false,
          error: error.message
        });
      }
      
      // レート制限対策（1秒間隔）
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}

module.exports = new TwilioService();