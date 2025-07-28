// 美容師向けに最適化されたエラーメッセージサービス

export interface SalonError {
  code: string;
  title: string;
  message: string;
  suggestion?: string;
  action?: {
    label: string;
    handler: () => void;
  };
  severity: 'info' | 'warning' | 'error';
}

export class SalonErrorMessages {
  // 顧客管理関連のエラー
  static getCustomerErrors(errorCode: string, context?: any): SalonError {
    switch (errorCode) {
      case 'CUSTOMER_LIMIT_REACHED':
        return {
          code: errorCode,
          title: '顧客登録数の上限に達しました',
          message: 'ライトプランでは顧客を100名まで登録できます。現在の登録数が上限に達しているため、新しい顧客を登録できません。',
          suggestion: '既存の顧客情報を整理するか、上位プランへのアップグレードをご検討ください。',
          severity: 'warning',
        };
      
      case 'CUSTOMER_NOT_FOUND':
        return {
          code: errorCode,
          title: 'お客様情報が見つかりません',
          message: '指定されたお客様の情報が見つかりませんでした。お客様が既に削除されているか、アクセス権限がない可能性があります。',
          suggestion: 'お客様一覧から正しいお客様を選択してください。',
          severity: 'error',
        };
      
      case 'DUPLICATE_CUSTOMER':
        return {
          code: errorCode,
          title: '同じお客様が既に登録されています',
          message: `電話番号「${context?.phone}」またはメールアドレス「${context?.email}」は既に他のお客様で登録されています。`,
          suggestion: '既存のお客様情報を確認するか、別の連絡先で登録してください。',
          severity: 'warning',
        };
      
      case 'INVALID_CUSTOMER_DATA':
        return {
          code: errorCode,
          title: 'お客様情報に不備があります',
          message: '入力されたお客様情報に不正な値が含まれています。必須項目の確認やメールアドレス・電話番号の形式をご確認ください。',
          suggestion: '赤色でマークされた項目を修正してから再度保存してください。',
          severity: 'error',
        };

      default:
        return this.getGenericError(errorCode);
    }
  }

  // 予約管理関連のエラー
  static getReservationErrors(errorCode: string, context?: any): SalonError {
    switch (errorCode) {
      case 'RESERVATION_LIMIT_REACHED':
        return {
          code: errorCode,
          title: '今月の予約上限に達しました',
          message: 'ライトプランでは月間50件まで予約を受け付けることができます。今月の予約数が上限に達しているため、新しい予約を追加できません。',
          suggestion: '来月まで待つか、不要な予約をキャンセルするか、上位プランへのアップグレードをご検討ください。',
          severity: 'warning',
        };
      
      case 'TIME_SLOT_CONFLICT':
        return {
          code: errorCode,
          title: '予約時間が重複しています',
          message: `${context?.date} ${context?.time}は既に他のお客様の予約が入っています。`,
          suggestion: '別の時間帯を選択するか、既存の予約時間を調整してください。',
          severity: 'warning',
        };
      
      case 'PAST_DATE_BOOKING':
        return {
          code: errorCode,
          title: '過去の日時は選択できません',
          message: '過去の日時での予約は作成できません。本日以降の日時を選択してください。',
          suggestion: 'カレンダーから本日以降の日付を選択してください。',
          severity: 'error',
        };
      
      case 'INVALID_TIME_SLOT':
        return {
          code: errorCode,
          title: '営業時間外の予約です',
          message: '選択された時間は営業時間外です。営業時間内の時間帯を選択してください。',
          suggestion: '設定画面で営業時間を確認し、適切な時間帯を選択してください。',
          severity: 'warning',
        };

      case 'RESERVATION_NOT_FOUND':
        return {
          code: errorCode,
          title: 'ご予約が見つかりません',
          message: '指定された予約情報が見つかりませんでした。予約が既にキャンセルされているか、削除されている可能性があります。',
          suggestion: '予約一覧から正しい予約を選択してください。',
          severity: 'error',
        };

      default:
        return this.getGenericError(errorCode);
    }
  }

