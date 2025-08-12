/**
 * SPA Router Implementation for SMS Salon Management System
 * Modern routing with History API and deep linking support
 */

class SPARouter {
  constructor() {
    this.routes = new Map();
    this.middleware = [];
    this.currentRoute = null;
    this.params = {};
    this.query = {};
    
    this.init();
  }

  /**
   * Initialize router
   */
  init() {
    this.setupEventListeners();
    this.handleInitialRoute();
  }

  /**
   * Setup event listeners for navigation
   */
  setupEventListeners() {
    // Handle back/forward button
    window.addEventListener('popstate', this.handlePopState.bind(this));
    
    // Handle link clicks
    document.addEventListener('click', this.handleLinkClick.bind(this));
    
    // Handle form submissions
    document.addEventListener('submit', this.handleFormSubmit.bind(this));
  }

  /**
   * Define a route
   * @param {string} path - Route path with optional parameters
   * @param {Object} config - Route configuration
   */
  route(path, config) {
    const routePattern = this.pathToRegExp(path);
    
    this.routes.set(path, {
      pattern: routePattern,
      component: config.component,
      controller: config.controller,
      middleware: config.middleware || [],
      meta: config.meta || {},
      guard: config.guard,
      title: config.title,
      requireAuth: config.requireAuth || false,
      roles: config.roles || []
    });
    
    return this;
  }

  /**
   * Convert path to regular expression
   * @param {string} path - Route path
   * @returns {Object} Pattern object with regex and keys
   */
  pathToRegExp(path) {
    const keys = [];
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:\w+/g, (match) => {
        keys.push(match.slice(1));
        return '([^/]+)';
      })
      .replace(/\*/g, '(.*)');
    
