/**
 * バリデーションユーティリティ
 * 入力値の検証とサニタイゼーション機能を提供
 */

import { sanitizeInput, validateEmail, validatePasswordStrength } from '../middleware/security';

/**
 * 共通バリデーションルール
 */
export const ValidationRules = {
  // 文字列長
  MAX_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 254,
  MAX_PHONE_LENGTH: 20,
  MAX_MESSAGE_LENGTH: 2000,
  MIN_PASSWORD_LENGTH: 8,
  
  // 数値範囲
  MIN_AGE: 0,
  MAX_AGE: 150,
  MIN_PRICE: 0,
  MAX_PRICE: 1000000,
} as const;

/**
 * バリデーション結果の型定義
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: any;
}

/**
 * 文字列の基本バリデーション
 */
export function validateString(
  value: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    sanitize?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  let sanitizedValue = options.sanitize ? sanitizeInput(value) : value;
  
  // 必須チェック
  if (options.required && (!value || value.trim().length === 0)) {
    errors.push('この項目は必須です');
    return { isValid: false, errors };
  }
  
  // 空文字列の場合は以降のチェックをスキップ
  if (!value || value.trim().length === 0) {
    return { isValid: true, errors: [], sanitizedValue: '' };
  }
  
  // 最小長チェック
  if (options.minLength && sanitizedValue.length < options.minLength) {
    errors.push(`${options.minLength}文字以上で入力してください`);
  }
  
  // 最大長チェック
  if (options.maxLength && sanitizedValue.length > options.maxLength) {
    errors.push(`${options.maxLength}文字以内で入力してください`);
    sanitizedValue = sanitizedValue.substring(0, options.maxLength);
  }
  
  // パターンチェック
  if (options.pattern && !options.pattern.test(sanitizedValue)) {
    errors.push('入力形式が正しくありません');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue
  };
}

/**
 * 数値のバリデーション
 */
