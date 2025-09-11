# モバイルUIコンポーネント設計書

## 🎨 デザインシステム

### カラーパレット
```css
:root {
  /* Primary Colors */
  --primary-50: #fefdf9;
  --primary-100: #fef7ed;
  --primary-200: #feebc8;
  --primary-300: #fbd38d;
  --primary-400: #f6ad55;
  --primary-500: #d4a574;  /* メインブランドカラー */
  --primary-600: #b8935f;
  --primary-700: #a0804d;
  --primary-800: #8b6914;
  --primary-900: #744210;

  /* Secondary Colors */
  --secondary-50: #fefcfb;
  --secondary-100: #fef7f4;
  --secondary-200: #feeee8;
  --secondary-300: #f8e5e1;  /* サブカラー */
  --secondary-400: #f2d6d0;
  --secondary-500: #e8c4be;

  /* Neutral Colors */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-200: #e5e7eb;
  --gray-300: #d1d5db;
  --gray-400: #9ca3af;
  --gray-500: #6b7280;
  --gray-600: #4b5563;
  --gray-700: #374151;
  --gray-800: #1f2937;
  --gray-900: #111827;

  /* Semantic Colors */
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --info: #3b82f6;

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%);
  --gradient-secondary: linear-gradient(135deg, var(--secondary-300) 0%, var(--secondary-400) 100%);
  --gradient-soft: linear-gradient(135deg, var(--primary-50) 0%, var(--secondary-50) 100%);
}
```