    return {
      regex: new RegExp(`^${pattern}$`),
      keys
    };
  }

  /**
   * Add middleware
   * @param {Function} fn - Middleware function
   */
  use(fn) {
    this.middleware.push(fn);
    return this;
  }

  /**
   * Navigate to a route
   * @param {string} path - Target path
   * @param {boolean} replace - Replace current history entry
   */
  navigate(path, replace = false) {
    const url = this.buildUrl(path);
    
    if (replace) {
      history.replaceState(null, '', url);
    } else {
      history.pushState(null, '', url);
    }
    
    this.handleRoute(url);
  }

  /**
   * Build full URL from path
   * @param {string} path - Route path
   * @returns {string} Full URL
   */
  buildUrl(path) {
    if (path.startsWith('http')) {
      return path;
    }
    
    const base = window.location.origin;
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }

  /**
   * Handle route changes
   * @param {string} url - Current URL
   */
  async handleRoute(url) {
    const path = new URL(url).pathname;
    const route = this.findRoute(path);
    
    if (!route) {
      return this.handleNotFound(path);
    }

    try {
      // Execute middleware
      await this.runMiddleware(route, path);
      
      // Check authentication
      if (route.config.requireAuth && !this.isAuthenticated()) {
        return this.navigate('/login');
      }
      
      // Check roles
      if (route.config.roles.length && !this.hasRole(route.config.roles)) {
        return this.handleUnauthorized();
      }
      
      // Execute route guard
      if (route.config.guard && !(await route.config.guard(route, path))) {
        return;
      }
      
      // Set page title
      if (route.config.title) {
        document.title = typeof route.config.title === 'function' 
          ? route.config.title(route.params)
          : route.config.title;
      }
      
      // Execute route
      await this.executeRoute(route, path);
      
    } catch (error) {
      console.error('Route handling error:', error);
      this.handleError(error);
    }
  }

  /**
   * Find matching route
   * @param {string} path - Current path
   * @returns {Object|null} Matched route
   */
  findRoute(path) {
    for (const [routePath, config] of this.routes) {
      const match = path.match(config.pattern.regex);
      
      if (match) {
        const params = {};
        const query = this.parseQuery(window.location.search);
        
        // Extract path parameters
        config.pattern.keys.forEach((key, index) => {
          params[key] = match[index + 1];
        });
        
        return {
          path: routePath,
          config,
          params,
          query,
          match
        };
      }
    }
    
    return null;
  }

  /**
   * Execute route middleware
   * @param {Object} route - Route object
   * @param {string} path - Current path
   */
  async runMiddleware(route, path) {
    const allMiddleware = [...this.middleware, ...route.config.middleware];
    
    for (const middleware of allMiddleware) {
      await middleware(route, path);
    }
  }

  /**
   * Execute route handler
   * @param {Object} route - Route object
   * @param {string} path - Current path
   */
  async executeRoute(route, path) {
    this.currentRoute = route;
    this.params = route.params;
    this.query = route.query;
    
    // Hide all pages
    this.hideAllPages();
    
    // Execute controller if provided
    if (route.config.controller) {
      await route.config.controller(route);
    }
    
    // Show component
    if (route.config.component) {
      this.showComponent(route.config.component, route);
    }
    
    // Emit route change event
    this.emit('routeChange', { route, path });
  }

  /**
   * Hide all page components
   */
  hideAllPages() {
    const pages = document.querySelectorAll('[data-page]');
    pages.forEach(page => {
      page.classList.add('hidden');
    });
  }

  /**
   * Show specific component
   * @param {string} componentName - Component name
   * @param {Object} route - Route object
   */
  showComponent(componentName, route) {
    const component = document.querySelector(`[data-page="${componentName}"]`);
    
    if (component) {
      component.classList.remove('hidden');
      
      // Trigger component lifecycle
      if (component.onRouteEnter) {
        component.onRouteEnter(route);
      }
      
      // Update navigation state
      this.updateNavigation(componentName);
    }
  }

  /**
   * Update navigation active state
   * @param {string} activePage - Active page name
   */
  updateNavigation(activePage) {
    const navLinks = document.querySelectorAll('[data-route]');
    
    navLinks.forEach(link => {
      const route = link.dataset.route;
      
      if (route === activePage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  /**
   * Handle link clicks
   * @param {Event} event - Click event
   */
  handleLinkClick(event) {
    const link = event.target.closest('a[data-route]');
    
    if (!link || link.hasAttribute('data-external')) {
      return;
    }
    
    event.preventDefault();
    
    const route = link.dataset.route;
    const path = link.getAttribute('href') || `/${route}`;
    
    this.navigate(path);
  }

  /**
   * Handle form submissions with routing
   * @param {Event} event - Submit event
   */
  handleFormSubmit(event) {
    const form = event.target;
    const action = form.dataset.route;
    
    if (!action) return;
    
    event.preventDefault();
    
    // Handle form data and routing
    const formData = new FormData(form);
    const params = new URLSearchParams(formData);
    
    this.navigate(`${action}?${params.toString()}`);
  }

  /**
   * Handle browser back/forward
   * @param {Event} event - PopState event
   */
  handlePopState(event) {
    this.handleRoute(window.location.href);
  }

  /**
   * Handle initial route on page load
   */
  handleInitialRoute() {
    this.handleRoute(window.location.href);
  }

  /**
   * Parse query parameters
   * @param {string} search - Search string
   * @returns {Object} Query parameters
   */
  parseQuery(search) {
    const params = new URLSearchParams(search);
    const query = {};
    
    for (const [key, value] of params) {
      query[key] = value;
    }
    
    return query;
  }

  /**
   * Build query string from object
   * @param {Object} params - Parameters object
   * @returns {string} Query string
   */
  buildQuery(params) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.set(key, value);
      }
    });
    
    return searchParams.toString();
  }

  /**
   * Get current route information
   * @returns {Object} Current route info
   */
  getCurrentRoute() {
    return {
      route: this.currentRoute,
      params: this.params,
      query: this.query,
      path: window.location.pathname
    };
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    return window.auth && window.auth.isAuthenticated();
  }

  /**
   * Check if user has required role
   * @param {Array} roles - Required roles
   * @returns {boolean} Role authorization
   */
  hasRole(roles) {
    return window.auth && window.auth.hasRole(roles);
  }

  /**
   * Handle 404 errors
   * @param {string} path - Not found path
   */
  handleNotFound(path) {
    console.warn(`Route not found: ${path}`);
    
    // Show 404 page or redirect to dashboard
    const notFoundPage = document.querySelector('[data-page="notFound"]');
    
    if (notFoundPage) {
      this.hideAllPages();
      notFoundPage.classList.remove('hidden');
    } else {
      this.navigate('/dashboard', true);
    }
  }

  /**
   * Handle unauthorized access
   */
  handleUnauthorized() {
    console.warn('Unauthorized access attempt');
    
    if (window.showToast) {
      window.showToast('You do not have permission to access this page.', 'error');
    }
    
    this.navigate('/dashboard', true);
  }

  /**
   * Handle routing errors
   * @param {Error} error - Routing error
   */
  handleError(error) {
    console.error('Router error:', error);
    
    if (window.showToast) {
      window.showToast('Navigation error occurred.', 'error');
    }
  }

  /**
   * Emit custom events
   * @param {string} eventName - Event name
   * @param {Object} detail - Event detail
   */
  emit(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * Destroy router instance
   */
  destroy() {
    window.removeEventListener('popstate', this.handlePopState.bind(this));
    document.removeEventListener('click', this.handleLinkClick.bind(this));
    document.removeEventListener('submit', this.handleFormSubmit.bind(this));
  }
}

