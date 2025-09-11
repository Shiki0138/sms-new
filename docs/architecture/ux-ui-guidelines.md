# UX/UIデザインガイドライン

## 1. デザインシステム概要

### 1.1 デザインフィロソフィー
**「美しさと使いやすさの調和」**

美容室顧客向けアプリとして、以下の価値を体現するデザインを追求：
- **エレガンス**: 美容業界にふさわしい洗練されたデザイン
- **親しみやすさ**: 幅広い年齢層（20-60代女性）が直感的に使える
- **信頼性**: プロフェッショナルなサービスへの安心感
- **パーソナリゼーション**: 一人ひとりに寄り添う体験

### 1.2 ターゲットユーザー
```javascript
const UserPersonas = {
  primary: {
    name: "アクティブ美容愛好者（30-45歳）",
    characteristics: [
      "定期的に美容室を利用（月1-2回）",
      "SNSで美容情報を収集・共有", 
      "スマートフォンの操作に慣れている",
      "時間効率を重視",
      "品質とサービスを重要視"
    ],
    pain_points: [
      "予約の取りづらさ",
      "施術履歴の管理",
      "美容師との連絡手段",
      "待ち時間の活用"
    ]
  },
  
  secondary: {
    name: "美容室初心者・不定期利用者（20-35歳）",
    characteristics: [
      "美容室利用は不定期（3-6ヶ月に1回）",
      "価格を重視する傾向",
      "口コミや評価を参考にする",
      "シンプルな操作を好む"
    ]
  },
  
  tertiary: {
    name: "シニア美容愛好者（50-65歳）",
    characteristics: [
      "定期的な利用者",
      "担当者との関係を大切にする",
      "複雑な操作は苦手",
      "大きな文字・ボタンを好む"
    ]
  }
};
```

## 2. ビジュアルデザイン

### 2.1 カラーパレット

```css
/* プライマリーカラー */
:root {
  /* メインブランドカラー */
  --color-primary-50: #faf5ff;
  --color-primary-100: #f3e8ff;
  --color-primary-200: #e9d5ff;
  --color-primary-300: #d8b4fe;
  --color-primary-400: #c084fc;
  --color-primary-500: #a855f7; /* メインカラー */
  --color-primary-600: #9333ea;
  --color-primary-700: #7c2d12;
  --color-primary-800: #581c87;
  --color-primary-900: #3b0764;
  
  /* セカンダリーカラー（ピンク系） */
  --color-secondary-50: #fdf2f8;
  --color-secondary-100: #fce7f3;
  --color-secondary-200: #fbcfe8;
  --color-secondary-300: #f9a8d4;
  --color-secondary-400: #f472b6;
  --color-secondary-500: #ec4899;
  --color-secondary-600: #db2777;
  --color-secondary-700: #be185d;
  --color-secondary-800: #9d174d;
  --color-secondary-900: #831843;
  
  /* グレースケール */
  --color-gray-50: #fafafa;
  --color-gray-100: #f4f4f5;
  --color-gray-200: #e4e4e7;
  --color-gray-300: #d4d4d8;
  --color-gray-400: #a1a1aa;
  --color-gray-500: #71717a;
  --color-gray-600: #52525b;
  --color-gray-700: #3f3f46;
  --color-gray-800: #27272a;
  --color-gray-900: #18181b;
  
  /* セマンティックカラー */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
}
```

### 2.2 タイポグラフィ

```css
/* フォント設定 */
:root {
  /* 日本語フォント */
  --font-family-base: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif;
  
  /* 英数字フォント */
  --font-family-display: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  /* フォントサイズ */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
  
  /* 行間 */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* フォントウェイト */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}

/* タイポグラフィクラス */
.text-display-1 {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.text-display-2 {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.text-heading-1 {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-normal);
}

.text-heading-2 {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
}

.text-body-lg {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-relaxed);
}

.text-body {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
}

.text-caption {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-normal);
}

.text-overline {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-normal);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
```

### 2.3 スペーシングシステム

```css
:root {
  /* 8px ベースのスペーシング */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
  --space-20: 5rem;    /* 80px */
  --space-24: 6rem;    /* 96px */
}
```

