/// <reference types="vite/client" />

// PlanLimitsContext のグローバル型定義
interface Window {
  __planLimitsContext?: {
    limits: {
      customers: number;
      monthlyReservations: number;
      staffAccounts: number;
      dataRetentionMonths: number;
      monthlyAiReplies: number;
      monthlyMessages: number;
    };
    usage: {
      customers: number;
      monthlyReservations: number;
      staffAccounts: number;
      monthlyAiReplies: number;
      monthlyMessages: number;
    };
    checkCustomerLimit: () => Promise<boolean>;
    checkReservationLimit: () => Promise<boolean>;
    checkStaffLimit: () => Promise<boolean>;
    checkAiReplyLimit: () => Promise<boolean>;
    checkMessageLimit: () => Promise<boolean>;
    showUpgradeModal: (limitType: string) => void;
    getUsagePercentage: (type: string) => number;
    refreshUsage: () => Promise<void>;
    incrementUsage: (type: string, amount?: number) => Promise<void>;
    isLoading: boolean;
  };
}

// 環境変数の型定義
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_ALLOWED_ORIGINS?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// グローバル変数の型定義
declare global {
  var globalThis: typeof globalThis;
  var global: typeof globalThis;
}