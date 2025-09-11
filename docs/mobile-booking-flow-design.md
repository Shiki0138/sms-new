# モバイル予約フロー設計書

## 📱 予約フロー概要

### 基本予約フロー
```
スタート → 日程選択 → 時間選択 → サービス選択 → 確認 → 完了
   ↓          ↓          ↓          ↓        ↓      ↓
 認証確認   カレンダー  タイムスロット  メニュー  予約確定  通知送信
```

### 高速予約フロー（リピーター向け）
```
スタート → ワンタップ予約 → 確認 → 完了
   ↓           ↓          ↓      ↓
前回同様    前回設定表示   確認    予約確定
```

---

## 🎯 インタラクション設計

### 1. 日程選択画面

#### UI構成
```
┌─────────────────────────────┐
│ ← 予約を作成                 │ ←戻るボタン
├─────────────────────────────┤
│                             │
│ 📅 ご希望の日程を選択         │
│                             │
│ 今すぐ予約可能 ✨            │ ←ショートカット
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │今日  │ │明日  │ │明後日│    │
│ │ 〇  │ │ △  │ │ ×  │    │
│ └─────┘ └─────┘ └─────┘    │
│                             │
│      2024年 12月             │
│  ◀ ────────────────────── ▶  │ ←スワイプナビゲーション
│                             │
│  日 月 火 水 木 金 土         │
│  1  2  3  4  5  6  7        │
│  8  9 10 11 12 ●13 14       │ ●=選択日
│ 15 16 17 18 19 20 21        │
│ 22 23 24 25 26 27 28        │
│ 29 30 31                    │
│                             │
│ 💡 平日がおすすめです         │ ←ヒント表示
└─────────────────────────────┘
```

#### インタラクション仕様
```javascript
// 日程選択のインタラクション
const CalendarInteraction = {
  // タップ操作
  onDateTap: {
    feedback: 'haptic-light',        // 触覚フィードバック
    animation: 'bounce-scale',       // 選択アニメーション
    duration: 150,                   // ms
    ripple: true                     // リップルエフェクト
  },
  
  // スワイプ操作
  onSwipe: {
    threshold: 50,                   // px
    direction: 'horizontal',         // 横スワイプのみ
    preventDefault: true,            // デフォルト動作を無効化
    animation: 'slide-transition'    // ページ遷移アニメーション
  },
  
  // 空き状況表示
  availability: {
    available: '⚪',                // 空きあり
    limited: '🔸',                  // 残りわずか
    full: '❌',                     // 満席
    past: '⚫',                     // 過去日
    holiday: '🎌'                   // 休業日
  }
};
```

### 2. 時間選択画面

#### UI構成
```
┌─────────────────────────────┐
│ ← 12月13日(金)               │
├─────────────────────────────┤
│                             │
│ 🕐 ご希望の時間を選択         │
│                             │
│ ⏰ おすすめ時間帯             │
│ ┌─────────────────────┐    │
│ │ 14:00〜15:30            │    │
│ │ カット・カラー          │    │
│ │ 山田スタイリスト        │    │ ←推奨スロット
│ │ 🎯 お得な平日料金       │    │
│ └─────────────────────┘    │
│                             │
│ 🌅 午前                     │
│ ┌─────┐ ┌─────┐            │
│ │09:00│ │10:30│            │
│ │〜   │ │〜   │            │
│ │10:30│ │12:00│            │
│ └─────┘ └─────┘            │
│                             │
│ 🌞 午後                     │
│ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │13:00│ │14:30│ │16:00│    │
│ │〜   │ │〜   │ │〜   │    │
│ │14:30│ │16:00│ │17:30│    │
│ └─────┘ └─────┘ └─────┘    │
│                             │
│ 🌙 夜間                     │
│ ┌─────┐ ┌─────┐            │
│ │18:00│ │19:30│            │
│ │〜   │ │〜   │            │
│ │19:30│ │21:00│            │
│ └─────┘ └─────┘            │
└─────────────────────────────┘
```