### 2.4 ボーダーと影

```css
:root {
  /* ボーダー半径 */
  --border-radius-sm: 0.25rem;  /* 4px */
  --border-radius-md: 0.5rem;   /* 8px */
  --border-radius-lg: 0.75rem;  /* 12px */
  --border-radius-xl: 1rem;     /* 16px */
  --border-radius-2xl: 1.5rem;  /* 24px */
  --border-radius-full: 9999px;
  
  /* 影 */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}
```

## 3. コンポーネントデザイン

### 3.1 ボタンコンポーネント

```jsx
// ボタンバリエーション
const ButtonVariants = {
  // プライマリーボタン
  primary: {
    background: 'var(--color-primary-500)',
    color: 'white',
    hover: 'var(--color-primary-600)',
    active: 'var(--color-primary-700)',
    disabled: 'var(--color-gray-300)',
    use_cases: ['メインCTA', '予約完了', '送信']
  },
  
  // セカンダリーボタン
  secondary: {
    background: 'transparent',
    color: 'var(--color-primary-500)',
    border: '1px solid var(--color-primary-500)',
    hover: 'var(--color-primary-50)',
    use_cases: ['キャンセル', '戻る', 'サブアクション']
  },
  
  // ゴーストボタン
  ghost: {
    background: 'transparent',
    color: 'var(--color-gray-600)',
    hover: 'var(--color-gray-100)',
    use_cases: ['ナビゲーション', '詳細表示']
  },
  
  // 危険アクション
  danger: {
    background: 'var(--color-error)',
    color: 'white',
    hover: '#dc2626',
    use_cases: ['削除', 'キャンセル']
  }
};

// ボタンサイズ
const ButtonSizes = {
  sm: {
    padding: '0.5rem 1rem',
    font_size: 'var(--font-size-sm)',
    min_height: '32px'
  },
  md: {
    padding: '0.75rem 1.5rem',
    font_size: 'var(--font-size-base)',
    min_height: '44px' // タッチターゲット推奨サイズ
  },
  lg: {
    padding: '1rem 2rem',
    font_size: 'var(--font-size-lg)',
    min_height: '52px'
  }
};
```

### 3.2 カードコンポーネント

```jsx
const CardVariants = {
  // 基本カード
  base: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    border_radius: 'var(--border-radius-lg)',
    shadow: 'var(--shadow-sm)',
    padding: 'var(--space-6)'
  },
  
  // エレベーテッドカード
  elevated: {
    background: 'white',
    border: 'none',
    border_radius: 'var(--border-radius-xl)',
    shadow: 'var(--shadow-lg)',
    padding: 'var(--space-6)'
  },
  
  // インタラクティブカード
  interactive: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    hover: {
      shadow: 'var(--shadow-xl)',
      transform: 'translateY(-2px)'
    }
  }
};

// 予約カード例
const AppointmentCard = () => (
  <Box
    bg="white"
    borderWidth="1px"
    borderColor="gray.200"
    borderRadius="xl"
    p={6}
    shadow="sm"
    _hover={{
      shadow: 'md',
      transform: 'translateY(-1px)'
    }}
    transition="all 0.2s"
  >
    <VStack align="start" spacing={4}>
      <HStack justify="space-between" w="full">
        <VStack align="start" spacing={1}>
          <Text fontSize="lg" fontWeight="semibold">
            カット + カラー
          </Text>
          <Text color="gray.600" fontSize="sm">
            2024年1月15日 14:00-16:30
          </Text>
        </VStack>
        <Badge colorScheme="green" variant="subtle">
          予約済み
        </Badge>
      </HStack>
      
      <HStack>
        <Avatar size="sm" src="/stylist-photo.jpg" />
        <Text fontSize="sm">田中 美咲</Text>
      </HStack>
      
      <Divider />
      
      <HStack justify="space-between" w="full">
        <Text fontWeight="bold" fontSize="lg" color="purple.600">
          ¥13,000
        </Text>
        <ButtonGroup size="sm">
          <Button variant="outline">変更</Button>
          <Button colorScheme="purple">詳細</Button>
        </ButtonGroup>
      </HStack>
    </VStack>
  </Box>
);
```

