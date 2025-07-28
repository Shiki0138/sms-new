import { colors, typography, spacing, borderRadius, shadows, breakpoints, touchTargets, mobileLayout } from './src/styles/design-system.ts';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // カスタムカラーパレット（美容業界向け）
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        neutral: colors.neutral,
        success: colors.success,
        warning: colors.warning,
        error: colors.error,
      },
      
      // タイポグラフィ
      fontFamily: typography.fontFamily,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      
      // スペーシング
      spacing: spacing,
      
      // ボーダー半径
      borderRadius: borderRadius,
      
      // シャドウ（エレガントな影も含む）
      boxShadow: shadows,
      
      // ブレークポイント
      screens: breakpoints,
      
      // アニメーション
      transitionTimingFunction: {
        'elegant': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '300ms',
        'slow': '500ms',
        'elegant': '400ms',
      },
      
      // タッチターゲット（スマホ最適化）
      minHeight: {
        'touch': touchTargets.minimum,
        'touch-comfortable': touchTargets.comfortable,
        'touch-large': touchTargets.large,
      },
      minWidth: {
        'touch': touchTargets.minimum,
        'touch-comfortable': touchTargets.comfortable,
        'touch-large': touchTargets.large,
      },
      
      // モバイルレイアウト固有のサイズ
      height: {
        'header': mobileLayout.header.height,
        'bottom-nav': mobileLayout.bottomNav.height,
        'fab': mobileLayout.fab.size,
      },
      width: {
        'fab': mobileLayout.fab.size,
      },
      
      // セーフエリア対応
      padding: {
        'safe-top': mobileLayout.safeArea.top,
        'safe-bottom': mobileLayout.safeArea.bottom,
        'safe-left': mobileLayout.safeArea.left,
        'safe-right': mobileLayout.safeArea.right,
      },
    },
  },
  plugins: [],
};
