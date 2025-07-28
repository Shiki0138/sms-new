// 美容師向けプレミアムデザインシステム - ジェンダーニュートラル・高級感重視
// モダンで洗練された配色（男女両方に好まれる）

export const colors = {
  // プライマリーカラー（深いネイビーブルー - 信頼性と高級感）
  primary: {
    50: '#f0f4ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1', // メインカラー - 洗練されたインディゴ
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  
  // セカンダリーカラー（ウォームグレー - モダンで温かみのある）
  secondary: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280', // メインセカンダリー
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // アクセントカラー（プレミアムゴールド - 高級感）
  accent: {
    50: '#fffdf5',
    100: '#fffbeb',
    200: '#fef3c7',
    300: '#fde68a',
    400: '#fbbf24',
    500: '#d97706', // メインアクセント - 上品なゴールド
    600: '#b45309',
    700: '#92400e',
    800: '#78350f',
    900: '#451a03',
  },
  
  // ニュートラルカラー（洗練されたグレー）
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  
  // ステータスカラー
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
};

export const typography = {
  fontFamily: {
    primary: ['Inter', 'system-ui', 'sans-serif'],
    secondary: ['Noto Sans JP', 'sans-serif'],
    mono: ['Fira Code', 'monospace'],
  },
  
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },
  
  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
};

export const spacing = {
  0: '0px',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
};

export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  elegant: '0 4px 20px -2px rgba(224, 133, 83, 0.15)', // プライマリーカラーベースのエレガントな影
};

export const animations = {
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
    elegant: '400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', // 美容業界らしいエレガントな動き
  },
  
  spring: {
    gentle: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },
    smooth: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 25,
    },
    bouncy: {
      type: 'spring' as const,
      stiffness: 600,
      damping: 15,
    },
  },
};

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// 美容師向け専用テーマ設定 - ジェンダーニュートラル・プレミアム
export const salonTheme = {
  // エレガント（日常使用 - 男女両方に好まれる洗練された配色）
  elegant: {
    primary: colors.primary[500], // 洗練されたインディゴ
    secondary: colors.secondary[400], // モダンなウォームグレー
    accent: colors.accent[400], // 上品なゴールド
    background: colors.neutral[50],
    surface: '#ffffff',
    text: colors.neutral[800],
    textSecondary: colors.neutral[600],
  },
  
  // ラグジュアリー（プレミアム感重視 - 高級サロン向け）
  luxury: {
    primary: colors.primary[600], // より深いインディゴ
    secondary: colors.secondary[500], // リッチなグレー
    accent: colors.accent[500], // リッチゴールド
    background: colors.neutral[100],
    surface: '#ffffff',
    text: colors.neutral[900],
    textSecondary: colors.neutral[700],
  },
  
  // モダン（若い世代向け - スタイリッシュで現代的）
  modern: {
    primary: colors.primary[400], // ソフトなインディゴ
    secondary: colors.secondary[300], // ライトグレー
    accent: colors.accent[300], // ソフトゴールド
    background: colors.neutral[50],
    surface: '#ffffff',
    text: colors.neutral[700],
    textSecondary: colors.neutral[500],
  },
};

// タッチフレンドリーなサイズ設定
export const touchTargets = {
  minimum: '44px', // iOS/Android推奨最小サイズ
  comfortable: '48px',
  large: '56px',
};

// スマートフォン向けレイアウト設定
export const mobileLayout = {
  header: {
    height: '56px',
    padding: '0 16px',
  },
  
  bottomNav: {
    height: '64px',
    padding: '8px 0',
  },
  
  fab: {
    size: '56px',
    position: {
      bottom: '80px', // ボトムナビ上
      right: '16px',
    },
  },
  
  safeArea: {
    top: 'env(safe-area-inset-top)',
    bottom: 'env(safe-area-inset-bottom)',
    left: 'env(safe-area-inset-left)',
    right: 'env(safe-area-inset-right)',
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  breakpoints,
  salonTheme,
  touchTargets,
  mobileLayout,
};