// Route definitions for SMS Salon Management System
const setupRoutes = (router) => {
  // Authentication routes
  router.route('/login', {
    component: 'login',
    title: 'Login - SMS',
    requireAuth: false
  });

  router.route('/logout', {
    controller: async () => {
      if (window.auth) {
        await window.auth.handleLogout();
      }
      router.navigate('/login', true);
    },
    requireAuth: true
  });

  // Dashboard
  router.route('/', {
    controller: () => router.navigate('/dashboard', true)
  });

  router.route('/dashboard', {
    component: 'dashboard',
    controller: (route) => {
      if (window.dashboard) {
        window.dashboard.loadDashboardData();
      }
    },
    title: 'Dashboard - SMS',
    requireAuth: true
  });

  // Appointments
  router.route('/appointments', {
    component: 'appointments',
    controller: (route) => {
      if (window.appointments) {
        window.appointments.loadAppointments();
      }
    },
    title: 'Appointments - SMS',
    requireAuth: true
  });

  router.route('/appointments/:id', {
    component: 'appointment-detail',
    controller: (route) => {
      const appointmentId = route.params.id;
      // Load specific appointment
      if (window.appointments) {
        window.appointments.loadAppointment(appointmentId);
      }
    },
    title: (params) => `Appointment #${params.id} - SMS`,
    requireAuth: true
  });

  // Customers
  router.route('/customers', {
    component: 'customers',
    controller: (route) => {
      if (window.customers) {
        window.customers.loadCustomers();
      }
    },
    title: 'Customers - SMS',
    requireAuth: true
  });

  router.route('/customers/:id', {
    component: 'customer-detail',
    controller: (route) => {
      const customerId = route.params.id;
      // Load specific customer
      if (window.customers) {
        window.customers.loadCustomer(customerId);
      }
    },
    title: (params) => `Customer Details - SMS`,
    requireAuth: true
  });

  // Services
  router.route('/services', {
    component: 'services',
    controller: (route) => {
      if (window.app) {
        window.app.loadServices();
      }
    },
    title: 'Services - SMS',
    requireAuth: true
  });

  // Staff
  router.route('/staff', {
    component: 'staff',
    controller: (route) => {
      if (window.app) {
        window.app.loadStaff();
      }
    },
    title: 'Staff - SMS',
    requireAuth: true,
    roles: ['admin'] // Only admin can view staff
  });

  // Settings (admin only)
  router.route('/settings', {
    component: 'settings',
    title: 'Settings - SMS',
    requireAuth: true,
    roles: ['admin']
  });

  // Reports (staff and admin)
  router.route('/reports', {
    component: 'reports',
    title: 'Reports - SMS',
    requireAuth: true,
    roles: ['staff', 'admin']
  });
};

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Create global router instance
  window.router = new SPARouter();
  
  // Setup authentication middleware
  window.router.use(async (route, path) => {
    // Skip auth check for login page
    if (path === '/login') return;
    
    // Verify authentication status
    if (route.config.requireAuth && window.auth && !window.auth.isAuthenticated()) {
      throw new Error('Authentication required');
    }
  });

  // Setup routes
  setupRoutes(window.router);
  
  // Global navigation helper
  window.navigate = (path, replace = false) => {
    window.router.navigate(path, replace);
  };
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SPARouter;
}