export function validateNumber(
  value: any,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  
  // 必須チェック
  if (options.required && (value === null || value === undefined || value === '')) {
    errors.push('この項目は必須です');
    return { isValid: false, errors };
  }
  
  // 空値の場合は以降のチェックをスキップ
  if (value === null || value === undefined || value === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }
  
  // 数値変換
  const numValue = Number(value);
  
  // 数値チェック
  if (isNaN(numValue)) {
    errors.push('数値で入力してください');
    return { isValid: false, errors };
  }
  
  // 整数チェック
  if (options.integer && !Number.isInteger(numValue)) {
    errors.push('整数で入力してください');
  }
  
  // 最小値チェック
  if (options.min !== undefined && numValue < options.min) {
    errors.push(`${options.min}以上で入力してください`);
  }
  
  // 最大値チェック
  if (options.max !== undefined && numValue > options.max) {
    errors.push(`${options.max}以下で入力してください`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: numValue
  };
}

/**
 * メールアドレスのバリデーション
 */
export function validateEmailAddress(email: string, required: boolean = true): ValidationResult {
  const errors: string[] = [];
  
  if (required && (!email || email.trim().length === 0)) {
    errors.push('メールアドレスは必須です');
    return { isValid: false, errors };
  }
  
  if (!email || email.trim().length === 0) {
    return { isValid: true, errors: [], sanitizedValue: '' };
  }
  
  const sanitizedEmail = sanitizeInput(email.trim().toLowerCase());
  
  if (!validateEmail(sanitizedEmail)) {
    errors.push('正しいメールアドレスを入力してください');
  }
  
  if (sanitizedEmail.length > ValidationRules.MAX_EMAIL_LENGTH) {
    errors.push(`メールアドレスは${ValidationRules.MAX_EMAIL_LENGTH}文字以内で入力してください`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedEmail
  };
}

/**
 * パスワードのバリデーション
 */
export function validatePassword(password: string, required: boolean = true): ValidationResult {
  const errors: string[] = [];
  
  if (required && (!password || password.length === 0)) {
    errors.push('パスワードは必須です');
    return { isValid: false, errors };
  }
  
  if (!password || password.length === 0) {
    return { isValid: true, errors: [], sanitizedValue: '' };
  }
  
  const strengthCheck = validatePasswordStrength(password);
  
  if (!strengthCheck.isValid) {
    errors.push(...strengthCheck.feedback);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: password // パスワードはサニタイズしない
  };
}

/**
 * 電話番号のバリデーション
 */
export function validatePhoneNumber(phone: string, required: boolean = false): ValidationResult {
  const errors: string[] = [];
  
  if (required && (!phone || phone.trim().length === 0)) {
    errors.push('電話番号は必須です');
    return { isValid: false, errors };
  }
  
  if (!phone || phone.trim().length === 0) {
    return { isValid: true, errors: [], sanitizedValue: '' };
  }
  
  // 数字、ハイフン、括弧、スペース、プラス記号のみ許可
  const phonePattern = /^[0-9\-\(\)\s\+]+$/;
  const sanitizedPhone = phone.trim();
  
  if (!phonePattern.test(sanitizedPhone)) {
    errors.push('正しい電話番号を入力してください');
  }
  
  if (sanitizedPhone.length > ValidationRules.MAX_PHONE_LENGTH) {
    errors.push(`電話番号は${ValidationRules.MAX_PHONE_LENGTH}文字以内で入力してください`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedPhone
  };
}

/**
 * 日付のバリデーション
 */
export function validateDate(
  date: string | Date,
  options: {
    required?: boolean;
    minDate?: Date;
    maxDate?: Date;
  } = {}
): ValidationResult {
  const errors: string[] = [];
  
  if (options.required && (!date || date === '')) {
    errors.push('日付は必須です');
    return { isValid: false, errors };
  }
  
  if (!date || date === '') {
    return { isValid: true, errors: [], sanitizedValue: null };
  }
  
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) {
    errors.push('正しい日付を入力してください');
    return { isValid: false, errors };
  }
  
  // 最小日付チェック
  if (options.minDate && dateObj < options.minDate) {
    errors.push(`${options.minDate.toLocaleDateString()}以降の日付を入力してください`);
  }
  
  // 最大日付チェック
  if (options.maxDate && dateObj > options.maxDate) {
    errors.push(`${options.maxDate.toLocaleDateString()}以前の日付を入力してください`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: dateObj
  };
}

/**
 * 顧客情報のバリデーション
 */
export function validateCustomerData(data: {
  name?: string;
  email?: string;
  phone?: string;
  age?: any;
}): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // 名前のバリデーション
  const nameResult = validateString(data.name || '', {
    required: true,
    maxLength: ValidationRules.MAX_NAME_LENGTH,
    sanitize: true
  });
  if (!nameResult.isValid) {
    errors.push(...nameResult.errors.map(err => `名前: ${err}`));
  }
  sanitizedData.name = nameResult.sanitizedValue;
  
  // メールアドレスのバリデーション
  const emailResult = validateEmailAddress(data.email || '', false);
  if (!emailResult.isValid) {
    errors.push(...emailResult.errors);
  }
  sanitizedData.email = emailResult.sanitizedValue;
  
  // 電話番号のバリデーション
  const phoneResult = validatePhoneNumber(data.phone || '', false);
  if (!phoneResult.isValid) {
    errors.push(...phoneResult.errors);
  }
  sanitizedData.phone = phoneResult.sanitizedValue;
  
  // 年齢のバリデーション
  if (data.age !== undefined && data.age !== null && data.age !== '') {
    const ageResult = validateNumber(data.age, {
      min: ValidationRules.MIN_AGE,
      max: ValidationRules.MAX_AGE,
      integer: true
    });
    if (!ageResult.isValid) {
      errors.push(...ageResult.errors.map(err => `年齢: ${err}`));
    }
    sanitizedData.age = ageResult.sanitizedValue;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedData
  };
}

/**
 * 予約情報のバリデーション
 */
export function validateReservationData(data: {
  customer_id?: string;
  service_id?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
}): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // 顧客IDのバリデーション
  if (!data.customer_id || data.customer_id.trim().length === 0) {
    errors.push('顧客を選択してください');
  }
  sanitizedData.customer_id = data.customer_id;
  
  // サービスIDのバリデーション
  if (!data.service_id || data.service_id.trim().length === 0) {
    errors.push('サービスを選択してください');
  }
  sanitizedData.service_id = data.service_id;
  
  // 開始時間のバリデーション
  const startTimeResult = validateDate(data.start_time || '', {
    required: true,
    minDate: new Date() // 現在より未来の日時
  });
  if (!startTimeResult.isValid) {
    errors.push(...startTimeResult.errors.map(err => `開始時間: ${err}`));
  }
  sanitizedData.start_time = startTimeResult.sanitizedValue;
  
  // 終了時間のバリデーション
  const endTimeResult = validateDate(data.end_time || '', {
    required: true
  });
  if (!endTimeResult.isValid) {
    errors.push(...endTimeResult.errors.map(err => `終了時間: ${err}`));
  } else if (startTimeResult.sanitizedValue && endTimeResult.sanitizedValue) {
    // 終了時間が開始時間より後かチェック
    if (endTimeResult.sanitizedValue <= startTimeResult.sanitizedValue) {
      errors.push('終了時間は開始時間より後に設定してください');
    }
  }
  sanitizedData.end_time = endTimeResult.sanitizedValue;
  
  // 備考のバリデーション
  if (data.notes) {
    const notesResult = validateString(data.notes, {
      maxLength: ValidationRules.MAX_MESSAGE_LENGTH,
      sanitize: true
    });
    if (!notesResult.isValid) {
      errors.push(...notesResult.errors.map(err => `備考: ${err}`));
    }
    sanitizedData.notes = notesResult.sanitizedValue;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedData
  };
}

/**
 * メッセージのバリデーション
 */
export function validateMessageData(data: {
  content?: string;
  recipient?: string;
}): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // メッセージ内容のバリデーション
  const contentResult = validateString(data.content || '', {
    required: true,
    maxLength: ValidationRules.MAX_MESSAGE_LENGTH,
    sanitize: true
  });
  if (!contentResult.isValid) {
    errors.push(...contentResult.errors.map(err => `メッセージ: ${err}`));
  }
  sanitizedData.content = contentResult.sanitizedValue;
  
  // 受信者のバリデーション
  if (!data.recipient || data.recipient.trim().length === 0) {
    errors.push('送信先を選択してください');
  }
  sanitizedData.recipient = data.recipient;
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitizedData
  };
}