#### 時間スロット動的表示
```javascript
// 時間スロットの動的表示ロジック
const TimeSlotLogic = {
  // スロット生成
  generateSlots: (date, services) => {
    const slots = [];
    const businessHours = getBusinessHours(date);
    const existingAppointments = getExistingAppointments(date);
    
    // 30分間隔でスロット生成
    for (let hour = businessHours.start; hour < businessHours.end; hour += 0.5) {
      const slot = {
        start: formatTime(hour),
        end: formatTime(hour + getDuration(services)),
        available: checkAvailability(hour, existingAppointments),
        staff: getAvailableStaff(hour),
        price: calculatePrice(services, hour, date.getDay()),
        recommended: isRecommendedTime(hour, date.getDay())
      };
      
      if (slot.available) {
        slots.push(slot);
      }
    }
    
    return slots.sort((a, b) => {
      // おすすめ順でソート
      if (a.recommended && !b.recommended) return -1;
      if (!a.recommended && b.recommended) return 1;
      return a.start.localeCompare(b.start);
    });
  },

  // 料金計算
  calculatePrice: (services, hour, dayOfWeek) => {
    let basePrice = services.reduce((sum, service) => sum + service.price, 0);
    
    // 時間帯割引
    if (hour >= 9 && hour < 12) {
      basePrice *= 0.9; // 午前10%オフ
    }
    
    // 平日割引
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      basePrice *= 0.95; // 平日5%オフ
    }
    
    return Math.floor(basePrice);
  }
};
```

### 3. サービス選択画面

#### UI構成
```
┌─────────────────────────────┐
│ ← 12月13日(金) 14:00         │
├─────────────────────────────┤
│                             │
│ ✂️ サービスを選択             │
│                             │
│ 👤 担当スタッフ              │
│ ┌─────────────────────┐    │
│ │ 👩 山田 美咲            │    │
│ │ ⭐⭐⭐⭐⭐ 4.9        │    │
│ │ 💬 "丁寧で技術が高い"   │    │
│ └─────────────────────┘    │
│                             │
│ 📋 メニュー                  │
│                             │
│ 🔥 人気メニュー              │
│ ┏━━━━━━━━━━━━━━━━━━━━━┓    │
│ ┃ ✓ カット + カラー      ┃    │ ←選択済み
│ ┃   90分 ¥8,900        ┃    │
│ ┃   (¥1,200お得!)      ┃    │
│ ┗━━━━━━━━━━━━━━━━━━━━━┛    │
│                             │
│ 💇‍♀️ カット                  │
│ ┌─────────────────────┐    │
│ │ □ レディースカット      │    │
│ │   45分 ¥4,500        │    │
│ └─────────────────────┘    │
│                             │
│ 🎨 カラー                   │
│ ┌─────────────────────┐    │
│ │ □ 全体カラー           │    │
│ │   60分 ¥6,800        │    │
│ │ □ ハイライト          │    │
│ │   90分 ¥9,800        │    │
│ └─────────────────────┘    │
│                             │
│ ──────────────────────────  │
│ 合計時間: 90分               │
│ 合計料金: ¥8,900            │
│                             │
│ ┌─────────────────────┐    │
│ │      次へ進む        │    │
│ └─────────────────────┘    │
└─────────────────────────────┘
```

#### スマートレコメンデーション
```javascript
// AI駆動のサービス推薦システム
const ServiceRecommendation = {
  // 顧客履歴ベース推薦
  getHistoryBasedRecommendations: (customerId) => {
    const history = getCustomerHistory(customerId);
    const preferences = analyzePreferences(history);
    
    return {
      frequentServices: preferences.mostUsed,
      seasonalRecommendations: getSeasonalServices(),
      upgradeOpportunities: suggestUpgrades(preferences),
      bundleDeals: createBundleOffers(preferences)
    };
  },

  // 時間帯ベース推薦
  getTimeBasedRecommendations: (timeSlot) => {
    if (timeSlot.hour >= 9 && timeSlot.hour < 12) {
      return {
        title: '午前限定メニュー',
        discount: 0.1,
        services: ['クイックカット', 'ヘッドスパ']
      };
    }
    return null;
  },

  // 動的価格計算
  calculateDynamicPricing: (services, timeSlot, customer) => {
    let totalPrice = services.reduce((sum, service) => sum + service.basePrice, 0);
    
    // 時間帯調整
    totalPrice *= timeSlot.priceMultiplier;
    
    // 顧客ランク調整
    totalPrice *= customer.loyaltyMultiplier;
    
    // セット割引
    if (services.length > 1) {
      totalPrice *= 0.9;
    }
    
    return {
      originalPrice: services.reduce((sum, s) => sum + s.basePrice, 0),
      finalPrice: Math.floor(totalPrice),
      savings: Math.floor(totalPrice * 0.1),
      discounts: getAppliedDiscounts(services, timeSlot, customer)
    };
  }
};
```

