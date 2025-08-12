/**
 * Beauty Salon Design System
 * Comprehensive design tokens and component system for SMS
 */

class BeautyDesignSystem {
  constructor() {
    this.tokens = this.getDesignTokens();
    this.components = new Map();
    this.themes = new Map();
    
    this.init();
  }

  /**
   * Initialize design system
   */
  init() {
    this.injectGlobalStyles();
    this.setupThemeSystem();
    this.registerComponents();
  }

  /**
   * Get design tokens
   * @returns {Object} Design tokens
   */
  getDesignTokens() {
    return {
      // Color palette - Elegant beauty salon theme
      colors: {
        // Primary - Rose Gold gradient
        primary: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8', 
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899', // Main brand color
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724'
        },

        // Secondary - Champagne/Gold
        secondary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d', 
          400: '#fbbf24',
          500: '#f59e0b', // Accent gold
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03'
        },

        // Neutral - Warm grays
        neutral: {
          50: '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
          950: '#0c0a09'
        },

        // Semantic colors
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a'
        },
        warning: {
          50: '#fffbeb', 
          500: '#f59e0b',
          600: '#d97706'
        },
        error: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626'
        },
        info: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb'
        }
      },

      // Typography
      typography: {
        fontFamily: {
          sans: ['Inter', 'Noto Sans JP', 'system-ui', 'sans-serif'],
          serif: ['Playfair Display', 'Noto Serif JP', 'Georgia', 'serif'],
          mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace']
        },
        fontSize: {
          xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.05em' }],
          sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.025em' }],
          base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
          lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
          xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }],
          '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.05em' }],
          '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.05em' }],
          '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.075em' }],
          '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.075em' }],
          '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.075em' }]
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
          black: '900'
        }
      },

      // Spacing scale
      spacing: {
        px: '1px',
        0: '0',
        0.5: '0.125rem',
        1: '0.25rem',
        1.5: '0.375rem',
        2: '0.5rem',
        2.5: '0.625rem',
        3: '0.75rem',
        3.5: '0.875rem',
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
        96: '24rem'
      },

      // Border radius
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        default: '0.25rem', 
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px'
      },

      // Shadows - Elegant and soft
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        default: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        // Beauty-specific shadows
        glow: '0 0 20px rgba(236, 72, 153, 0.3)',
        'glow-lg': '0 0 40px rgba(236, 72, 153, 0.2)',
        elegant: '0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)'
      },

      // Transitions
      transitions: {
        fast: 'all 150ms ease',
        normal: 'all 300ms ease',
        slow: 'all 500ms ease',
        bounce: 'all 300ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        elegant: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)'
      },

      // Breakpoints
      breakpoints: {
        xs: '475px',
        sm: '640px', 
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px'
      },

      // Z-index scale
      zIndex: {
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        auto: 'auto',
        // Component-specific
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modal: '1040',
        popover: '1050',
        tooltip: '1060',
        toast: '1070'
      }
    };
  }

  /**
   * Inject global styles
   */
  injectGlobalStyles() {
    const styles = `
      :root {
        /* Color variables */
        --color-primary-50: #fdf2f8;
        --color-primary-500: #ec4899;
        --color-primary-600: #db2777;
        --color-primary-700: #be185d;
        
        --color-secondary-50: #fffbeb;
        --color-secondary-500: #f59e0b;
        --color-secondary-600: #d97706;
        
        --color-neutral-50: #fafaf9;
        --color-neutral-100: #f5f5f4;
        --color-neutral-200: #e7e5e4;
        --color-neutral-500: #78716c;
        --color-neutral-900: #1c1917;
        
        /* Typography */
        --font-sans: 'Inter', 'Noto Sans JP', system-ui, sans-serif;
        --font-serif: 'Playfair Display', 'Noto Serif JP', Georgia, serif;
        
        /* Spacing */
        --spacing-xs: 0.5rem;
        --spacing-sm: 0.75rem;
        --spacing-md: 1rem;
        --spacing-lg: 1.5rem;
        --spacing-xl: 2rem;
        --spacing-2xl: 3rem;
        
        /* Transitions */
        --transition-fast: all 150ms ease;
        --transition-normal: all 300ms ease;
        --transition-elegant: all 400ms cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Global base styles */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      html {
        font-size: 16px;
        line-height: 1.5;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }

      body {
        font-family: var(--font-sans);
        color: var(--color-neutral-900);
        background-color: var(--color-neutral-50);
        transition: var(--transition-normal);
      }

      /* Headings */
      h1, h2, h3, h4, h5, h6 {
        font-family: var(--font-serif);
        font-weight: 600;
        line-height: 1.2;
        color: var(--color-neutral-900);
      }

      /* Focus styles */
      :focus-visible {
        outline: 2px solid var(--color-primary-500);
        outline-offset: 2px;
      }

      /* Smooth scrolling */
      html {
        scroll-behavior: smooth;
      }

      /* Selection styles */
      ::selection {
        background-color: var(--color-primary-500);
        color: white;
      }

      /* Custom scrollbar */
      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: var(--color-neutral-100);
      }

      ::-webkit-scrollbar-thumb {
        background: var(--color-neutral-400);
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: var(--color-neutral-500);
      }

      /* Animation keyframes */
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      @keyframes shimmer {
        0% { background-position: -200px 0; }
        100% { background-position: calc(200px + 100%) 0; }
      }

      @keyframes glow {
        0%, 100% {
          box-shadow: 0 0 20px rgba(236, 72, 153, 0.3);
        }
        50% {
          box-shadow: 0 0 40px rgba(236, 72, 153, 0.5);
        }
      }

      /* Utility animations */
      .animate-fade-in {
        animation: fadeIn 0.5s ease-out;
      }

      .animate-fade-in-up {
        animation: fadeInUp 0.6s ease-out;
      }

      .animate-slide-in-right {
        animation: slideInRight 0.4s ease-out;
      }

      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }

      .animate-glow {
        animation: glow 2s ease-in-out infinite;
      }

      /* Stagger animations */
      .animate-stagger > * {
        opacity: 0;
        animation: fadeInUp 0.6s ease-out forwards;
      }

      .animate-stagger > *:nth-child(1) { animation-delay: 0.1s; }
      .animate-stagger > *:nth-child(2) { animation-delay: 0.2s; }
      .animate-stagger > *:nth-child(3) { animation-delay: 0.3s; }
      .animate-stagger > *:nth-child(4) { animation-delay: 0.4s; }
      .animate-stagger > *:nth-child(5) { animation-delay: 0.5s; }

      /* Loading skeleton */
      .skeleton {
        background: linear-gradient(90deg, 
          var(--color-neutral-200) 0%, 
          var(--color-neutral-100) 50%, 
          var(--color-neutral-200) 100%
        );
        background-size: 200px 100%;
        animation: shimmer 1.5s infinite;
      }

      /* Glass morphism effect */
      .glass {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.18);
      }

      /* Print styles */
      @media print {
        .no-print {
          display: none !important;
        }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* Dark theme support */
      @media (prefers-color-scheme: dark) {
        .auto-dark {
          --color-neutral-50: #1c1917;
          --color-neutral-100: #292524;
          --color-neutral-900: #fafaf9;
          
          background-color: var(--color-neutral-50);
          color: var(--color-neutral-900);
        }
      }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  /**
   * Setup theme system
   */
  setupThemeSystem() {
    // Light theme (default)
    this.themes.set('light', {
      name: 'Light',
      colors: {
        background: '#fafaf9',
        surface: '#ffffff',
        primary: '#ec4899',
        text: '#1c1917'
      }
    });

    // Dark theme
    this.themes.set('dark', {
      name: 'Dark',
      colors: {
        background: '#1c1917',
        surface: '#292524',
        primary: '#f472b6',
        text: '#fafaf9'
      }
    });

    // High contrast theme
    this.themes.set('high-contrast', {
      name: 'High Contrast',
      colors: {
        background: '#000000',
        surface: '#ffffff',
        primary: '#ff0080',
        text: '#000000'
      }
    });
  }

  /**
   * Register component styles
   */
  registerComponents() {
    // Button component
    this.components.set('button', {
      base: 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
      variants: {
        primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-md hover:shadow-lg focus:ring-primary-500',
        secondary: 'bg-white hover:bg-neutral-50 text-neutral-900 border border-neutral-300 focus:ring-neutral-500',
        accent: 'bg-secondary-500 hover:bg-secondary-600 text-white shadow-md hover:shadow-lg focus:ring-secondary-500',
        ghost: 'bg-transparent hover:bg-neutral-100 text-neutral-700 focus:ring-neutral-500',
        danger: 'bg-red-500 hover:bg-red-600 text-white shadow-md hover:shadow-lg focus:ring-red-500'
      },
      sizes: {
        sm: 'px-3 py-2 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        xl: 'px-8 py-4 text-lg'
      }
    });

    // Card component
    this.components.set('card', {
      base: 'bg-white border border-neutral-200 rounded-xl transition-all duration-300',
      variants: {
        default: 'shadow-sm hover:shadow-md',
        elevated: 'shadow-lg hover:shadow-xl',
        featured: 'bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200 shadow-md hover:shadow-lg',
        minimal: 'border-0 shadow-none',
        glass: 'glass'
      },
      sizes: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      }
    });

    // Input component
    this.components.set('input', {
      base: 'w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1',
      variants: {
        default: 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
        error: 'border-red-300 focus:border-red-500 focus:ring-red-500',
        success: 'border-green-300 focus:border-green-500 focus:ring-green-500'
      },
      sizes: {
        sm: 'px-2 py-1 text-sm',
        md: 'px-3 py-2 text-sm',
        lg: 'px-4 py-3 text-base'
      }
    });

    // Badge component
    this.components.set('badge', {
      base: 'inline-flex items-center font-medium rounded-full',
      variants: {
        primary: 'bg-primary-100 text-primary-800',
        secondary: 'bg-secondary-100 text-secondary-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        neutral: 'bg-neutral-100 text-neutral-800'
      },
      sizes: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm'
      }
    });
  }

  /**
   * Get component classes
   * @param {string} component - Component name
   * @param {Object} options - Component options
   * @returns {string} CSS classes
   */
  getComponentClasses(component, options = {}) {
    const comp = this.components.get(component);
    if (!comp) return '';

    const { variant = 'default', size = 'md', className = '' } = options;
    
    const classes = [
      comp.base,
      comp.variants[variant] || comp.variants.default,
      comp.sizes[size] || comp.sizes.md,
      className
    ].filter(Boolean);

    return classes.join(' ');
  }

  /**
   * Apply theme
   * @param {string} themeName - Theme name
   */
  applyTheme(themeName) {
    const theme = this.themes.get(themeName);
    if (!theme) return;

    const root = document.documentElement;
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
  }

  /**
   * Get current theme
   * @returns {string} Current theme name
   */
  getCurrentTheme() {
    return localStorage.getItem('theme') || 'light';
  }

  /**
   * Toggle between light and dark theme
   */
  toggleTheme() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
  }

  /**
   * Get design token value
   * @param {string} path - Token path (e.g., 'colors.primary.500')
   * @returns {any} Token value
   */
  getToken(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this.tokens);
  }

  /**
   * Generate CSS custom properties
   * @returns {string} CSS custom properties
   */
  generateCSSProperties() {
    const flattenObject = (obj, prefix = '') => {
      const result = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const newPrefix = prefix ? `${prefix}-${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          Object.assign(result, flattenObject(value, newPrefix));
        } else {
          result[`--${newPrefix}`] = value;
        }
      }
      
      return result;
    };

    const properties = flattenObject(this.tokens);
    
    return Object.entries(properties)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join('\n');
  }
}

// Create global design system instance
window.designSystem = new BeautyDesignSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeautyDesignSystem;
}