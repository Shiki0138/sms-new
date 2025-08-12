/**
 * Mobile Optimization for SMS Salon Management System
 * Touch-friendly interfaces and Progressive Web App features
 */

class MobileOptimizer {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.isTouch = false;
    this.serviceWorker = null;
    
    this.init();
  }

  /**
   * Initialize mobile optimization
   */
  init() {
    this.detectTouch();
    this.setupViewport();
    this.optimizeForTouch();
    this.setupGestures();
    this.setupPWA();
    this.optimizeScrolling();
    this.setupKeyboardHandling();
  }

  /**
   * Detect touch capabilities
   */
  detectTouch() {
    this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (this.isTouch) {
      document.body.classList.add('touch-device');
    } else {
      document.body.classList.add('no-touch');
    }
  }

  /**
   * Setup responsive viewport
   */
  setupViewport() {
    // Dynamic viewport height for mobile browsers
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
      setTimeout(setViewportHeight, 100);
    });
  }

  /**
   * Optimize interface for touch
   */
  optimizeForTouch() {
    const touchStyles = `
      .touch-device {
        /* Larger touch targets */
        --touch-target-min: 44px;
        --touch-spacing: 12px;
      }

      .touch-device button,
      .touch-device .btn,
      .touch-device a[role="button"],
      .touch-device input[type="button"],
      .touch-device input[type="submit"] {
        min-height: var(--touch-target-min);
        min-width: var(--touch-target-min);
        padding: var(--touch-spacing);
        touch-action: manipulation;
      }

      .touch-device input,
      .touch-device textarea,
      .touch-device select {
        min-height: var(--touch-target-min);
        font-size: 16px; /* Prevent zoom on iOS */
      }

      /* Touch feedback */
      .touch-device .btn:active,
      .touch-device button:active {
        transform: scale(0.98);
        transition: transform 0.1s ease;
      }

      /* Improved tap targets */
      .touch-device .nav-link {
        padding: 16px;
        margin: 4px 0;
      }

      .touch-device .table td,
      .touch-device .table th {
        padding: 16px 8px;
      }

      /* Swipe indicators */
      .swipeable {
        position: relative;
      }

      .swipeable::after {
        content: '';
        position: absolute;
        right: 16px;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 20px;
        background: linear-gradient(to bottom, transparent, #ddd, transparent);
        border-radius: 2px;
        opacity: 0.5;
      }

      /* Pull-to-refresh indicator */
      .pull-to-refresh {
        position: relative;
        overflow: hidden;
      }

      .pull-to-refresh-indicator {
        position: absolute;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 40px;
        background: white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 1000;
      }

      .pull-to-refresh-indicator.active {
        top: 20px;
      }

      /* Mobile navigation */
      .mobile-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-top: 1px solid #e5e7eb;
        padding: 8px 0;
        z-index: 1000;
      }

      .mobile-nav-items {
        display: flex;
        justify-content: space-around;
        align-items: center;
      }

      .mobile-nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 12px;
        color: #6b7280;
        text-decoration: none;
        font-size: 12px;
        font-weight: 500;
        transition: color 0.2s ease;
        min-width: 44px;
      }

      .mobile-nav-item.active {
        color: #ec4899;
      }

      .mobile-nav-item i {
        font-size: 20px;
        margin-bottom: 4px;
      }

      /* Responsive breakpoints */
      @media (max-width: 640px) {
        .desktop-only { display: none !important; }
        .mobile-hidden { display: none !important; }
        
        .container {
          padding-left: 16px;
          padding-right: 16px;
        }

        .modal-content {
          margin: 0;
          border-radius: 0;
          height: 100vh;
          max-height: 100vh;
        }

        .card {
          border-radius: 8px;
          margin-bottom: 16px;
        }

        /* Stack form inputs */
        .form-row {
          flex-direction: column;
        }

        .form-row > * {
          width: 100%;
          margin-bottom: 16px;
        }

        /* Larger text on small screens */
        body {
          font-size: 14px;
          line-height: 1.5;
        }

        h1 { font-size: 24px; }
        h2 { font-size: 20px; }
        h3 { font-size: 18px; }
      }

      @media (max-width: 480px) {
        .container {
          padding-left: 12px;
          padding-right: 12px;
        }

        .btn {
          width: 100%;
          margin-bottom: 8px;
        }

        .btn-group {
          flex-direction: column;
        }

        .btn-group .btn {
          border-radius: 6px !important;
          border: 1px solid #d1d5db !important;
        }
      }

      /* Landscape orientation adjustments */
      @media (orientation: landscape) and (max-height: 600px) {
        .mobile-nav {
          display: none;
        }

        .main-content {
          padding-bottom: 0;
        }

        .modal-content {
          max-height: 90vh;
          overflow-y: auto;
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = touchStyles;
    document.head.appendChild(styleSheet);
  }

  /**
   * Setup gesture handling
   */
  setupGestures() {
    // Swipe gestures
    document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

    // Pull-to-refresh
    this.setupPullToRefresh();
  }

  /**
   * Handle touch start
   * @param {TouchEvent} event - Touch start event
   */
  handleTouchStart(event) {
    const touch = event.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
  }

  /**
   * Handle touch move
   * @param {TouchEvent} event - Touch move event
   */
  handleTouchMove(event) {
    if (!this.touchStartX || !this.touchStartY) return;

    const touch = event.touches[0];
    const diffX = this.touchStartX - touch.clientX;
    const diffY = this.touchStartY - touch.clientY;

    // Check for swipe gestures
    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) > 30) {
        const direction = diffX > 0 ? 'left' : 'right';
        this.handleSwipe(direction, event.target);
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > 30) {
        const direction = diffY > 0 ? 'up' : 'down';
        this.handleSwipe(direction, event.target);
      }
    }
  }

  /**
   * Handle touch end
   * @param {TouchEvent} event - Touch end event
   */
  handleTouchEnd(event) {
    this.touchStartX = 0;
    this.touchStartY = 0;
  }

  /**
   * Handle swipe gestures
   * @param {string} direction - Swipe direction
   * @param {Element} target - Target element
   */
  handleSwipe(direction, target) {
    // Handle swipeable cards
    const swipeableCard = target.closest('.swipeable');
    if (swipeableCard) {
      this.handleCardSwipe(swipeableCard, direction);
      return;
    }

    // Handle navigation swipes
    if (direction === 'right' && window.innerWidth < 768) {
      // Show sidebar/menu
      this.showMobileSidebar();
    } else if (direction === 'left' && window.innerWidth < 768) {
      // Hide sidebar/menu
      this.hideMobileSidebar();
    }
  }

  /**
   * Handle card swipe actions
   * @param {Element} card - Card element
   * @param {string} direction - Swipe direction
   */
  handleCardSwipe(card, direction) {
    const actions = card.dataset.swipeActions;
    if (!actions) return;

    try {
      const actionMap = JSON.parse(actions);
      const action = actionMap[direction];
      
      if (action) {
        // Animate card
        card.style.transform = `translateX(${direction === 'left' ? '-100%' : '100%'})`;
        card.style.opacity = '0';
        
        setTimeout(() => {
          if (typeof window[action.callback] === 'function') {
            window[action.callback](card.dataset.id);
          }
          
          // Remove or reset card
          if (action.remove) {
            card.remove();
          } else {
            card.style.transform = '';
            card.style.opacity = '';
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error handling swipe action:', error);
    }
  }

  /**
   * Setup pull-to-refresh functionality
   */
  setupPullToRefresh() {
    let startY = 0;
    let pullDistance = 0;
    let isPulling = false;
    const threshold = 80;

    const refreshContainer = document.querySelector('.pull-to-refresh');
    if (!refreshContainer) return;

    // Create refresh indicator
    const indicator = document.createElement('div');
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = '<i class="fas fa-arrow-down"></i>';
    refreshContainer.appendChild(indicator);

    refreshContainer.addEventListener('touchstart', (e) => {
      if (refreshContainer.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    refreshContainer.addEventListener('touchmove', (e) => {
      if (!isPulling) return;

      const currentY = e.touches[0].clientY;
      pullDistance = currentY - startY;

      if (pullDistance > 0) {
        e.preventDefault();
        
        // Update indicator position
        const progress = Math.min(pullDistance / threshold, 1);
        indicator.style.top = `${-60 + (pullDistance * 0.5)}px`;
        indicator.style.transform = `translateX(-50%) rotate(${progress * 180}deg)`;
        
        if (pullDistance > threshold) {
          indicator.classList.add('active');
          indicator.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
        } else {
          indicator.classList.remove('active');
          indicator.innerHTML = '<i class="fas fa-arrow-down"></i>';
        }
      }
    }, { passive: false });

    refreshContainer.addEventListener('touchend', () => {
      if (!isPulling) return;
      
      isPulling = false;
      
      if (pullDistance > threshold) {
        // Trigger refresh
        this.triggerRefresh();
      }
      
      // Reset indicator
      indicator.style.top = '';
      indicator.style.transform = '';
      indicator.classList.remove('active');
      indicator.innerHTML = '<i class="fas fa-arrow-down"></i>';
      pullDistance = 0;
    }, { passive: true });
  }

  /**
   * Trigger content refresh
   */
  triggerRefresh() {
    if (window.app && window.app.currentPage) {
      // Trigger page refresh based on current page
      switch (window.app.currentPage) {
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
    }

    if (window.showToast) {
      window.showToast('Refreshed', 'success', { duration: 1500 });
    }
  }

  /**
   * Setup Progressive Web App features
   */
  setupPWA() {
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.handleOfflineStatus();
    this.setupNotifications();
  }

  /**
   * Register Service Worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.serviceWorker = registration;
        
        console.log('ServiceWorker registered:', registration);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdatePrompt();
            }
          });
        });

      } catch (error) {
        console.log('ServiceWorker registration failed:', error);
      }
    }
  }

  /**
   * Setup install prompt for PWA
   */
  setupInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      this.showInstallButton();
    });

    // Handle install button click
    document.addEventListener('click', async (e) => {
      if (e.target.matches('[data-install-pwa]')) {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          
          if (outcome === 'accepted') {
            this.hideInstallButton();
          }
          
          deferredPrompt = null;
        }
      }
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.hideInstallButton();
      
      if (window.showToast) {
        window.showToast('App installed successfully!', 'success');
      }
    });
  }

  /**
   * Show PWA install button
   */
  showInstallButton() {
    // Check if install button already exists
    if (document.querySelector('[data-install-pwa]')) return;

    const installButton = document.createElement('button');
    installButton.innerHTML = '<i class="fas fa-download mr-2"></i>Install App';
    installButton.className = 'btn btn-primary btn-sm fixed bottom-20 right-4 z-50 shadow-lg';
    installButton.setAttribute('data-install-pwa', '');
    
    document.body.appendChild(installButton);
  }

  /**
   * Hide PWA install button
   */
  hideInstallButton() {
    const installButton = document.querySelector('[data-install-pwa]');
    if (installButton) {
      installButton.remove();
    }
  }

  /**
   * Show service worker update prompt
   */
  showUpdatePrompt() {
    if (window.showToast) {
      window.showToast(
        'New version available! Refresh to update.',
        'info',
        {
          duration: 0,
          action: {
            text: 'Refresh',
            onClick: () => window.location.reload()
          }
        }
      );
    }
  }

  /**
   * Handle offline/online status
   */
  handleOfflineStatus() {
    const updateStatus = () => {
      const isOnline = navigator.onLine;
      document.body.classList.toggle('offline', !isOnline);
      
      if (!isOnline) {
        this.showOfflineIndicator();
      } else {
        this.hideOfflineIndicator();
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    
    // Initial check
    updateStatus();
  }

  /**
   * Show offline indicator
   */
  showOfflineIndicator() {
    let indicator = document.querySelector('.offline-indicator');
    
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'offline-indicator fixed top-0 left-0 right-0 bg-red-500 text-white text-center py-2 text-sm font-medium z-50';
      indicator.innerHTML = '<i class="fas fa-wifi-slash mr-2"></i>You are offline';
      document.body.appendChild(indicator);
    }
  }

  /**
   * Hide offline indicator
   */
  hideOfflineIndicator() {
    const indicator = document.querySelector('.offline-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Setup push notifications
   */
  async setupNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      // Request notification permission
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      }

      // Setup push messaging
      if (Notification.permission === 'granted' && this.serviceWorker) {
        this.subscribeToPush();
      }
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPush() {
    try {
      const subscription = await this.serviceWorker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(process.env.VAPID_PUBLIC_KEY || '')
      });

      // Send subscription to server
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });

      console.log('Push subscription successful');
    } catch (error) {
      console.error('Push subscription failed:', error);
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   * @param {string} base64String - Base64 VAPID key
   * @returns {Uint8Array} Converted key
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Optimize scrolling performance
   */
  optimizeScrolling() {
    // Passive scroll listeners
    document.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    
    // Intersection Observer for lazy loading
    if ('IntersectionObserver' in window) {
      this.setupLazyLoading();
    }

    // Virtual scrolling for large lists
    this.setupVirtualScrolling();
  }

  /**
   * Handle scroll events
   * @param {Event} event - Scroll event
   */
  handleScroll(event) {
    const scrollY = window.scrollY;
    
    // Show/hide mobile navigation on scroll
    const mobileNav = document.querySelector('.mobile-nav');
    if (mobileNav) {
      const threshold = 100;
      if (scrollY > threshold && !mobileNav.classList.contains('hidden')) {
        mobileNav.style.transform = 'translateY(100%)';
      } else if (scrollY <= threshold && mobileNav.style.transform) {
        mobileNav.style.transform = '';
      }
    }

    // Floating action button behavior
    const fab = document.querySelector('.floating-action-button');
    if (fab) {
      if (scrollY > 200) {
        fab.classList.add('show');
      } else {
        fab.classList.remove('show');
      }
    }
  }

  /**
   * Setup lazy loading for images
   */
  setupLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            observer.unobserve(img);
          }
        }
      });
    });

    // Observe all lazy images
    document.querySelectorAll('img[data-src]').forEach(img => {
      img.classList.add('lazy');
      imageObserver.observe(img);
    });
  }

  /**
   * Setup virtual scrolling for performance
   */
  setupVirtualScrolling() {
    const virtualLists = document.querySelectorAll('[data-virtual-scroll]');
    
    virtualLists.forEach(list => {
      this.initVirtualScroll(list);
    });
  }

  /**
   * Initialize virtual scroll for a list
   * @param {Element} container - List container
   */
  initVirtualScroll(container) {
    const itemHeight = parseInt(container.dataset.itemHeight) || 60;
    const visibleItems = Math.ceil(container.clientHeight / itemHeight) + 2;
    
    let startIndex = 0;
    let endIndex = visibleItems;

    const updateVisibleItems = () => {
      const scrollTop = container.scrollTop;
      startIndex = Math.floor(scrollTop / itemHeight);
      endIndex = Math.min(startIndex + visibleItems, container.children.length);

      // Hide items outside visible range
      Array.from(container.children).forEach((item, index) => {
        if (index < startIndex || index > endIndex) {
          item.style.display = 'none';
        } else {
          item.style.display = '';
        }
      });
    };

    container.addEventListener('scroll', updateVisibleItems, { passive: true });
    updateVisibleItems(); // Initial setup
  }

  /**
   * Setup mobile keyboard handling
   */
  setupKeyboardHandling() {
    let initialViewportHeight = window.innerHeight;

    // Handle virtual keyboard appearance
    window.addEventListener('resize', () => {
      const currentHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      if (heightDifference > 150) {
        // Virtual keyboard is likely open
        document.body.classList.add('keyboard-open');
        
        // Scroll active input into view
        const activeInput = document.activeElement;
        if (activeInput && activeInput.tagName === 'INPUT') {
          setTimeout(() => {
            activeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 300);
        }
      } else {
        // Virtual keyboard is likely closed
        document.body.classList.remove('keyboard-open');
      }
    });

    // Prevent zoom on input focus (iOS)
    document.addEventListener('touchstart', () => {
      if (document.activeElement.tagName === 'INPUT') {
        document.activeElement.blur();
      }
    });
  }

  /**
   * Show mobile sidebar
   */
  showMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.createElement('div');
    
    overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40';
    overlay.onclick = () => this.hideMobileSidebar();
    
    document.body.appendChild(overlay);
    
    if (sidebar) {
      sidebar.classList.add('mobile-sidebar-open');
      sidebar.style.transform = 'translateX(0)';
    }
  }

  /**
   * Hide mobile sidebar
   */
  hideMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.fixed.inset-0.bg-black');
    
    if (overlay) {
      overlay.remove();
    }
    
    if (sidebar) {
      sidebar.classList.remove('mobile-sidebar-open');
      sidebar.style.transform = '';
    }
  }

  /**
   * Create mobile navigation
   */
  createMobileNavigation() {
    const mobileNav = document.createElement('nav');
    mobileNav.className = 'mobile-nav';
    
    const navItems = [
      { icon: 'fas fa-chart-line', label: 'Dashboard', page: 'dashboard' },
      { icon: 'fas fa-calendar-alt', label: 'Appointments', page: 'appointments' },
      { icon: 'fas fa-users', label: 'Customers', page: 'customers' },
      { icon: 'fas fa-spa', label: 'Services', page: 'services' },
      { icon: 'fas fa-user-tie', label: 'Staff', page: 'staff' }
    ];

    const navHTML = `
      <div class="mobile-nav-items">
        ${navItems.map(item => `
          <a href="#" class="mobile-nav-item" data-page="${item.page}">
            <i class="${item.icon}"></i>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </div>
    `;

    mobileNav.innerHTML = navHTML;
    document.body.appendChild(mobileNav);

    // Update active state
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.mobile-nav-item');
      if (navItem) {
        e.preventDefault();
        
        // Update active state
        document.querySelectorAll('.mobile-nav-item').forEach(item => {
          item.classList.remove('active');
        });
        navItem.classList.add('active');
        
        // Navigate to page
        const page = navItem.dataset.page;
        if (window.app) {
          window.app.navigateToPage(page);
        }
      }
    });
  }

  /**
   * Get device information
   * @returns {Object} Device info
   */
  getDeviceInfo() {
    return {
      isTouch: this.isTouch,
      isMobile: window.innerWidth < 768,
      isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
      isDesktop: window.innerWidth >= 1024,
      orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
      pixelRatio: window.devicePixelRatio || 1,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      online: navigator.onLine
    };
  }
}

// Initialize mobile optimization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.mobileOptimizer = new MobileOptimizer();
  
  // Create mobile navigation if on mobile device
  if (window.innerWidth < 768) {
    window.mobileOptimizer.createMobileNavigation();
  }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MobileOptimizer;
}