import { ApiIntegration, Message, MessageChannel } from '../types/message';

// メール統合管理サービス（ライトプラン向け）
export class EmailApiService {
  private smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  private imapConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  constructor(integration: ApiIntegration) {
    // 設定情報を取得
    const credentials = integration.api_credentials;
    
    this.smtpConfig = {
      host: credentials.smtp_host || 'smtp.gmail.com',
      port: parseInt(credentials.smtp_port) || 587,
      secure: credentials.smtp_secure === 'true',
      auth: {
        user: credentials.email_user || '',
        pass: credentials.email_password || '',
      },
    };

    this.imapConfig = {
      host: credentials.imap_host || 'imap.gmail.com',
      port: parseInt(credentials.imap_port) || 993,
      secure: credentials.imap_secure !== 'false',
      auth: {
        user: credentials.email_user || '',
        pass: credentials.email_password || '',
      },
    };
  }

  /**
   * メール送信（SMTP）
   */
  async sendEmail(to: string, subject: string, content: string, options?: {
    html?: string;
    attachments?: Array<{
      filename: string;
      content: string | Buffer;
      contentType: string;
    }>;
  }): Promise<void> {
    try {
      // 開発環境ではモック実装
      if (import.meta.env.DEV) {
        console.log('Mock Email Sent:', {
          to,
          subject,
          content,
          html: options?.html,
          attachments: options?.attachments?.length || 0,
        });
        return;
      }

      // 実際のメール送信実装（nodemailer等を使用）
      // TODO: 本番環境では実際のSMTPサービスと連携
      throw new Error('Email service not implemented in production');
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * 受信メールを取得（IMAP）
   */
  async getReceivedEmails(limit: number = 20): Promise<Message[]> {
    try {
      // 開発環境ではモックデータを返す
      if (import.meta.env.DEV) {
        return this.getMockEmails();
      }

      // 実際のIMAP実装
      // TODO: 本番環境では実際のIMAPサービスと連携
      throw new Error('Email retrieval service not implemented in production');
    } catch (error) {
      console.error('Error retrieving emails:', error);
      return [];
    }
  }

  /**
   * 予約確認メールテンプレート
   */
  generateReservationConfirmationEmail(reservation: {
    customerName: string;
    date: string;
    time: string;
    menu: string;
    price: number;
    salonName: string;
  }): { subject: string; content: string; html: string } {
    const subject = `【${reservation.salonName}】ご予約確認のお知らせ`;
    
    const content = `
${reservation.customerName} 様

いつもありがとうございます。
ご予約を承りましたので、詳細をお知らせいたします。

■ ご予約詳細 ■
お客様名：${reservation.customerName} 様
日時：${reservation.date} ${reservation.time}
メニュー：${reservation.menu}
料金：¥${reservation.price.toLocaleString()}

ご来店をスタッフ一同心よりお待ちしております。

何かご不明点がございましたら、お気軽にお問い合わせください。

${reservation.salonName}
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ご予約確認</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #6366f1, #d97706); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6b7280; }
        .reservation-details { background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
        .label { font-weight: bold; color: #4338ca; }
        .value { color: #1f2937; }
        .highlight { background: #fef3c7; padding: 2px 8px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ご予約確認</h1>
            <p>ありがとうございます</p>
        </div>
        <div class="content">
            <p>${reservation.customerName} 様</p>
            <p>いつもありがとうございます。<br>
            ご予約を承りましたので、詳細をお知らせいたします。</p>
            
            <div class="reservation-details">
                <h3 style="margin-top: 0; color: #4338ca;">ご予約詳細</h3>
                <div class="detail-row">
                    <span class="label">お客様名：</span>
                    <span class="value">${reservation.customerName} 様</span>
                </div>
                <div class="detail-row">
                    <span class="label">日時：</span>
                    <span class="value highlight">${reservation.date} ${reservation.time}</span>
                </div>
                <div class="detail-row">
                    <span class="label">メニュー：</span>
                    <span class="value">${reservation.menu}</span>
                </div>
                <div class="detail-row">
                    <span class="label">料金：</span>
                    <span class="value highlight">¥${reservation.price.toLocaleString()}</span>
                </div>
            </div>
            
            <p>ご来店をスタッフ一同心よりお待ちしております。</p>
            <p>何かご不明点がございましたら、お気軽にお問い合わせください。</p>
        </div>
        <div class="footer">
            <p>${reservation.salonName}</p>
            <p>このメールは予約システムから自動送信されています</p>
        </div>
    </div>
</body>
</html>
`;

    return { subject, content, html };
  }

  /**
   * リマインダーメールテンプレート
   */
  generateReminderEmail(reservation: {
    customerName: string;
    date: string;
    time: string;
    menu: string;
    salonName: string;
    salonPhone?: string;
  }, daysBeforeVisit: number): { subject: string; content: string; html: string } {
    const timeText = daysBeforeVisit === 0 ? '本日' : `${daysBeforeVisit}日後`;
    const subject = `【${reservation.salonName}】${timeText}のご予約リマインダー`;
    
    const content = `
${reservation.customerName} 様

${timeText}のご予約についてリマインダーをお送りいたします。

■ ご予約詳細 ■
日時：${reservation.date} ${reservation.time}
メニュー：${reservation.menu}

${daysBeforeVisit === 0 ? 
  'ご来店をお待ちしております。' : 
  'ご都合が悪くなりましたら、お早めにご連絡ください。'
}

${reservation.salonPhone ? `お電話：${reservation.salonPhone}` : ''}

${reservation.salonName}
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ご予約リマインダー</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d97706, #6366f1); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; color: #6b7280; }
        .reminder-details { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706; }
        .time-badge { background: #d97706; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ご予約リマインダー</h1>
            <div class="time-badge">${timeText}</div>
        </div>
        <div class="content">
            <p>${reservation.customerName} 様</p>
            <p>${timeText}のご予約についてリマインダーをお送りいたします。</p>
            
            <div class="reminder-details">
                <h3 style="margin-top: 0; color: #92400e;">ご予約詳細</h3>
                <p><strong>日時：</strong> ${reservation.date} ${reservation.time}</p>
                <p><strong>メニュー：</strong> ${reservation.menu}</p>
            </div>
            
            <p>${daysBeforeVisit === 0 ? 
                'ご来店をお待ちしております。' : 
                'ご都合が悪くなりましたら、お早めにご連絡ください。'
            }</p>
            
            ${reservation.salonPhone ? `<p><strong>お電話：</strong> ${reservation.salonPhone}</p>` : ''}
        </div>
        <div class="footer">
            <p>${reservation.salonName}</p>
            <p>このメールは予約システムから自動送信されています</p>
        </div>
    </div>
</body>
</html>
`;

    return { subject, content, html };
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<{ smtp: boolean; imap: boolean }> {
    try {
      // 開発環境では常にtrueを返す
      if (import.meta.env.DEV) {
        return { smtp: true, imap: true };
      }

      // 実際の接続テスト実装
      // TODO: 本番環境では実際のSMTP/IMAPサーバーに接続テスト
      return { smtp: false, imap: false };
    } catch (error) {
      console.error('Email connection test failed:', error);
      return { smtp: false, imap: false };
    }
  }

  /**
   * 一括メール送信（ライトプラン制限あり）
   */
  async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    content: string;
    html?: string;
  }>, maxCount: number = 10): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = { sent: 0, failed: 0, errors: [] as string[] };
    
    // ライトプラン制限チェック
    const emailsToSend = emails.slice(0, maxCount);
    
    for (const email of emailsToSend) {
      try {
        await this.sendEmail(email.to, email.subject, email.content, { html: email.html });
        results.sent++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to send to ${email.to}: ${error}`);
      }
    }

    return results;
  }

  /**
   * 開発環境用のモックメールデータ
   */
  private getMockEmails(): Message[] {
    return [
      {
        id: 'email_1',
        channel_id: 'email',
        sender_id: 'customer1@example.com',
        sender_name: '田中美咲',
        content: '来週の予約をお願いしたいのですが、空いている時間はありますでしょうか？',
        message_type: 'text',
        direction: 'incoming',
        created_at: new Date(Date.now() - 1800000).toISOString(), // 30分前
        is_read: false,
        metadata: {
          subject: '予約についてのお問い合わせ',
          email_from: 'customer1@example.com',
        },
      },
      {
        id: 'email_2',
        channel_id: 'email',
        sender_id: 'customer2@example.com',
        sender_name: '佐藤花子',
        content: '先日はありがとうございました。次回の予約もお願いします。',
        message_type: 'text',
        direction: 'incoming',
        created_at: new Date(Date.now() - 3600000).toISOString(), // 1時間前
        is_read: false,
        metadata: {
          subject: 'Re: ご予約確認のお知らせ',
          email_from: 'customer2@example.com',
        },
      },
      {
        id: 'email_3',
        channel_id: 'email',
        sender_id: 'customer3@example.com',
        sender_name: '山田太郎',
        content: 'ヘアカットの料金について教えてください。',
        message_type: 'text',
        direction: 'incoming',
        created_at: new Date(Date.now() - 7200000).toISOString(), // 2時間前
        is_read: true,
        metadata: {
          subject: '料金についてのお問い合わせ',
          email_from: 'customer3@example.com',
        },
      },
    ];
  }

  /**
   * メールアドレスの有効性チェック
   */
  validateEmailAddress(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * メール配信設定の管理
   */
  getEmailSettings(): {
    autoReply: boolean;
    reminderEnabled: boolean;
    confirmationEnabled: boolean;
    maxDailyEmails: number;
  } {
    return {
      autoReply: true,
      reminderEnabled: true,
      confirmationEnabled: true,
      maxDailyEmails: 50, // ライトプラン制限
    };
  }

  /**
   * 自動返信メール
   */
  generateAutoReplyEmail(originalSubject: string): { subject: string; content: string; html: string } {
    const subject = `Re: ${originalSubject}`;
    
    const content = `
この度はお問い合わせいただき、ありがとうございます。

お送りいただいたメールを確認いたしました。
通常1営業日以内にご返信いたしますので、少々お待ちください。

お急ぎの場合は、お電話にてお問い合わせください。

美容室管理システム
※このメールは自動送信です
`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>自動返信</title>
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6b7280; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #e5e7eb; }
        .footer { background: #f9fafb; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>自動返信メール</h2>
        </div>
        <div class="content">
            <p>この度はお問い合わせいただき、ありがとうございます。</p>
            <p>お送りいただいたメールを確認いたしました。<br>
            通常1営業日以内にご返信いたしますので、少々お待ちください。</p>
            <p>お急ぎの場合は、お電話にてお問い合わせください。</p>
        </div>
        <div class="footer">
            <p>美容室管理システム</p>
            <p>※このメールは自動送信です</p>
        </div>
    </div>
</body>
</html>
`;

    return { subject, content, html };
  }
}