  // メッセージ関連のエラー
  static getMessageErrors(errorCode: string, context?: any): SalonError {
    switch (errorCode) {
      case 'EMAIL_LIMIT_REACHED':
        return {
          code: errorCode,
          title: '本日のメール送信上限に達しました',
          message: 'ライトプランでは1日50通までメールを送信できます。本日の送信数が上限に達しているため、メールを送信できません。',
          suggestion: '明日再度送信するか、緊急の場合は電話でご連絡ください。',
          severity: 'warning',
        };
      
      case 'LINE_API_ERROR':
        return {
          code: errorCode,
          title: 'LINEメッセージの送信に失敗しました',
          message: 'LINE APIとの連携でエラーが発生しました。API設定を確認するか、しばらく待ってから再度お試しください。',
          suggestion: '設定画面でLINE APIの接続状況を確認してください。',
          severity: 'error',
        };
      
      case 'INSTAGRAM_API_ERROR':
        return {
          code: errorCode,
          title: 'Instagramメッセージの送信に失敗しました',
          message: 'Instagram APIとの連携でエラーが発生しました。ビジネスアカウントの設定やAPI権限を確認してください。',
          suggestion: '設定画面でInstagram APIの接続状況を確認してください。',
          severity: 'error',
        };
      
      case 'EMAIL_SMTP_ERROR':
        return {
          code: errorCode,
          title: 'メールの送信に失敗しました',
          message: 'メールサーバーとの接続でエラーが発生しました。メール設定やインターネット接続を確認してください。',
          suggestion: '設定画面でメールサーバーの設定を確認してください。',
          severity: 'error',
        };
      
      case 'MESSAGE_TOO_LONG':
        return {
          code: errorCode,
          title: 'メッセージが長すぎます',
          message: `メッセージの文字数が上限（${context?.limit || 1000}文字）を超えています。`,
          suggestion: 'メッセージを短くするか、複数回に分けて送信してください。',
          severity: 'warning',
        };

      default:
        return this.getGenericError(errorCode);
    }
  }

  // API関連のエラー
  static getApiErrors(errorCode: string, context?: any): SalonError {
    switch (errorCode) {
      case 'API_LIMIT_REACHED':
        return {
          code: errorCode,
          title: '今月のAPI使用上限に達しました',
          message: 'ライトプランでは月間1,000回までAPI呼び出しができます。今月の使用回数が上限に達しました。',
          suggestion: '来月まで待つか、上位プランへのアップグレードをご検討ください。',
          severity: 'warning',
        };
      
      case 'API_KEY_INVALID':
        return {
          code: errorCode,
          title: 'API設定に問題があります',
          message: `${context?.service || 'サービス'}のAPIキーまたは設定が正しくありません。`,
          suggestion: '設定画面でAPI連携の設定を確認し、正しいキーを入力してください。',
          severity: 'error',
        };
      
      case 'API_RATE_LIMIT':
        return {
          code: errorCode,
          title: 'API呼び出し頻度の制限に達しました',
          message: '短時間で大量のAPI呼び出しが発生したため、一時的に制限されています。',
          suggestion: '少し時間をおいてから再度お試しください。',
          severity: 'warning',
        };

      default:
        return this.getGenericError(errorCode);
    }
  }

