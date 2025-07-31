import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';

const touchButtonVariants = cva(
  // ベースクラス - 全てのボタンに適用
  [
    'relative inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'touch-manipulation select-none',
    'active:scale-95 transition-all duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-primary-500 to-primary-600',
          'text-white shadow-lg',
          'hover:from-primary-600 hover:to-primary-700',
          'focus:ring-primary-500',
          'active:shadow-md',
        ].join(' '),
        secondary: [
          'bg-white border border-gray-300',
          'text-gray-700 shadow-sm',
          'hover:bg-gray-50 hover:border-gray-400',
          'focus:ring-primary-500',
          'active:bg-gray-100',
        ].join(' '),
        floating: [
          'bg-primary-500 text-white',
          'shadow-xl hover:shadow-2xl',
          'hover:bg-primary-600',
          'focus:ring-primary-500',
          'fixed z-40',
        ].join(' '),
        ghost: [
          'bg-transparent',
          'text-gray-700',
          'hover:bg-gray-100',
          'focus:ring-gray-400',
        ].join(' '),
        danger: [
          'bg-red-500 text-white',
          'hover:bg-red-600',
          'focus:ring-red-500',
          'active:bg-red-700',
        ].join(' '),
      },
      size: {
        sm: 'min-h-[36px] px-3 py-2 text-sm',
        md: 'min-h-[40px] px-4 py-2.5 text-base',
        lg: 'min-h-[48px] px-6 py-3 text-lg',
        touch: 'min-h-[44px] min-w-[44px] px-4 py-3 text-base', // Apple推奨サイズ
        xl: 'min-h-[56px] px-8 py-4 text-lg', // 大型タッチターゲット
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
      rounded: {
        md: 'rounded-lg',
        full: 'rounded-full',
        xl: 'rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'touch',
      fullWidth: false,
      rounded: 'md',
    },
  }
);

export interface TouchOptimizedButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'>,
    VariantProps<typeof touchButtonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hapticFeedback?: boolean;
  children?: React.ReactNode;
}

const TouchOptimizedButton = React.forwardRef<
  HTMLButtonElement,
  TouchOptimizedButtonProps
>(({
  className,
  variant,
  size,
  fullWidth,
  rounded,
  isLoading = false,
  leftIcon,
  rightIcon,
  hapticFeedback = true,
  children,
  onClick,
  disabled,
  ...props
}, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // ハプティックフィードバック（対応デバイスのみ）
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }

    onClick?.(e);
  };

  return (
    <motion.button
      ref={ref}
      className={touchButtonVariants({ variant, size, fullWidth, rounded, className })}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.95 }}
      transition={{ duration: 0.1 }}
      onClick={handleClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* ローディングオーバーレイ */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-inherit">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}

      {/* ボタンコンテンツ */}
      <span className={`inline-flex items-center ${isLoading ? 'opacity-0' : ''}`}>
        {leftIcon && (
          <span className="mr-2 -ml-1 flex items-center">
            {leftIcon}
          </span>
        )}
        
        {children}
        
        {rightIcon && (
          <span className="ml-2 -mr-1 flex items-center">
            {rightIcon}
          </span>
        )}
      </span>

      {/* リップルエフェクト */}
      {variant !== 'ghost' && !disabled && !isLoading && (
        <span className="absolute inset-0 overflow-hidden rounded-inherit">
          <motion.span
            className="absolute inset-0 bg-white opacity-25"
            initial={{ scale: 0, opacity: 0.5 }}
            whileTap={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{ originX: 0.5, originY: 0.5 }}
          />
        </span>
      )}
    </motion.button>
  );
});

TouchOptimizedButton.displayName = 'TouchOptimizedButton';

// コンポーネントグループ（よく使うパターン）
export const TouchButtonGroup: React.FC<{
  children: React.ReactNode;
  className?: string;
  vertical?: boolean;
}> = ({ children, className = '', vertical = false }) => {
  return (
    <div
      className={`
        flex ${vertical ? 'flex-col' : 'flex-row'}
        ${vertical ? 'space-y-3' : 'space-x-3'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// FAB（フローティングアクションボタン）プリセット
export const TouchFAB: React.FC<TouchOptimizedButtonProps> = (props) => {
  return (
    <TouchOptimizedButton
      variant="floating"
      size="xl"
      rounded="full"
      className="bottom-20 right-4 md:bottom-6"
      {...props}
    />
  );
};

// プライマリCTAボタンプリセット
export const TouchCTAButton: React.FC<TouchOptimizedButtonProps> = (props) => {
  return (
    <TouchOptimizedButton
      variant="primary"
      size="xl"
      fullWidth
      className="font-semibold"
      {...props}
    />
  );
};

export default TouchOptimizedButton;