### 3.3 フォームコンポーネント

```jsx
const FormStyles = {
  // 入力フィールド
  input: {
    border: '1px solid var(--color-gray-300)',
    border_radius: 'var(--border-radius-md)',
    padding: '0.75rem 1rem',
    font_size: 'var(--font-size-base)',
    min_height: '44px',
    
    focus: {
      border_color: 'var(--color-primary-500)',
      box_shadow: '0 0 0 3px rgba(168, 85, 247, 0.1)',
      outline: 'none'
    },
    
    error: {
      border_color: 'var(--color-error)',
      box_shadow: '0 0 0 3px rgba(239, 68, 68, 0.1)'
    },
    
    disabled: {
      background: 'var(--color-gray-100)',
      border_color: 'var(--color-gray-200)',
      color: 'var(--color-gray-500)'
    }
  },
  
  // ラベル
  label: {
    font_size: 'var(--font-size-sm)',
    font_weight: 'var(--font-weight-medium)',
    color: 'var(--color-gray-700)',
    margin_bottom: 'var(--space-1)'
  },
  
  // エラーメッセージ
  error_message: {
    font_size: 'var(--font-size-sm)',
    color: 'var(--color-error)',
    margin_top: 'var(--space-1)'
  },
  
  // ヘルプテキスト
  help_text: {
    font_size: 'var(--font-size-sm)',
    color: 'var(--color-gray-500)',
    margin_top: 'var(--space-1)'
  }
};
```

## 4. レイアウト・ナビゲーション

### 4.1 レスポンシブデザイン

```css
/* ブレークポイント */
:root {
  --breakpoint-sm: 640px;   /* モバイル */
  --breakpoint-md: 768px;   /* タブレット */
  --breakpoint-lg: 1024px;  /* デスクトップ小 */
  --breakpoint-xl: 1280px;  /* デスクトップ大 */
}

/* モバイルファースト設計 */
.container {
  width: 100%;
  padding: 0 1rem;
  margin: 0 auto;
}

@media (min-width: 640px) {
  .container {
    max-width: 640px;
    padding: 0 1.5rem;
  }
}

@media (min-width: 768px) {
  .container {
    max-width: 768px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
    padding: 0 2rem;
  }
}
```

### 4.2 ナビゲーション設計

```jsx
// ボトムナビゲーション（モバイル）
const BottomNavigation = () => {
  const navItems = [
    { id: 'home', label: 'ホーム', icon: HomeIcon, path: '/' },
    { id: 'appointments', label: '予約', icon: CalendarIcon, path: '/appointments' },
    { id: 'history', label: '履歴', icon: ClockIcon, path: '/history' },
    { id: 'messages', label: 'メッセージ', icon: MessageIcon, path: '/messages' },
    { id: 'profile', label: 'プロフィール', icon: UserIcon, path: '/profile' }
  ];
  
  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="white"
      borderTop="1px solid"
      borderColor="gray.200"
      px={4}
      py={2}
      zIndex={50}
    >
      <HStack justify="space-around">
        {navItems.map(item => (
          <NavItem key={item.id} {...item} />
        ))}
      </HStack>
    </Box>
  );
};

const NavItem = ({ label, icon: Icon, path, isActive }) => (
  <VStack
    as={Link}
    to={path}
    spacing={1}
    minW="60px"
    py={1}
    color={isActive ? 'purple.500' : 'gray.600'}
    _hover={{ color: 'purple.500' }}
  >
    <Icon size={20} />
    <Text fontSize="xs" fontWeight={isActive ? 'semibold' : 'normal'}>
      {label}
    </Text>
  </VStack>
);
```

### 4.3 ヘッダー設計

```jsx
const AppHeader = ({ title, showBack = false, actions = [] }) => (
  <Box
    bg="white"
    borderBottom="1px solid"
    borderColor="gray.200"
    px={4}
    py={3}
    position="sticky"
    top={0}
    zIndex={40}
  >
    <HStack justify="space-between" align="center">
      <HStack spacing={3}>
        {showBack && (
          <IconButton
            variant="ghost"
            icon={<ArrowBackIcon />}
            onClick={() => history.back()}
            aria-label="戻る"
          />
        )}
        <Text fontSize="lg" fontWeight="semibold" color="gray.800">
          {title}
        </Text>
      </HStack>
      
      {actions.length > 0 && (
        <HStack spacing={2}>
          {actions.map((action, index) => (
            <IconButton
              key={index}
              variant="ghost"
              icon={action.icon}
              onClick={action.onClick}
              aria-label={action.label}
            />
          ))}
        </HStack>
      )}
    </HStack>
  </Box>
);
```