### 4. 確認画面

#### UI構成
```
┌─────────────────────────────┐
│ ← 予約内容を確認              │
├─────────────────────────────┤
│                             │
│ ✅ 予約内容                  │
│                             │
│ 📅 日時                     │
│ ┌─────────────────────┐    │
│ │ 2024年12月13日(金)      │    │
│ │ 14:00 〜 15:30        │    │
│ │ 90分                  │    │
│ └─────────────────────┘    │
│                             │
│ 👤 担当スタッフ              │
│ ┌─────────────────────┐    │
│ │ 山田 美咲さん          │    │
│ │ ⭐ 4.9 (127件)        │    │
│ └─────────────────────┘    │
│                             │
│ ✂️ サービス                  │
│ ┌─────────────────────┐    │
│ │ • カット (45分)        │    │
│ │ • 全体カラー (60分)     │    │
│ │                      │    │
│ │ セット割引: -¥1,200    │    │
│ │ 平日割引: -¥450       │    │
│ └─────────────────────┘    │
│                             │
│ 💳 お支払い                  │
│ ┌─────────────────────┐    │
│ │ 小計: ¥10,300         │    │
│ │ 割引: -¥1,650         │    │
│ │ ─────────────────     │    │
│ │ 合計: ¥8,650          │    │
│ │                      │    │
│ │ 💎 50pt 獲得予定       │    │
│ └─────────────────────┘    │
│                             │
│ 📝 備考・要望                │
│ ┌─────────────────────┐    │
│ │ 前回より少し短めに...   │    │ ←入力フィールド
│ └─────────────────────┘    │
│                             │
│ ┌─────────────────────┐    │
│ │      予約を確定       │    │ ←メインCTA
│ └─────────────────────┘    │
│                             │
│ キャンセルは2時間前まで可能   │ ←注意事項
└─────────────────────────────┘
```

#### 最終確認プロセス
```javascript
// 予約確定プロセス
const BookingConfirmation = {
  // 予約データの検証
  validateBooking: (bookingData) => {
    const validations = [
      validateTimeSlot(bookingData.dateTime),
      validateServices(bookingData.services),
      validateStaffAvailability(bookingData.staff, bookingData.dateTime),
      validateCustomerData(bookingData.customer)
    ];
    
    const errors = validations.filter(v => !v.valid);
    
    if (errors.length > 0) {
      throw new BookingValidationError(errors);
    }
    
    return true;
  },

  // 予約の作成
  createBooking: async (bookingData) => {
    try {
      // 1. 最終検証
      this.validateBooking(bookingData);
      
      // 2. 予約をサーバーに送信
      const response = await apiClient.post('/appointments', bookingData);
      
      if (response.ok) {
        const appointment = await response.json();
        
        // 3. ローカルストレージに保存
        await storageService.saveAppointment(appointment);
        
        // 4. リマインダー通知をスケジュール
        await notificationService.scheduleAppointmentReminder(appointment);
        
        // 5. 成功イベントを発火
        this.dispatchBookingEvent('success', appointment);
        
        return appointment;
      }
    } catch (error) {
      // オフライン時は同期キューに追加
      if (!navigator.onLine) {
        await syncService.saveOfflineAction('appointment_create', bookingData);
        this.dispatchBookingEvent('offline', bookingData);
      } else {
        this.dispatchBookingEvent('error', error);
        throw error;
      }
    }
  },

  // イベント配信
  dispatchBookingEvent: (type, data) => {
    const event = new CustomEvent(`booking-${type}`, { detail: data });
    window.dispatchEvent(event);
  }
};
```