### タイポグラフィ
```css
:root {
  /* Font Families */
  --font-primary: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-display: 'Playfair Display', 'Noto Serif JP', Georgia, serif;
  --font-mono: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* Font Weights */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

### スペーシング・レイアウト
```css
:root {
  /* Spacing Scale */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Border Radius */
  --radius-sm: 0.375rem;  /* 6px */
  --radius: 0.5rem;       /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */
  --radius-2xl: 1.5rem;   /* 24px */
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* Animations */
  --transition-fast: 150ms ease;
  --transition-base: 300ms ease;
  --transition-slow: 500ms ease;
  --transition-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## 📱 基本コンポーネント

### 1. ボタンコンポーネント

```jsx
// Button.jsx
import React from 'react';

const Button = ({ 
  variant = 'primary',
  size = 'md', 
  children, 
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  onClick,
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium
    rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    touch-manipulation select-none
  `;

  const variants = {
    primary: `
      bg-gradient-to-r from-primary-500 to-primary-600
      text-white shadow-md hover:shadow-lg
      focus:ring-primary-500 active:scale-95
    `,
    secondary: `
      bg-white border-2 border-primary-500 
      text-primary-600 hover:bg-primary-50
      focus:ring-primary-500 active:scale-95
    `,
    ghost: `
      bg-transparent text-primary-600
      hover:bg-primary-50 focus:ring-primary-500
    `,
    danger: `
      bg-red-500 text-white hover:bg-red-600
      focus:ring-red-500 active:scale-95
    `
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-6 py-3 text-base min-h-[48px]',
    lg: 'px-8 py-4 text-lg min-h-[56px]'
  };

  const classes = `
    ${baseClasses}
    ${variants[variant]}
    ${sizes[size]}
    ${fullWidth ? 'w-full' : ''}
  `;

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

export default Button;
```

### 2. 入力フィールドコンポーネント

```jsx
// Input.jsx
import React, { useState, forwardRef } from 'react';

const Input = forwardRef(({
  label,
  type = 'text',
  placeholder,
  error,
  helper,
  icon,
  rightIcon,
  disabled = false,
  required = false,
  ...props
}, ref) => {
  const [focused, setFocused] = useState(false);

  const inputClasses = `
    w-full px-4 py-3 text-base
    border-2 rounded-lg transition-all duration-200
    focus:outline-none focus:ring-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${error 
      ? 'border-red-300 focus:border-red-500' 
      : focused 
        ? 'border-primary-500 focus:border-primary-600' 
        : 'border-gray-200 hover:border-gray-300'
    }
    ${icon ? 'pl-12' : ''}
    ${rightIcon ? 'pr-12' : ''}
  `;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          className={inputClasses}
          disabled={disabled}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
```

### 3. カードコンポーネント

```jsx
// Card.jsx
import React from 'react';

const Card = ({ 
  children, 
  className = '',
  padding = 'lg',
  shadow = 'md',
  rounded = 'lg',
  background = 'white',
  clickable = false,
  onClick
}) => {
  const baseClasses = `
    transition-all duration-200
    ${clickable ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
  `;

  const paddings = {
    sm: 'p-3',
    md: 'p-4', 
    lg: 'p-6',
    xl: 'p-8'
  };

  const shadows = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const roundings = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl'
  };

  const backgrounds = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    primary: 'bg-primary-50',
    gradient: 'bg-gradient-to-br from-white to-primary-50'
  };

  const classes = `
    ${baseClasses}
    ${paddings[padding]}
    ${shadows[shadow]}
    ${roundings[rounded]}
    ${backgrounds[background]}
    ${className}
  `;

  return (
    <div 
      className={classes}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default Card;
```

---

## 📅 予約関連コンポーネント

### 1. カレンダーコンポーネント

```jsx
// Calendar.jsx
import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, 
         isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

const Calendar = ({ 
  selectedDate, 
  onDateSelect,
  availableDates = [],
  disabledDates = [],
  minDate,
  maxDate 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const isDateDisabled = (date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    if (disabledDates.some(d => isSameDay(d, date))) return true;
    return false;
  };

  const isDateAvailable = (date) => {
    return availableDates.length === 0 || availableDates.some(d => isSameDay(d, date));
  };

  return (
    <div className="bg-white rounded-lg p-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentMonth, 'yyyy年 M月', { locale: ja })}
        </h2>
        
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['日', '月', '火', '水', '木', '金', '土'].map(day => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map(date => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isDisabled = isDateDisabled(date);
          const isAvailable = isDateAvailable(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);

          return (
            <button
              key={date.toString()}
              onClick={() => !isDisabled && onDateSelect(date)}
              disabled={isDisabled}
              className={`
                p-3 text-center text-sm rounded-lg transition-all
                min-h-[44px] touch-manipulation
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                ${isSelected 
                  ? 'bg-primary-500 text-white shadow-md' 
                  : isAvailable && !isDisabled
                    ? 'hover:bg-primary-100 bg-white border border-primary-200'
                    : 'hover:bg-gray-50'
                }
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                ${!isAvailable && !isDisabled ? 'opacity-50' : ''}
              `}
            >
              {format(date, 'd')}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
```

### 2. 時間スロット選択コンポーネント

```jsx
// TimeSlots.jsx
import React from 'react';
import { format } from 'date-fns';

const TimeSlots = ({ 
  availableSlots = [],
  selectedTime,
  onTimeSelect,
  duration = 60 // 分
}) => {
  const formatTimeSlot = (slot) => {
    const start = format(slot.start, 'HH:mm');
    const end = format(slot.end, 'HH:mm');
    return `${start}〜${end}`;
  };

  if (availableSlots.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">😔</div>
        <p className="text-gray-600">この日は空きがありません</p>
        <p className="text-sm text-gray-500 mt-2">別の日をお選びください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900 flex items-center">
        🕐 空き時間
        <span className="ml-2 text-sm text-gray-500">
          （施術時間: {duration}分）
        </span>
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {availableSlots.map(slot => {
          const isSelected = selectedTime && 
            slot.start.getTime() === selectedTime.start.getTime();
          
          return (
            <button
              key={slot.id}
              onClick={() => onTimeSelect(slot)}
              className={`
                p-4 rounded-lg text-center transition-all duration-200
                min-h-[56px] touch-manipulation font-medium
                ${isSelected
                  ? 'bg-primary-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                }
                active:scale-95
              `}
            >
              <div className="text-lg">
                {formatTimeSlot(slot)}
              </div>
              {slot.staff && (
                <div className="text-xs mt-1 opacity-75">
                  担当: {slot.staff.name}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimeSlots;
```

---

## 💫 アニメーション・インタラクション

### 1. ページ遷移アニメーション

```jsx
// PageTransition.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: {
    opacity: 0,
    x: '100%'
  },
  in: {
    opacity: 1,
    x: 0
  },
  out: {
    opacity: 0,
    x: '-100%'
  }
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.4
};

const PageTransition = ({ children, path }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={path}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="page"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
```

### 2. タッチフィードバック

```css
/* Touch feedback styles */
.touch-feedback {
  position: relative;
  overflow: hidden;
  transform: perspective(1px) translateZ(0);
}

.touch-feedback::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.touch-feedback:active::before {
  width: 300px;
  height: 300px;
}

/* Haptic feedback simulation */
@keyframes haptic-light {
  0% { transform: scale(1); }
  50% { transform: scale(1.01); }
  100% { transform: scale(1); }
}

@keyframes haptic-medium {
  0% { transform: scale(1); }
  25% { transform: scale(1.02); }
  50% { transform: scale(0.98); }
  75% { transform: scale(1.01); }
  100% { transform: scale(1); }
}

.haptic-light {
  animation: haptic-light 150ms ease-out;
}

.haptic-medium {
  animation: haptic-medium 200ms ease-out;
}
```

---

## 📱 モバイル特化機能

### 1. スワイプナビゲーション

```jsx
// SwipeNavigator.jsx
import React from 'react';
import { useSwipeable } from 'react-swipeable';

const SwipeNavigator = ({ 
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  preventDefaultTouchmoveEvent = true 
}) => {
  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      if (eventData.deltaX > threshold) {
        onSwipeLeft?.();
      }
    },
    onSwipedRight: (eventData) => {
      if (eventData.deltaX > threshold) {
        onSwipeRight?.();
      }
    },
    preventDefaultTouchmoveEvent,
    trackTouch: true,
    trackMouse: false
  });

  return (
    <div {...handlers} className="h-full w-full">
      {children}
    </div>
  );
};

export default SwipeNavigator;
```

### 2. プルトゥリフレッシュ

```jsx
// PullToRefresh.jsx
import React, { useState, useRef, useEffect } from 'react';

const PullToRefresh = ({ 
  children, 
  onRefresh,
  threshold = 80,
  resistance = 2.5 
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (containerRef.current.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (containerRef.current.scrollTop === 0 && startY > 0) {
      const currentY = e.touches[0].clientY;
      const distance = (currentY - startY) / resistance;
      
      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > threshold && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh?.();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setStartY(0);
  };

  const refreshProgress = Math.min(pullDistance / threshold, 1);
  const shouldTrigger = pullDistance > threshold;

  return (
    <div
      ref={containerRef}
      className="relative h-full overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* プルインジケーター */}
      <div 
        className={`
          absolute top-0 left-0 right-0 z-10
          flex items-center justify-center
          bg-white transition-all duration-200
          ${pullDistance > 0 ? 'shadow-sm' : ''}
        `}
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0
        }}
      >
        <div className="flex flex-col items-center space-y-2">
          <div 
            className={`
              w-8 h-8 rounded-full border-2 border-primary-500
              transition-all duration-200
              ${isRefreshing ? 'animate-spin' : ''}
              ${shouldTrigger ? 'bg-primary-500' : ''}
            `}
            style={{
              transform: `rotate(${refreshProgress * 180}deg)`
            }}
          >
            {!isRefreshing && (
              <div className="w-full h-full flex items-center justify-center">
                <div className={`text-xs ${shouldTrigger ? 'text-white' : 'text-primary-500'}`}>
                  ↓
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-600">
            {isRefreshing 
              ? '更新中...' 
              : shouldTrigger 
                ? '離して更新'
                : 'プルして更新'
            }
          </p>
        </div>
      </div>

      {/* コンテンツ */}
      <div 
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
```

---

## 🔧 ユーティリティコンポーネント

### 1. SafeAreaView

```jsx
// SafeAreaView.jsx
import React, { useEffect, useState } from 'react';

const SafeAreaView = ({ children, className = '' }) => {
  const [safeAreaInsets, setSafeAreaInsets] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });

  useEffect(() => {
    const updateSafeArea = () => {
      // iOS SafeArea detection
      const computed = getComputedStyle(document.documentElement);
      setSafeAreaInsets({
        top: parseInt(computed.getPropertyValue('--safe-area-inset-top') || '0'),
        bottom: parseInt(computed.getPropertyValue('--safe-area-inset-bottom') || '0'),
        left: parseInt(computed.getPropertyValue('--safe-area-inset-left') || '0'),
        right: parseInt(computed.getPropertyValue('--safe-area-inset-right') || '0')
      });
    };

    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    window.addEventListener('orientationchange', updateSafeArea);

    return () => {
      window.removeEventListener('resize', updateSafeArea);
      window.removeEventListener('orientationchange', updateSafeArea);
    };
  }, []);

  return (
    <div 
      className={`h-full ${className}`}
      style={{
        paddingTop: `${safeAreaInsets.top}px`,
        paddingBottom: `${safeAreaInsets.bottom}px`,
        paddingLeft: `${safeAreaInsets.left}px`,
        paddingRight: `${safeAreaInsets.right}px`
      }}
    >
      {children}
    </div>
  );
};

export default SafeAreaView;
```

---

このモバイルUIコンポーネント設計書により、美容室アプリに最適化された使いやすいインターフェースを実現できます。各コンポーネントは再利用可能で、アクセシビリティとパフォーマンスを考慮した設計になっています。