## 5. インタラクション・アニメーション

### 5.1 トランジション設計

```css
/* 基本トランジション */
.transition-base {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-fast {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.transition-slow {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* イージング関数 */
:root {
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 5.2 マイクロインタラクション

```jsx
// ボタンのホバーエフェクト
const InteractiveButton = () => (
  <Button
    bg="purple.500"
    color="white"
    _hover={{
      bg: 'purple.600',
      transform: 'translateY(-1px)',
      shadow: 'lg'
    }}
    _active={{
      transform: 'translateY(0)',
      shadow: 'md'
    }}
    transition="all 0.2s"
  >
    予約する
  </Button>
);

// カードのスケールエフェクト
const HoverCard = () => (
  <Box
    bg="white"
    borderRadius="lg"
    p={6}
    shadow="sm"
    cursor="pointer"
    _hover={{
      shadow: 'xl',
      transform: 'scale(1.02)'
    }}
    transition="all 0.2s ease-out"
  >
    カード内容
  </Box>
);

// 入力フィールドのフォーカスエフェクト
const AnimatedInput = () => (
  <FormControl>
    <FormLabel
      transform="translateY(0)"
      fontSize="sm"
      transition="all 0.2s"
      _focusWithin={{
        color: 'purple.500',
        transform: 'translateY(-2px)'
      }}
    >
      メールアドレス
    </FormLabel>
    <Input
      borderColor="gray.300"
      _focus={{
        borderColor: 'purple.500',
        boxShadow: '0 0 0 3px rgba(168, 85, 247, 0.1)'
      }}
      transition="all 0.2s"
    />
  </FormControl>
);
```

### 5.3 ページトランジション

```jsx
// Framer Motion を使用したページトランジション
const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ 
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

// モーダルアニメーション
const AnimatedModal = ({ isOpen, onClose, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ 
            duration: 0.2,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
```

## 6. アクセシビリティ

### 6.1 色とコントラスト

```css
/* WCAG AA準拠のコントラスト比 */
:root {
  /* テキストカラー（コントラスト比4.5:1以上） */
  --text-on-white: #1f2937;        /* 12.6:1 */
  --text-secondary: #6b7280;       /* 4.6:1 */
  --text-on-primary: #ffffff;      /* 4.9:1 vs purple.500 */
  
  /* リンクカラー */
  --link-color: #7c3aed;           /* 5.1:1 */
  --link-visited: #5b21b6;         /* 7.2:1 */
  
  /* エラー・警告カラー */
  --error-color: #dc2626;          /* 5.9:1 */
  --warning-color: #d97706;        /* 4.8:1 */
  --success-color: #059669;        /* 4.5:1 */
}
```

### 6.2 フォーカス管理

```css
/* キーボードフォーカスの可視化 */
.focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}

/* スキップリンク */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--color-primary-500);
  color: white;
  padding: 8px;
  text-decoration: none;
  border-radius: 4px;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

### 6.3 セマンティックマークアップ

```jsx
// アクセシブルなフォーム
const AccessibleForm = () => (
  <form role="form" aria-labelledby="form-title">
    <Heading id="form-title" as="h2" size="lg" mb={4}>
      予約フォーム
    </Heading>
    
    <FormControl isRequired isInvalid={hasError}>
      <FormLabel htmlFor="appointment-date">
        予約日
      </FormLabel>
      <Input
        id="appointment-date"
        type="date"
        aria-describedby="date-help date-error"
      />
      <FormHelperText id="date-help">
        希望する予約日を選択してください
      </FormHelperText>
      {hasError && (
        <FormErrorMessage id="date-error" role="alert">
          予約日を選択してください
        </FormErrorMessage>
      )}
    </FormControl>
    
    <Button
      type="submit"
      aria-describedby="submit-help"
      disabled={isSubmitting}
    >
      {isSubmitting ? (
        <>
          <Spinner size="sm" mr={2} />
          送信中...
        </>
      ) : (
        '予約を確定する'
      )}
    </Button>
  </form>
);

// アクセシブルなナビゲーション
const AccessibleNav = () => (
  <nav role="navigation" aria-label="メインナビゲーション">
    <ul role="list">
      {navItems.map(item => (
        <li key={item.id}>
          <Link
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
);
```