  // システム関連のエラー
  static getSystemErrors(errorCode: string, context?: any): SalonError {
    switch (errorCode) {
      case 'NETWORK_ERROR':
        return {
          code: errorCode,
          title: 'インターネット接続に問題があります',
          message: 'サーバーとの通信ができません。インターネット接続を確認してください。',
          suggestion: 'Wi-Fiや4G/5G接続を確認し、再度お試しください。',
          severity: 'error',
        };
      
      case 'SERVER_ERROR':
        return {
          code: errorCode,
          title: 'サーバーで問題が発生しました',
          message: 'システムで一時的な問題が発生しています。しばらく待ってから再度お試しください。',
          suggestion: '問題が続く場合は、サポートまでお問い合わせください。',
          severity: 'error',
        };
      
      case 'UNAUTHORIZED':
        return {
          code: errorCode,
          title: 'ログイン情報が無効です',
          message: 'セッションが切れたか、ログイン情報が無効になりました。',
          suggestion: '再度ログインしてください。',
          severity: 'warning',
        };
      
      case 'FORBIDDEN':
        return {
          code: errorCode,
          title: 'アクセス権限がありません',
          message: 'この操作を実行する権限がありません。',
          suggestion: 'サロンオーナーまたは管理者にお問い合わせください。',
          severity: 'error',
        };

      default:
        return this.getGenericError(errorCode);
    }
  }

  // 一般的なエラー
  static getGenericError(errorCode: string): SalonError {
    return {
      code: errorCode || 'UNKNOWN_ERROR',
      title: '予期しないエラーが発生しました',
      message: 'システムで予期しない問題が発生しました。この問題が繰り返される場合は、サポートまでお問い合わせください。',
      suggestion: 'しばらく待ってから再度お試しください。',
      severity: 'error',
    };
  }

  // 成功メッセージ
  static getSuccessMessages(actionType: string, context?: any): {
    title: string;
    message: string;
  } {
    switch (actionType) {
      case 'CUSTOMER_CREATED':
        return {
          title: 'お客様を登録しました',
          message: `${context?.name || 'お客様'}の情報を正常に登録しました。`,
        };
      
      case 'RESERVATION_CREATED':
        return {
          title: 'ご予約を登録しました',
          message: `${context?.date} ${context?.time}のご予約を正常に登録しました。`,
        };
      
      case 'MESSAGE_SENT':
        return {
          title: 'メッセージを送信しました',
          message: `${context?.channel || 'メッセージ'}を正常に送信しました。`,
        };
      
      case 'SETTINGS_SAVED':
        return {
          title: '設定を保存しました',
          message: '変更された設定を正常に保存しました。',
        };

      default:
        return {
          title: '操作が完了しました',
          message: '正常に処理されました。',
        };
    }
  }

  // エラーメッセージの重要度に基づくアイコン
  static getErrorIcon(severity: 'info' | 'warning' | 'error'): string {
    switch (severity) {
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
    }
  }

  // 美容師業界特有の用語を含むバリデーションメッセージ
  static getValidationMessages(field: string, type: string): string {
    const fieldNames: Record<string, string> = {
      'customerName': 'お客様のお名前',
      'phoneNumber': 'お電話番号',
      'emailAddress': 'メールアドレス',
      'reservationDate': 'ご予約日',
      'reservationTime': 'ご予約時間',
      'menuName': 'メニュー名',
      'serviceDuration': '施術時間',
      'servicePrice': '料金',
      'staffName': 'スタッフ名',
    };

    const fieldName = fieldNames[field] || field;

    switch (type) {
      case 'required':
        return `${fieldName}は必須項目です。`;
      case 'invalid':
        return `${fieldName}の形式が正しくありません。`;
      case 'tooShort':
        return `${fieldName}が短すぎます。`;
      case 'tooLong':
        return `${fieldName}が長すぎます。`;
      case 'invalidEmail':
        return 'メールアドレスの形式が正しくありません（例：salon@example.com）';
      case 'invalidPhone':
        return 'お電話番号の形式が正しくありません（例：03-1234-5678）';
      case 'invalidPrice':
        return '料金は半角数字で入力してください（例：5000）';
      case 'invalidTime':
        return '時間の形式が正しくありません（例：10:30）';
      default:
        return `${fieldName}を正しく入力してください。`;
    }
  }
}