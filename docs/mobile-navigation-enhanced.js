/**
 * 美容室管理システム - モバイル最適化ナビゲーション
 * スマートフォンでの片手操作に特化したナビゲーションシステム
 */

class MobileNavigationEnhanced {
  constructor() {
    this.isInitialized = false;
    this.currentPage = 'dashboard';
    this.bottomNavHeight = 60;
    this.safeAreaBottom = this.getSafeAreaBottom();
    this.gestureThreshold = 30;
    this.swipeStartX = 0;
    this.swipeStartY = 0;
    
    this.init();
  }

  /**
   * 初期化
   */
  init() {
    if (this.isInitialized) return;
    
    this.createMobileBottomNavigation();
    this.setupGestureNavigation();
    this.setupFloatingActionButton();
    this.setupMobileHeader();
    this.optimizeExistingSidebar();
    this.setupSwipeToGoBack();
    this.setupPullToRefresh();
    
    this.isInitialized = true;
    console.log('Mobile Navigation Enhanced initialized');
  }

  /**
   * セーフエリアの底部高さを取得
   */
  getSafeAreaBottom() {
    if (CSS.supports('padding-bottom', 'env(safe-area-inset-bottom)')) {
      const testElement = document.createElement('div');
      testElement.style.paddingBottom = 'env(safe-area-inset-bottom)';
      document.body.appendChild(testElement);
      const bottom = parseInt(getComputedStyle(testElement).paddingBottom) || 0;
      document.body.removeChild(testElement);
      return bottom;
    }
    return 0;
  }