## 7. モバイル固有の考慮事項

### 7.1 タッチインターフェース

```css
/* タッチターゲットサイズ（最小44px） */
.touch-target {
  min-height: 44px;
  min-width: 44px;
}

/* タッチフィードバック */
.touch-feedback {
  -webkit-tap-highlight-color: rgba(168, 85, 247, 0.2);
  user-select: none;
}

.touch-feedback:active {
  transform: scale(0.98);
  opacity: 0.8;
}
```

### 7.2 ジェスチャー

```jsx
// スワイプジェスチャー対応
const SwipeableCard = () => {
  const [isSwipedLeft, setIsSwipedLeft] = useState(false);
  
  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: -100, right: 0 }}
      dragElastic={0.2}
      onDragEnd={(event, info) => {
        if (info.offset.x < -50) {
          setIsSwipedLeft(true);
        }
      }}
      whileDrag={{ scale: 1.05 }}
    >
      <Box bg="white" p={4} borderRadius="lg">
        カード内容
      </Box>
    </motion.div>
  );
};
```

### 7.3 Safe Area対応

```css
/* iOS Safe Area対応 */
.safe-area-top {
  padding-top: env(safe-area-inset-top);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-inset {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

## 8. ダークモード対応

### 8.1 ダークモードカラーパレット

```css
/* ダークモードカラー */
[data-theme="dark"] {
  --color-bg-primary: #0f172a;
  --color-bg-secondary: #1e293b;
  --color-bg-tertiary: #334155;
  
  --color-text-primary: #f8fafc;
  --color-text-secondary: #cbd5e1;
  --color-text-tertiary: #94a3b8;
  
  --color-border: #475569;
  --color-divider: #334155;
}

/* システム設定に従う */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #0f172a;
    /* ダークモードカラーを適用 */
  }
}
```

### 8.2 ダークモード切り替え

```jsx
const DarkModeToggle = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  
  return (
    <Button
      onClick={toggleColorMode}
      variant="ghost"
      leftIcon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
    >
      {colorMode === 'light' ? 'ダーク' : 'ライト'}モード
    </Button>
  );
};
```

## 9. パフォーマンス最適化

### 9.1 画像最適化

```jsx
// 最適化された画像コンポーネント
const OptimizedImage = ({ src, alt, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  return (
    <Box position="relative" {...props}>
      {!isLoaded && (
        <Box
          position="absolute"
          inset={0}
          bg="gray.200"
          borderRadius="inherit"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Spinner />
        </Box>
      )}
      
      <Image
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        loading="lazy"
        opacity={isLoaded ? 1 : 0}
        transition="opacity 0.3s"
      />
    </Box>
  );
};
```

### 9.2 仮想スクロール

```jsx
// 長いリストの仮想スクロール
const VirtualizedList = ({ items, renderItem, itemHeight = 80 }) => {
  const [containerRef, setContainerRef] = useState(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const containerHeight = 400; // 固定高さ
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  );
  
  const visibleItems = items.slice(visibleStart, visibleEnd);
  
  return (
    <Box
      ref={setContainerRef}
      height={containerHeight}
      overflowY="auto"
      onScroll={(e) => setScrollTop(e.target.scrollTop)}
    >
      <Box height={items.length * itemHeight} position="relative">
        <Box
          position="absolute"
          top={visibleStart * itemHeight}
          width="100%"
        >
          {visibleItems.map((item, index) =>
            renderItem(item, visibleStart + index)
          )}
        </Box>
      </Box>
    </Box>
  );
};
```

このUX/UIガイドラインにより、美容室顧客にとって使いやすく、美しく、アクセシブルなアプリ体験を提供できます。