// 統合ビジネスアワー サービス エクスポート
// 全ての既存実装を保持し、統一されたインターフェースを提供

export type { BusinessHour, HolidaySetting, CreateHolidayData } from '../business-hours-service';

// メインサービス（本番環境用）
export { BusinessHoursService } from '../business-hours-service-fixed';

// レガシーサービス（後方互換性用）
export { BusinessHoursService as BusinessHoursServiceLegacy } from '../business-hours-service';

// モックサービス（テスト・開発用）
export { MockBusinessHoursService } from '../mock-business-hours-service';

// ファクトリー関数（環境に応じてサービスを選択）
export const createBusinessHoursService = (options?: {
  useMock?: boolean;
  useLegacy?: boolean;
}) => {
  if (options?.useMock) {
    const { MockBusinessHoursService } = require('../mock-business-hours-service');
    return new MockBusinessHoursService();
  }
  
  if (options?.useLegacy) {
    const { BusinessHoursService } = require('../business-hours-service');
    return new BusinessHoursService();
  }
  
  // デフォルトは修正版を使用
  const { BusinessHoursService } = require('../business-hours-service-fixed');
  return new BusinessHoursService();
};

// デフォルトエクスポート（修正版を使用）
export default createBusinessHoursService();