---

## 🚀 高速化テクニック

### 1. プリロード戦略

```javascript
// データのプリロード
const PreloadStrategy = {
  // 画面遷移前のデータプリロード
  preloadNextScreen: async (currentScreen, nextScreen) => {
    switch (nextScreen) {
      case 'timeSlots':
        // 時間スロットデータのプリロード
        const selectedDate = getCurrentSelectedDate();
        if (selectedDate) {
          preloadTimeSlots(selectedDate);
        }
        break;
        
      case 'services':
        // サービスデータのプリロード
        preloadServices();
        preloadStaffInfo();
        break;
        
      case 'confirmation':
        // 料金計算のプリロード
        const selectedServices = getCurrentSelectedServices();
        if (selectedServices.length > 0) {
          preloadPriceCalculation(selectedServices);
        }
        break;
    }
  },

  // 画像の先読み
  preloadImages: async (imageUrls) => {
    const promises = imageUrls.map(url => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
    });
    
    try {
      await Promise.all(promises);
      console.log('[Preload] Images loaded successfully');
    } catch (error) {
      console.warn('[Preload] Some images failed to load:', error);
    }
  }
};
```

### 2. 入力予測・オートコンプリート

```javascript
// スマート入力補完
const SmartInput = {
  // 顧客の過去入力から予測
  predictInput: (inputField, customerId) => {
    const history = getCustomerInputHistory(customerId, inputField);
    const predictions = analyzeInputPatterns(history);
    
    return predictions.slice(0, 3); // 上位3つを返す
  },

  // リアルタイム入力補完
  setupAutoComplete: (inputElement, predictions) => {
    let debounceTimer;
    
    inputElement.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      
      debounceTimer = setTimeout(() => {
        const value = e.target.value;
        const matches = predictions.filter(p => 
          p.toLowerCase().includes(value.toLowerCase())
        );
        
        showAutoCompleteDropdown(matches, inputElement);
      }, 300);
    });
  }
};
```

### 3. ジェスチャー最適化

```javascript
// タッチジェスチャーの最適化
const GestureOptimization = {
  // マルチタッチ対応
  setupMultiTouch: (element) => {
    let touchStartTime = 0;
    let touchCount = 0;
    
    element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchCount = e.touches.length;
      
      // ダブルタップ検出
      if (touchCount === 1) {
        setTimeout(() => {
          if (Date.now() - touchStartTime < 300) {
            handleDoubleTap(e);
          }
        }, 300);
      }
    });
  },

  // スワイプ感度調整
  optimizeSwipeDetection: (element) => {
    let startX = 0;
    let startY = 0;
    let threshold = 50;
    
    element.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });
    
    element.addEventListener('touchend', (e) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      // 水平スワイプの検出
      if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > 0) {
          handleSwipeRight();
        } else {
          handleSwipeLeft();
        }
      }
    });
  }
};
```

---

## 📊 分析・改善

### 1. ユーザー行動トラッキング

```javascript
// 予約フロー分析
const BookingFlowAnalytics = {
  // ステップ別離脱率の計測
  trackStepCompletion: (step, timeSpent) => {
    analytics.track('booking_step_completed', {
      step,
      timeSpent,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  },

  // 離脱ポイントの特定
  trackAbandonedBooking: (lastStep, reason) => {
    analytics.track('booking_abandoned', {
      lastStep,
      reason,
      timestamp: new Date().toISOString()
    });
  },

  // A/Bテスト用のバリエーション
  getBookingFlowVariation: () => {
    const variations = ['standard', 'express', 'guided'];
    const userId = getCurrentUserId();
    const hash = simpleHash(userId);
    
    return variations[hash % variations.length];
  }
};
```

この詳細な予約フロー設計により、美容室顧客に最適化された直感的で高速な予約体験を提供できます。各ステップでの離脱を最小限に抑え、コンバージョン率を最大化する設計になっています。