  /**
   * ボトムナビゲーション作成
   */
  createMobileBottomNavigation() {
    // 既存のモバイルナビゲーションを削除
    const existingNav = document.querySelector('.mobile-bottom-nav');
    if (existingNav) {
      existingNav.remove();
    }

    const bottomNav = document.createElement('nav');
    bottomNav.className = 'mobile-bottom-nav';
    bottomNav.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: ${this.bottomNavHeight + this.safeAreaBottom}px;
      background: white;
      border-top: 1px solid #e5e7eb;
      padding: 8px 0 ${this.safeAreaBottom}px 0;
      z-index: 1000;
      display: none;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    `;

    const navItems = [
      { icon: '🏠', label: 'ホーム', page: 'dashboard', isMain: true },
      { icon: '📅', label: '予約', page: 'appointments', isMain: true },
      { icon: '👥', label: '顧客', page: 'customers', isMain: true },
      { icon: '💬', label: 'メッセージ', page: 'messages', isMain: false },
      { icon: '⚙️', label: '設定', page: 'settings', isMain: false }
    ];

    const navHTML = `
      <div class="mobile-nav-container" style="
        display: flex;
        justify-content: space-around;
        align-items: flex-start;
        height: 100%;
        padding: 0 8px;
      ">
        ${navItems.map((item, index) => `
          <div class="mobile-nav-item ${item.page === this.currentPage ? 'active' : ''}" 
               data-page="${item.page}"
               style="
                 display: flex;
                 flex-direction: column;
                 align-items: center;
                 justify-content: center;
                 flex: 1;
                 padding: 6px 4px;
                 color: ${item.page === this.currentPage ? '#ec4899' : '#6b7280'};
                 text-decoration: none;
                 font-size: 11px;
                 font-weight: 500;
                 transition: all 0.2s ease;
                 border-radius: 12px;
                 margin: 0 2px;
                 cursor: pointer;
                 background: ${item.page === this.currentPage ? '#fdf2f8' : 'transparent'};
                 min-height: 44px;
                 position: relative;
               ">
            <span class="nav-icon" style="
              font-size: 20px;
              margin-bottom: 2px;
              display: block;
            ">${item.icon}</span>
            <span class="nav-label" style="
              font-size: 10px;
              text-align: center;
              line-height: 1.2;
            ">${item.label}</span>
            ${item.isMain ? '<div class="nav-indicator" style="position: absolute; top: 2px; right: 2px; width: 4px; height: 4px; background: #10b981; border-radius: 50%; opacity: 0.8;"></div>' : ''}
          </div>
        `).join('')}
      </div>
    `;

    bottomNav.innerHTML = navHTML;
    document.body.appendChild(bottomNav);

    // モバイルでのみ表示
    this.updateBottomNavVisibility();

    // クリックイベント
    bottomNav.addEventListener('click', (e) => {
      const navItem = e.target.closest('.mobile-nav-item');
      if (navItem) {
        const page = navItem.dataset.page;
        this.navigateToPage(page);
      }
    });

    // メインコンテンツのパディング調整
    this.adjustMainContentPadding();
  }

  /**
   * フローティングアクションボタン設定
   */
  setupFloatingActionButton() {
    // 既存のFABを削除
    const existingFab = document.querySelector('.fab-container');
    if (existingFab) {
      existingFab.remove();
    }

    const fabContainer = document.createElement('div');
    fabContainer.className = 'fab-container';
    fabContainer.style.cssText = `
      position: fixed;
      right: 16px;
      bottom: ${this.bottomNavHeight + this.safeAreaBottom + 16}px;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.3s ease;
    `;

    const fabButtons = [
      { icon: '➕', action: 'newAppointment', primary: true, label: '新規予約' },
      { icon: '📞', action: 'quickCall', primary: false, label: '通話' },
      { icon: '💬', action: 'quickMessage', primary: false, label: 'メッセージ' }
    ];

    const fabHTML = fabButtons.map((fab, index) => `
      <button class="fab ${fab.primary ? 'fab-primary' : 'fab-secondary'}" 
              data-action="${fab.action}"
              aria-label="${fab.label}"
              style="
                width: ${fab.primary ? '56px' : '48px'};
                height: ${fab.primary ? '56px' : '48px'};
                border-radius: 50%;
                background: ${fab.primary ? '#ec4899' : 'white'};
                color: ${fab.primary ? 'white' : '#ec4899'};
                border: ${fab.primary ? 'none' : '2px solid #ec4899'};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${fab.primary ? '24px' : '20px'};
                box-shadow: ${fab.primary ? '0 4px 12px rgba(236, 72, 153, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)'};
                transition: all 0.3s ease;
                cursor: pointer;
                opacity: ${index === 0 ? '1' : '0'};
                transform: ${index === 0 ? 'scale(1)' : 'scale(0.8)'};
                animation-delay: ${index * 0.1}s;
              ">
        ${fab.icon}
      </button>
    `).join('');

    fabContainer.innerHTML = fabHTML;
    document.body.appendChild(fabContainer);

    // FABクリックイベント
    fabContainer.addEventListener('click', (e) => {
      const fabButton = e.target.closest('.fab');
      if (fabButton) {
        const action = fabButton.dataset.action;
        this.handleFabAction(action);
        
        // アニメーション効果
        fabButton.style.transform = 'scale(0.9)';
        setTimeout(() => {
          fabButton.style.transform = '';
        }, 150);
      }
    });

    // プライマリFABの拡張機能
    this.setupFabExpansion(fabContainer);
  }

  /**
   * FAB拡張機能
   */
  setupFabExpansion(container) {
    let isExpanded = false;
    const primaryFab = container.querySelector('.fab-primary');
    const secondaryFabs = container.querySelectorAll('.fab-secondary');

    primaryFab.addEventListener('click', (e) => {
      if (primaryFab.dataset.action === 'newAppointment') {
        // 通常のアクション
        return;
      }
      
      e.stopPropagation();
      isExpanded = !isExpanded;
      
      secondaryFabs.forEach((fab, index) => {
        if (isExpanded) {
          setTimeout(() => {
            fab.style.opacity = '1';
            fab.style.transform = 'scale(1)';
          }, index * 50);
        } else {
          fab.style.opacity = '0';
          fab.style.transform = 'scale(0.8)';
        }
      });
      
      primaryFab.style.transform = isExpanded ? 'rotate(45deg)' : 'rotate(0deg)';
    });

    // 外側クリックで閉じる
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target) && isExpanded) {
        isExpanded = false;
        secondaryFabs.forEach(fab => {
          fab.style.opacity = '0';
          fab.style.transform = 'scale(0.8)';
        });
        primaryFab.style.transform = 'rotate(0deg)';
      }
    });
  }

  /**
   * モバイルヘッダー最適化
   */
  setupMobileHeader() {
    const header = document.querySelector('.header');
    if (!header) return;

    // モバイル専用スタイル適用
    if (window.innerWidth <= 768) {
      header.style.cssText = `
        height: 56px;
        padding: 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: white;
        border-bottom: 1px solid #e5e7eb;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      `;

      const pageTitle = header.querySelector('.page-title, h1');
      if (pageTitle) {
        pageTitle.style.cssText = `
          font-size: 18px;
          font-weight: 600;
          margin: 0;
          flex: 1;
          text-align: left;
          color: #1f2937;
        `;
      }

      // ヘッダーアクションボタンの最適化
      const headerActions = header.querySelector('.header-actions');
      if (headerActions) {
        headerActions.style.cssText = `
          display: flex;
          gap: 8px;
        `;
        
        const actionButtons = headerActions.querySelectorAll('button, .icon-button');
        actionButtons.forEach(btn => {
          btn.style.cssText = `
            width: 40px;
            height: 40px;
            border-radius: 20px;
            background: #f3f4f6;
            border: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            color: #6b7280;
            cursor: pointer;
            transition: all 0.2s ease;
          `;
        });
      }
    }
  }

  /**
   * 既存サイドバーの最適化
   */
  optimizeExistingSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    
    if (sidebar && window.innerWidth <= 768) {
      // サイドバーのモバイル最適化
      sidebar.style.cssText += `
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
      `;

      // モバイルメニュートグルの改善
      if (mobileMenuToggle) {
        mobileMenuToggle.style.cssText = `
          position: fixed;
          top: 16px;
          left: 16px;
          width: 44px;
          height: 44px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          color: #374151;
          cursor: pointer;
          z-index: 101;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        `;
      }
    }
  }

  /**
   * ジェスチャーナビゲーション設定
   */
  setupGestureNavigation() {
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
  }

  /**
   * スワイプで戻る機能
   */
  setupSwipeToGoBack() {
    let startX = 0;
    let startY = 0;
    let isScrolling = false;

    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isScrolling = false;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (isScrolling) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - startX;
      const diffY = Math.abs(currentY - startY);

      // 縦スクロールの場合は無視
      if (diffY > Math.abs(diffX)) {
        isScrolling = true;
        return;
      }

      // 左端からの右スワイプ（戻る）
      if (startX < 50 && diffX > 50 && !isScrolling) {
        this.handleSwipeBack();
      }
    }, { passive: false });
  }

  /**
   * プルツーリフレッシュ設定
   */
  setupPullToRefresh() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let startY = 0;
    let pullDistance = 0;
    let isPulling = false;
    const threshold = 80;

    // プルインジケーター作成
    const indicator = document.createElement('div');
    indicator.className = 'pull-refresh-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      background: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
      z-index: 100;
      font-size: 20px;
      color: #ec4899;
    `;
    indicator.innerHTML = '↓';
    
    mainContent.style.position = 'relative';
    mainContent.insertBefore(indicator, mainContent.firstChild);

    mainContent.addEventListener('touchstart', (e) => {
      if (mainContent.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    mainContent.addEventListener('touchmove', (e) => {
      if (!isPulling) return;

      const currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;

      if (pullDistance > 0) {
        e.preventDefault();
        
        const progress = Math.min(pullDistance / threshold, 1);
        indicator.style.top = `${-60 + (pullDistance * 0.5)}px`;
        indicator.style.transform = `translateX(-50%) rotate(${progress * 180}deg)`;
        
        if (pullDistance > threshold) {
          indicator.innerHTML = '↻';
          indicator.style.animation = 'spin 1s linear infinite';
        } else {
          indicator.innerHTML = '↓';
          indicator.style.animation = 'none';
        }
      }
    }, { passive: false });

    mainContent.addEventListener('touchend', () => {
      if (!isPulling) return;
      
      isPulling = false;
      
      if (pullDistance > threshold) {
        this.triggerRefresh();
      }
      
      // リセット
      setTimeout(() => {
        indicator.style.top = '-60px';
        indicator.style.transform = 'translateX(-50%)';
        indicator.innerHTML = '↓';
        indicator.style.animation = 'none';
        pullDistance = 0;
      }, 300);
    }, { passive: true });
  }

  /**
   * タッチイベント処理
   */
  handleTouchStart(e) {
    this.swipeStartX = e.touches[0].clientX;
    this.swipeStartY = e.touches[0].clientY;
  }

  handleTouchMove(e) {
    if (!this.swipeStartX || !this.swipeStartY) return;

    const diffX = this.swipeStartX - e.touches[0].clientX;
    const diffY = this.swipeStartY - e.touches[0].clientY;

    // 水平スワイプ
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > this.gestureThreshold) {
      const direction = diffX > 0 ? 'left' : 'right';
      this.handleHorizontalSwipe(direction, e.target);
    }
  }

  handleTouchEnd() {
    this.swipeStartX = 0;
    this.swipeStartY = 0;
  }

  /**
   * 水平スワイプ処理
   */
  handleHorizontalSwipe(direction, target) {
    // スワイプ可能なカードの処理
    const swipeableCard = target.closest('.swipeable-card, .appointment-card, .customer-card');
    if (swipeableCard) {
      this.handleCardSwipe(swipeableCard, direction);
      return;
    }

    // ページ切り替えスワイプ
    if (direction === 'left') {
      this.navigateToNextPage();
    } else if (direction === 'right') {
      this.navigateToPreviousPage();
    }
  }

  /**
   * カードスワイプ処理
   */
  handleCardSwipe(card, direction) {
    card.style.transition = 'transform 0.3s ease';
    card.style.transform = `translateX(${direction === 'left' ? '-100px' : '100px'})`;
    
    // アクションの実行
    setTimeout(() => {
      if (direction === 'left') {
        // 削除アクション
        this.handleCardDelete(card);
      } else {
        // 編集アクション
        this.handleCardEdit(card);
      }
      
      // カードをリセット
      card.style.transform = '';
    }, 300);
  }

  /**
   * FABアクション処理
   */
  handleFabAction(action) {
    switch (action) {
      case 'newAppointment':
        this.openNewAppointmentModal();
        break;
      case 'quickCall':
        this.openQuickCallDialog();
        break;
      case 'quickMessage':
        this.openQuickMessageDialog();
        break;
    }
  }

  /**
   * ページナビゲーション
   */
  navigateToPage(page) {
    if (this.currentPage === page) return;
    
    // ボトムナビゲーションの更新
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === page) {
        item.classList.add('active');
        item.style.background = '#fdf2f8';
        item.style.color = '#ec4899';
      } else {
        item.style.background = 'transparent';
        item.style.color = '#6b7280';
      }
    });

    // 実際のページ遷移（既存のナビゲーション機能を使用）
    const navLink = document.querySelector(`[href="/${page}.html"], [href="#${page}"]`);
    if (navLink) {
      navLink.click();
    }

    this.currentPage = page;
    
    // ページタイトルの更新
    this.updatePageTitle(page);
  }

  /**
   * ページタイトル更新
   */
  updatePageTitle(page) {
    const titles = {
      dashboard: 'ダッシュボード',
      appointments: '予約管理',
      customers: '顧客管理',
      messages: 'メッセージ',
      staff: 'スタッフ管理',
      services: 'サービス管理',
      reports: 'レポート',
      settings: '設定'
    };

    const pageTitle = document.querySelector('.page-title, h1');
    if (pageTitle && titles[page]) {
      pageTitle.textContent = titles[page];
    }
  }

  /**
   * リフレッシュ処理
   */
  triggerRefresh() {
    // 現在のページに応じたリフレッシュ処理
    switch (this.currentPage) {
      case 'dashboard':
        if (window.dashboard) window.dashboard.refresh();
        break;
      case 'appointments':
        if (window.appointments) window.appointments.loadAppointments();
        break;
      case 'customers':
        if (window.customers) window.customers.loadCustomers();
        break;
      default:
        window.location.reload();
    }

    // ユーザーフィードバック
    this.showToast('更新しました', 'success');
  }

  /**
   * 表示状態の更新
   */
  updateBottomNavVisibility() {
    const bottomNav = document.querySelector('.mobile-bottom-nav');
    if (bottomNav) {
      bottomNav.style.display = window.innerWidth <= 768 ? 'block' : 'none';
    }
  }

  /**
   * メインコンテンツのパディング調整
   */
  adjustMainContentPadding() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent && window.innerWidth <= 768) {
      mainContent.style.paddingBottom = `${this.bottomNavHeight + this.safeAreaBottom + 16}px`;
    }
  }

  /**
   * トースト表示
   */
  showToast(message, type = 'info') {
    if (window.showToast) {
      window.showToast(message, type, { duration: 2000 });
    } else {
      console.log(`Toast: ${message} (${type})`);
    }
  }

  /**
   * スワイプで戻る処理
   */
  handleSwipeBack() {
    if (window.history.length > 1) {
      window.history.back();
    }
  }

  /**
   * 新規予約モーダル
   */
  openNewAppointmentModal() {
    // 既存の予約作成機能を呼び出し
    const newAppointmentBtn = document.querySelector('[data-bs-target="#appointmentModal"], .btn-new-appointment');
    if (newAppointmentBtn) {
      newAppointmentBtn.click();
    }
  }

  /**
   * リサイズイベント処理
   */
  handleResize() {
    this.updateBottomNavVisibility();
    this.adjustMainContentPadding();
    
    // FABの位置調整
    const fabContainer = document.querySelector('.fab-container');
    if (fabContainer) {
      fabContainer.style.bottom = `${this.bottomNavHeight + this.safeAreaBottom + 16}px`;
    }
  }

  /**
   * 破棄
   */
  destroy() {
    const bottomNav = document.querySelector('.mobile-bottom-nav');
    const fabContainer = document.querySelector('.fab-container');
    
    if (bottomNav) bottomNav.remove();
    if (fabContainer) fabContainer.remove();
    
    this.isInitialized = false;
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  // モバイルデバイスでのみ初期化
  if (window.innerWidth <= 768) {
    window.mobileNavEnhanced = new MobileNavigationEnhanced();
  }
});

// リサイズ時の処理
window.addEventListener('resize', () => {
  if (window.mobileNavEnhanced) {
    window.mobileNavEnhanced.handleResize();
  } else if (window.innerWidth <= 768) {
    window.mobileNavEnhanced = new MobileNavigationEnhanced();
  }
});

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileNavigationEnhanced;
}