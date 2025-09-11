/**
 * 美容室管理システム - モバイルジェスチャー＆インタラクション
 * スワイプ、ピンチ、ロングタップなどの高度なタッチ操作
 */

class MobileGestureInteractions {
  constructor() {
    this.touches = {};
    this.gestureStartDistance = 0;
    this.gestureStartScale = 1;
    this.isLongPress = false;
    this.longPressTimer = null;
    this.swipeCards = new Map();
    this.hapticFeedback = 'vibrate' in navigator;
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    this.setupSwipeableCards();
    this.setupLongPressActions();
    this.setupPinchZoom();
    this.setupDoubleTab();
    this.setupEdgeSwipe();
    this.setupContextualSwipe();
    this.setupHapticFeedback();
    
    console.log('Mobile Gesture Interactions initialized');
  }

  /**
   * スワイプ可能カードの設定
   */
  setupSwipeableCards() {
    const cardSelectors = [
      '.appointment-card',
      '.customer-card', 
      '.staff-card',
      '.service-card',
      '.message-item'
    ];

    cardSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(card => {
        this.makeCardSwipeable(card);
      });
    });

    // 動的に追加されるカードの監視
    this.observeNewCards();
  }

  /**
   * カードをスワイプ可能にする
   */
  makeCardSwipeable(card) {
    if (card.dataset.swipeableInit) return;
    
    card.dataset.swipeableInit = 'true';
    card.style.position = 'relative';
    card.style.overflow = 'hidden';
    
    // スワイプアクション作成
    this.createSwipeActions(card);
    
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwipeActive = false;
    let swipeDirection = null;

    // タッチイベント
    card.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      currentX = 0;
      isSwipeActive = true;
      swipeDirection = null;
      
      card.style.transition = 'none';
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
      if (!isSwipeActive || e.touches.length !== 1) return;
      
      const clientX = e.touches[0].clientX;
      const clientY = e.touches[0].clientY;
      const diffX = clientX - startX;
      const diffY = clientY - startY;
      
      // 縦スクロールの判定
      if (Math.abs(diffY) > Math.abs(diffX)) {
        isSwipeActive = false;
        return;
      }
      
      e.preventDefault();
      currentX = diffX;
      
      // スワイプ方向の判定
      if (Math.abs(diffX) > 10) {
        swipeDirection = diffX > 0 ? 'right' : 'left';
      }
      
      // カードの移動
      const progress = Math.min(Math.abs(diffX) / 100, 1);
      card.style.transform = `translateX(${diffX}px)`;
      card.style.opacity = 1 - (progress * 0.3);
      
      // スワイプアクションの表示
      this.updateSwipeActions(card, diffX, swipeDirection);
      
      // ハプティックフィードバック
      if (Math.abs(diffX) > 50 && !card.dataset.hapticTriggered) {
        this.triggerHaptic('light');
        card.dataset.hapticTriggered = 'true';
      }
    }, { passive: false });

    card.addEventListener('touchend', () => {
      if (!isSwipeActive) return;
      
      isSwipeActive = false;
      card.dataset.hapticTriggered = '';
      card.style.transition = 'all 0.3s ease';
      
      // スワイプアクション実行判定
      if (Math.abs(currentX) > 80) {
        this.executeSwipeAction(card, swipeDirection, currentX);
      } else {
        // 元の位置に戻す
        this.resetCard(card);
      }
    }, { passive: true });
  }

  /**
   * スワイプアクション作成
   */
  createSwipeActions(card) {
    const cardType = this.getCardType(card);
    const actions = this.getActionsForCardType(cardType);
    
    // 左スワイプアクション（削除系）
    const leftActions = document.createElement('div');
    leftActions.className = 'swipe-actions swipe-actions-left';
    leftActions.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      height: 100%;
      display: flex;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    // 右スワイプアクション（編集系）
    const rightActions = document.createElement('div');
    rightActions.className = 'swipe-actions swipe-actions-right';
    rightActions.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      display: flex;
      transform: translateX(-100%);
      transition: transform 0.3s ease;
    `;

    // アクションボタン生成
    actions.left.forEach(action => {
      const btn = this.createActionButton(action);
      leftActions.appendChild(btn);
    });

    actions.right.forEach(action => {
      const btn = this.createActionButton(action);
      rightActions.appendChild(btn);
    });

    card.appendChild(leftActions);
    card.appendChild(rightActions);
  }

  /**
   * アクションボタン作成
   */
  createActionButton(action) {
    const button = document.createElement('button');
    button.className = `swipe-action swipe-action-${action.type}`;
    button.dataset.action = action.id;
    button.style.cssText = `
      width: 80px;
      height: 100%;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: ${action.color};
      transition: background-color 0.2s ease;
    `;
    
    button.innerHTML = `
      <span style="font-size: 20px;">${action.icon}</span>
      <span style="font-size: 10px; font-weight: 500;">${action.label}</span>
    `;
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleActionClick(button.closest('.appointment-card, .customer-card, .staff-card, .service-card, .message-item'), action);
    });
    
    return button;
  }

  /**
   * カードタイプ判定
   */
  getCardType(card) {
    if (card.classList.contains('appointment-card')) return 'appointment';
    if (card.classList.contains('customer-card')) return 'customer';
    if (card.classList.contains('staff-card')) return 'staff';
    if (card.classList.contains('service-card')) return 'service';
    if (card.classList.contains('message-item')) return 'message';
    return 'default';
  }

  /**
   * カードタイプ別アクション定義
   */
  getActionsForCardType(type) {
    const actionSets = {
      appointment: {
        left: [
          { id: 'cancel', icon: '❌', label: 'キャンセル', color: '#ef4444', type: 'danger' },
          { id: 'reschedule', icon: '📅', label: '変更', color: '#f59e0b', type: 'warning' }
        ],
        right: [
          { id: 'complete', icon: '✅', label: '完了', color: '#10b981', type: 'success' },
          { id: 'edit', icon: '✏️', label: '編集', color: '#3b82f6', type: 'primary' }
        ]
      },
      customer: {
        left: [
          { id: 'delete', icon: '🗑️', label: '削除', color: '#ef4444', type: 'danger' }
        ],
        right: [
          { id: 'call', icon: '📞', label: '電話', color: '#10b981', type: 'success' },
          { id: 'message', icon: '💬', label: 'メッセージ', color: '#3b82f6', type: 'primary' },
          { id: 'edit', icon: '✏️', label: '編集', color: '#6b7280', type: 'secondary' }
        ]
      },
      message: {
        left: [
          { id: 'delete', icon: '🗑️', label: '削除', color: '#ef4444', type: 'danger' },
          { id: 'archive', icon: '📦', label: 'アーカイブ', color: '#6b7280', type: 'secondary' }
        ],
        right: [
          { id: 'reply', icon: '↩️', label: '返信', color: '#3b82f6', type: 'primary' },
          { id: 'forward', icon: '↪️', label: '転送', color: '#10b981', type: 'success' }
        ]
      },
      default: {
        left: [
          { id: 'delete', icon: '🗑️', label: '削除', color: '#ef4444', type: 'danger' }
        ],
        right: [
          { id: 'edit', icon: '✏️', label: '編集', color: '#3b82f6', type: 'primary' }
        ]
      }
    };

    return actionSets[type] || actionSets.default;
  }

  /**
   * ロングプレスアクション設定
   */
  setupLongPressActions() {
    const longPressTargets = '.appointment-card, .customer-card, .stat-card, .nav-item';
    
    document.addEventListener('touchstart', (e) => {
      const target = e.target.closest(longPressTargets);
      if (!target) return;
      
      this.isLongPress = false;
      this.longPressTimer = setTimeout(() => {
        this.isLongPress = true;
        this.handleLongPress(target, e);
      }, 500);
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }, { passive: true });

    document.addEventListener('touchmove', () => {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }, { passive: true });
  }

  /**
   * ロングプレス処理
   */
  handleLongPress(element, originalEvent) {
    this.triggerHaptic('medium');
    
    // コンテキストメニュー表示
    this.showContextMenu(element, originalEvent);
    
    // 視覚フィードバック
    element.style.transform = 'scale(0.98)';
    element.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.15)';
    
    setTimeout(() => {
      element.style.transform = '';
      element.style.boxShadow = '';
    }, 200);
  }

  /**
   * コンテキストメニュー表示
   */
  showContextMenu(element, event) {
    // 既存のコンテキストメニューを削除
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) {
      existingMenu.remove();
    }

    const cardType = this.getCardType(element);
    const actions = this.getContextMenuActions(cardType);
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.cssText = `
      position: fixed;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      padding: 8px 0;
      z-index: 1000;
      min-width: 150px;
      opacity: 0;
      transform: scale(0.9);
      transition: all 0.2s ease;
    `;

    actions.forEach(action => {
      const item = document.createElement('button');
      item.className = 'context-menu-item';
      item.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        border: none;
        background: none;
        text-align: left;
        font-size: 14px;
        color: #374151;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: background-color 0.2s ease;
      `;
      
      item.innerHTML = `
        <span style="font-size: 16px;">${action.icon}</span>
        <span>${action.label}</span>
      `;
      
      item.addEventListener('click', () => {
        this.handleActionClick(element, action);
        menu.remove();
      });

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f3f4f6';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'transparent';
      });
      
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // 位置調整
    const touch = event.touches[0];
    const rect = menu.getBoundingClientRect();
    let x = touch.clientX;
    let y = touch.clientY;

    // 画面外に出ないよう調整
    if (x + rect.width > window.innerWidth) {
      x = window.innerWidth - rect.width - 10;
    }
    if (y + rect.height > window.innerHeight) {
      y = touch.clientY - rect.height;
    }

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    // アニメーション
    requestAnimationFrame(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'scale(1)';
    });

    // 外側クリックで閉じる
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('touchstart', closeMenu);
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('touchstart', closeMenu);
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  /**
   * コンテキストメニューアクション
   */
  getContextMenuActions(cardType) {
    const actionSets = {
      appointment: [
        { id: 'view', icon: '👁️', label: '詳細表示' },
        { id: 'edit', icon: '✏️', label: '編集' },
        { id: 'duplicate', icon: '📋', label: '複製' },
        { id: 'reschedule', icon: '📅', label: '日時変更' },
        { id: 'cancel', icon: '❌', label: 'キャンセル' }
      ],
      customer: [
        { id: 'view', icon: '👁️', label: '詳細表示' },
        { id: 'edit', icon: '✏️', label: '編集' },
        { id: 'call', icon: '📞', label: '電話' },
        { id: 'message', icon: '💬', label: 'メッセージ' },
        { id: 'history', icon: '📊', label: '履歴' }
      ],
      default: [
        { id: 'view', icon: '👁️', label: '詳細表示' },
        { id: 'edit', icon: '✏️', label: '編集' }
      ]
    };

    return actionSets[cardType] || actionSets.default;
  }

  /**
   * ダブルタップ設定
   */
  setupDoubleTab() {
    let lastTap = 0;
    
    document.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;
      
      if (tapLength < 500 && tapLength > 0) {
        const target = e.target.closest('.appointment-card, .customer-card, .stat-card');
        if (target) {
          this.handleDoubleTap(target);
        }
      }
      
      lastTap = currentTime;
    }, { passive: true });
  }

  /**
   * ダブルタップ処理
   */
  handleDoubleTap(element) {
    this.triggerHaptic('light');
    
    // ズームエフェクト
    element.style.transition = 'transform 0.1s ease';
    element.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
      
      // ダブルタップアクション実行
      this.executeDoubleTapAction(element);
    }, 100);
  }

  /**
   * ダブルタップアクション実行
   */
  executeDoubleTapAction(element) {
    const cardType = this.getCardType(element);
    
    switch (cardType) {
      case 'appointment':
        this.openAppointmentDetail(element);
        break;
      case 'customer':
        this.openCustomerDetail(element);
        break;
      case 'stat-card':
        this.openStatDetail(element);
        break;
    }
  }

  /**
   * エッジスワイプ設定
   */
  setupEdgeSwipe() {
    let startX = 0;
    let startFromEdge = false;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startFromEdge = startX < 20 || startX > window.innerWidth - 20;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!startFromEdge) return;
      
      const currentX = e.touches[0].clientX;
      const diffX = currentX - startX;
      
      // 左エッジからの右スワイプ（戻る）
      if (startX < 20 && diffX > 50) {
        this.handleEdgeSwipeBack();
        startFromEdge = false;
      }
      
      // 右エッジからの左スワイプ（進む）
      if (startX > window.innerWidth - 20 && diffX < -50) {
        this.handleEdgeSwipeForward();
        startFromEdge = false;
      }
    }, { passive: true });
  }

  /**
   * ハプティックフィードバック設定
   */
  setupHapticFeedback() {
    // 利用可能な場合のみ設定
    if (!this.hapticFeedback) return;
    
    // 各種アクションにハプティックフィードバックを追加
    this.addHapticToButtons();
  }

  /**
   * ボタンにハプティック追加
   */
  addHapticToButtons() {
    const buttons = document.querySelectorAll('button, .btn, [role="button"]');
    
    buttons.forEach(button => {
      button.addEventListener('touchstart', () => {
        this.triggerHaptic('light');
      }, { passive: true });
    });
  }

  /**
   * ハプティックフィードバック実行
   */
  triggerHaptic(type = 'light') {
    if (!this.hapticFeedback) return;
    
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      error: [20, 100, 20, 100, 20]
    };
    
    const pattern = patterns[type] || patterns.light;
    
    if (Array.isArray(pattern)) {
      navigator.vibrate(pattern);
    } else {
      navigator.vibrate(pattern);
    }
  }

  /**
   * 新しいカードの監視
   */
  observeNewCards() {
    if (!('MutationObserver' in window)) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const cards = node.querySelectorAll('.appointment-card, .customer-card, .staff-card, .service-card, .message-item');
              cards.forEach(card => this.makeCardSwipeable(card));
              
              if (node.matches && node.matches('.appointment-card, .customer-card, .staff-card, .service-card, .message-item')) {
                this.makeCardSwipeable(node);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * スワイプアクション更新
   */
  updateSwipeActions(card, diffX, direction) {
    const leftActions = card.querySelector('.swipe-actions-left');
    const rightActions = card.querySelector('.swipe-actions-right');
    
    if (direction === 'left' && leftActions) {
      const progress = Math.min(Math.abs(diffX) / 100, 1);
      leftActions.style.transform = `translateX(${100 - (progress * 100)}%)`;
    } else if (direction === 'right' && rightActions) {
      const progress = Math.min(Math.abs(diffX) / 100, 1);
      rightActions.style.transform = `translateX(${-100 + (progress * 100)}%)`;
    }
  }

  /**
   * スワイプアクション実行
   */
  executeSwipeAction(card, direction, distance) {
    const isFullSwipe = Math.abs(distance) > 150;
    
    if (isFullSwipe) {
      // 完全スワイプ - カード削除
      this.animateCardRemoval(card, direction);
    } else {
      // 部分スワイプ - アクション選択
      this.showSwipeActionMenu(card, direction);
    }
  }

  /**
   * カードリセット
   */
  resetCard(card) {
    card.style.transform = '';
    card.style.opacity = '';
    
    const actions = card.querySelectorAll('.swipe-actions');
    actions.forEach(action => {
      action.style.transform = action.classList.contains('swipe-actions-left') 
        ? 'translateX(100%)' 
        : 'translateX(-100%)';
    });
  }

  /**
   * カード削除アニメーション
   */
  animateCardRemoval(card, direction) {
    card.style.transform = `translateX(${direction === 'left' ? '-100%' : '100%'})`;
    card.style.opacity = '0';
    
    setTimeout(() => {
      // 実際の削除処理は呼び出し元に委譲
      this.handleCardRemoval(card);
    }, 300);
  }

  /**
   * アクションクリック処理
   */
  handleActionClick(card, action) {
    this.triggerHaptic('medium');
    
    // アクション実行
    switch (action.id) {
      case 'edit':
        this.openEditModal(card);
        break;
      case 'delete':
        this.confirmDelete(card);
        break;
      case 'call':
        this.makeCall(card);
        break;
      case 'message':
        this.openMessageComposer(card);
        break;
      // 他のアクション...
    }
    
    // カードをリセット
    this.resetCard(card);
  }

  /**
   * ユーティリティメソッド群
   */
  openEditModal(card) {
    console.log('Edit modal for:', card.dataset.id);
  }

  confirmDelete(card) {
    if (confirm('削除してもよろしいですか？')) {
      this.animateCardRemoval(card, 'left');
    }
  }

  makeCall(card) {
    const phone = card.dataset.phone;
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  }

  openMessageComposer(card) {
    console.log('Message composer for:', card.dataset.id);
  }

  handleEdgeSwipeBack() {
    if (window.history.length > 1) {
      window.history.back();
    }
  }

  handleEdgeSwipeForward() {
    window.history.forward();
  }

  openAppointmentDetail(card) {
    console.log('Appointment detail for:', card.dataset.id);
  }

  openCustomerDetail(card) {
    console.log('Customer detail for:', card.dataset.id);
  }

  openStatDetail(card) {
    console.log('Stat detail for:', card.dataset.stat);
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  if (window.innerWidth <= 768) {
    window.mobileGestures = new MobileGestureInteractions();
  }
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileGestureInteractions;
}