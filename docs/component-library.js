/**
 * Beauty Salon Component Library
 * Reusable UI components for SMS Salon Management System
 */

class BeautyComponentLibrary {
  constructor(designSystem) {
    this.designSystem = designSystem || window.designSystem;
    this.components = new Map();
    this.instances = new Map();
    
    this.init();
  }

  /**
   * Initialize component library
   */
  init() {
    this.registerComponents();
    this.setupEventDelegation();
  }

  /**
   * Register all components
   */
  registerComponents() {
    this.registerButton();
    this.registerCard();
    this.registerModal();
    this.registerInput();
    this.registerBadge();
    this.registerDropdown();
    this.registerToast();
    this.registerDatePicker();
    this.registerTable();
    this.registerTabs();
    this.registerAccordion();
    this.registerSlider();
    this.registerToggle();
    this.registerAvatar();
    this.registerProgressBar();
  }

  /**
   * Setup event delegation for component interactions
   */
  setupEventDelegation() {
    document.addEventListener('click', this.handleGlobalClick.bind(this));
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
    document.addEventListener('input', this.handleGlobalInput.bind(this));
  }

  /**
   * Button Component
   */
  registerButton() {
    this.components.set('button', {
      create: (options = {}) => {
        const {
          text = '',
          variant = 'primary',
          size = 'md',
          icon = null,
          iconPosition = 'left',
          onClick = null,
          disabled = false,
          loading = false,
          fullWidth = false,
          id = null,
          className = '',
          type = 'button'
        } = options;

        const classes = this.designSystem.getComponentClasses('button', {
          variant,
          size,
          className: `${fullWidth ? 'w-full' : ''} ${className}`
        });

        const iconHtml = icon ? `<i class="${icon} ${text && iconPosition === 'left' ? 'mr-2' : text && iconPosition === 'right' ? 'ml-2' : ''}"></i>` : '';
        const loadingHtml = loading ? '<i class="fas fa-spinner fa-spin mr-2"></i>' : '';

        return `
          <button
            type="${type}"
            ${id ? `id="${id}"` : ''}
            class="${classes}"
            ${disabled || loading ? 'disabled' : ''}
            ${onClick ? `onclick="${onClick}"` : ''}
            data-component="button"
            ${loading ? 'data-loading="true"' : ''}
          >
            ${loading ? loadingHtml : iconPosition === 'left' ? iconHtml : ''}
            ${text}
            ${!loading && iconPosition === 'right' ? iconHtml : ''}
          </button>
        `;
      }
    });
  }

  /**
   * Card Component
   */
  registerCard() {
    this.components.set('card', {
      create: (options = {}) => {
        const {
          title = null,
          subtitle = null,
          content = '',
          image = null,
          actions = null,
          variant = 'default',
          size = 'md',
          hover = true,
          clickable = false,
          onClick = null,
          className = ''
        } = options;

        const classes = this.designSystem.getComponentClasses('card', {
          variant,
          size,
          className: `${hover ? 'group hover:-translate-y-1' : ''} ${clickable ? 'cursor-pointer' : ''} ${className}`
        });

        return `
          <div 
            class="${classes}"
            data-component="card"
            ${onClick ? `onclick="${onClick}"` : ''}
          >
            ${image ? `
              <div class="relative overflow-hidden rounded-t-xl mb-4">
                <img src="${image}" alt="${title || 'Card image'}" class="w-full h-48 object-cover transition-transform duration-300 ${hover ? 'group-hover:scale-105' : ''}">
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 ${hover ? 'group-hover:opacity-100' : ''} transition-opacity duration-300"></div>
              </div>
            ` : ''}
            
            <div class="space-y-3">
              ${title ? `<h3 class="font-serif text-xl font-semibold text-neutral-900">${title}</h3>` : ''}
              ${subtitle ? `<p class="text-sm text-neutral-600 font-medium">${subtitle}</p>` : ''}
              ${content ? `<div class="text-neutral-700 leading-relaxed">${content}</div>` : ''}
              
              ${actions ? `
                <div class="flex items-center justify-between pt-4 border-t border-neutral-100">
                  ${actions}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    });
  }

  /**
   * Modal Component
   */
  registerModal() {
    this.components.set('modal', {
      create: (options = {}) => {
        const {
          id = `modal-${Date.now()}`,
          title = '',
          content = '',
          size = 'md',
          showClose = true,
          actions = null,
          backdrop = true,
          keyboard = true,
          className = ''
        } = options;

        const sizeClasses = {
          sm: 'max-w-md',
          md: 'max-w-lg',
          lg: 'max-w-2xl',
          xl: 'max-w-4xl',
          full: 'max-w-full mx-4'
        };

        return `
          <div 
            id="${id}"
            class="fixed inset-0 z-modal hidden"
            data-component="modal"
            ${backdrop ? 'data-backdrop="true"' : ''}
            ${keyboard ? 'data-keyboard="true"' : ''}
            role="dialog"
            aria-modal="true"
            aria-labelledby="${id}-title"
          >
            <!-- Backdrop -->
            <div class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" data-modal-backdrop></div>
            
            <!-- Modal -->
            <div class="fixed inset-0 z-10 overflow-y-auto">
              <div class="flex min-h-full items-center justify-center p-4">
                <div 
                  class="relative w-full ${sizeClasses[size]} bg-white rounded-2xl shadow-2xl transform transition-all ${className}"
                  data-modal-content
                >
                  <!-- Header -->
                  ${title || showClose ? `
                    <div class="flex items-center justify-between p-6 border-b border-neutral-200">
                      ${title ? `<h3 id="${id}-title" class="text-lg font-semibold text-neutral-900">${title}</h3>` : '<div></div>'}
                      ${showClose ? `
                        <button 
                          type="button" 
                          class="text-neutral-400 hover:text-neutral-600 transition-colors p-1"
                          data-modal-close
                          aria-label="Close modal"
                        >
                          <i class="fas fa-times text-lg"></i>
                        </button>
                      ` : ''}
                    </div>
                  ` : ''}
                  
                  <!-- Content -->
                  <div class="p-6">
                    ${content}
                  </div>
                  
                  <!-- Actions -->
                  ${actions ? `
                    <div class="flex items-center justify-end gap-3 p-6 border-t border-neutral-200">
                      ${actions}
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      },

      show: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.classList.remove('hidden');
          modal.querySelector('[data-modal-content]').classList.add('animate-fade-in-up');
          document.body.classList.add('overflow-hidden');
          
          // Focus trap
          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length) {
            focusableElements[0].focus();
          }
        }
      },

      hide: (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
          modal.classList.add('hidden');
          document.body.classList.remove('overflow-hidden');
        }
      }
    });
  }

  /**
   * Input Component
   */
  registerInput() {
    this.components.set('input', {
      create: (options = {}) => {
        const {
          type = 'text',
          id = null,
          name = null,
          label = null,
          placeholder = '',
          value = '',
          variant = 'default',
          size = 'md',
          required = false,
          disabled = false,
          error = null,
          helper = null,
          icon = null,
          iconPosition = 'left',
          className = ''
        } = options;

        const inputId = id || `input-${Date.now()}`;
        const classes = this.designSystem.getComponentClasses('input', {
          variant: error ? 'error' : variant,
          size,
          className: `${icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : ''} ${className}`
        });

        return `
          <div class="space-y-1">
            ${label ? `
              <label for="${inputId}" class="block text-sm font-medium text-neutral-700">
                ${label}
                ${required ? '<span class="text-red-500">*</span>' : ''}
              </label>
            ` : ''}
            
            <div class="relative">
              ${icon && iconPosition === 'left' ? `
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i class="${icon} text-neutral-400"></i>
                </div>
              ` : ''}
              
              <input
                type="${type}"
                id="${inputId}"
                ${name ? `name="${name}"` : ''}
                class="${classes}"
                placeholder="${placeholder}"
                value="${value}"
                ${required ? 'required' : ''}
                ${disabled ? 'disabled' : ''}
                data-component="input"
              />
              
              ${icon && iconPosition === 'right' ? `
                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <i class="${icon} text-neutral-400"></i>
                </div>
              ` : ''}
            </div>
            
            ${error ? `<p class="text-sm text-red-600">${error}</p>` : ''}
            ${helper && !error ? `<p class="text-sm text-neutral-500">${helper}</p>` : ''}
          </div>
        `;
      }
    });
  }

  /**
   * Badge Component
   */
  registerBadge() {
    this.components.set('badge', {
      create: (options = {}) => {
        const {
          text = '',
          variant = 'primary',
          size = 'md',
          icon = null,
          dot = false,
          className = ''
        } = options;

        const classes = this.designSystem.getComponentClasses('badge', {
          variant,
          size,
          className
        });

        return `
          <span class="${classes}" data-component="badge">
            ${dot ? '<span class="w-1.5 h-1.5 bg-current rounded-full mr-1"></span>' : ''}
            ${icon ? `<i class="${icon} ${text ? 'mr-1' : ''}"></i>` : ''}
            ${text}
          </span>
        `;
      }
    });
  }

  /**
   * Toast Component
   */
  registerToast() {
    this.components.set('toast', {
      create: (options = {}) => {
        const {
          id = `toast-${Date.now()}`,
          message = '',
          type = 'info',
          duration = 4000,
          showClose = true,
          action = null
        } = options;

        const typeConfig = {
          success: {
            icon: 'fas fa-check-circle',
            color: 'text-green-800 bg-green-50 border-green-200'
          },
          error: {
            icon: 'fas fa-exclamation-circle',
            color: 'text-red-800 bg-red-50 border-red-200'
          },
          warning: {
            icon: 'fas fa-exclamation-triangle',
            color: 'text-yellow-800 bg-yellow-50 border-yellow-200'
          },
          info: {
            icon: 'fas fa-info-circle',
            color: 'text-blue-800 bg-blue-50 border-blue-200'
          }
        };

        const config = typeConfig[type] || typeConfig.info;

        return `
          <div
            id="${id}"
            class="flex items-center justify-between p-4 mb-3 text-sm rounded-lg shadow-lg transform transition-transform duration-300 translate-x-full border ${config.color}"
            data-component="toast"
            data-duration="${duration}"
            role="alert"
          >
            <div class="flex items-center">
              <i class="${config.icon} mr-2 flex-shrink-0"></i>
              <span class="font-medium">${message}</span>
            </div>
            
            <div class="flex items-center ml-4">
              ${action ? `<button class="text-current hover:opacity-75 mr-2 font-medium">${action.text}</button>` : ''}
              ${showClose ? `
                <button 
                  class="text-current hover:opacity-75 p-1"
                  onclick="this.closest('[data-component=toast]').remove()"
                  aria-label="Close"
                >
                  <i class="fas fa-times"></i>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      },

      show: (options) => {
        const container = document.getElementById('toast-container') || (() => {
          const div = document.createElement('div');
          div.id = 'toast-container';
          div.className = 'fixed top-4 right-4 z-toast space-y-2 max-w-sm';
          document.body.appendChild(div);
          return div;
        })();

        const toastHtml = window.beautyComponents.components.get('toast').create(options);
        container.insertAdjacentHTML('beforeend', toastHtml);

        const toast = container.lastElementChild;
        
        // Animate in
        setTimeout(() => {
          toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove
        if (options.duration > 0) {
          setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
              toast.remove();
            }, 300);
          }, options.duration);
        }

        return toast.id;
      }
    });
  }

  /**
   * Date Picker Component
   */
  registerDatePicker() {
    this.components.set('datePicker', {
      create: (options = {}) => {
        const {
          id = `datepicker-${Date.now()}`,
          label = null,
          value = '',
          min = null,
          max = null,
          required = false,
          disabled = false,
          className = ''
        } = options;

        return `
          <div class="space-y-1">
            ${label ? `
              <label for="${id}" class="block text-sm font-medium text-neutral-700">
                ${label}
                ${required ? '<span class="text-red-500">*</span>' : ''}
              </label>
            ` : ''}
            
            <div class="relative">
              <input
                type="date"
                id="${id}"
                class="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${className}"
                value="${value}"
                ${min ? `min="${min}"` : ''}
                ${max ? `max="${max}"` : ''}
                ${required ? 'required' : ''}
                ${disabled ? 'disabled' : ''}
                data-component="datePicker"
              />
              <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <i class="fas fa-calendar-alt text-neutral-400"></i>
              </div>
            </div>
          </div>
        `;
      }
    });
  }

  /**
   * Avatar Component  
   */
  registerAvatar() {
    this.components.set('avatar', {
      create: (options = {}) => {
        const {
          src = null,
          name = '',
          size = 'md',
          shape = 'round',
          status = null,
          className = ''
        } = options;

        const sizeClasses = {
          xs: 'w-6 h-6 text-xs',
          sm: 'w-8 h-8 text-sm',
          md: 'w-10 h-10 text-base',
          lg: 'w-12 h-12 text-lg',
          xl: 'w-16 h-16 text-xl',
          '2xl': 'w-20 h-20 text-2xl'
        };

        const shapeClasses = {
          round: 'rounded-full',
          square: 'rounded-lg'
        };

        const statusClasses = {
          online: 'bg-green-500',
          offline: 'bg-neutral-400',
          busy: 'bg-red-500',
          away: 'bg-yellow-500'
        };

        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        const baseClasses = `${sizeClasses[size]} ${shapeClasses[shape]} flex items-center justify-center font-medium text-white bg-primary-500 ${className}`;

        return `
          <div class="relative inline-block">
            ${src ? `
              <img
                src="${src}"
                alt="${name}"
                class="${baseClasses} object-cover"
                data-component="avatar"
              />
            ` : `
              <div class="${baseClasses}" data-component="avatar">
                ${initials || '?'}
              </div>
            `}
            
            ${status ? `
              <span class="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white ${statusClasses[status]}"></span>
            ` : ''}
          </div>
        `;
      }
    });
  }

  /**
   * Progress Bar Component
   */
  registerProgressBar() {
    this.components.set('progressBar', {
      create: (options = {}) => {
        const {
          value = 0,
          max = 100,
          size = 'md',
          color = 'primary',
          showLabel = true,
          label = null,
          className = ''
        } = options;

        const percentage = Math.min((value / max) * 100, 100);

        const sizeClasses = {
          sm: 'h-2',
          md: 'h-3',
          lg: 'h-4'
        };

        const colorClasses = {
          primary: 'bg-primary-500',
          secondary: 'bg-secondary-500',
          success: 'bg-green-500',
          warning: 'bg-yellow-500',
          error: 'bg-red-500'
        };

        return `
          <div class="w-full ${className}">
            ${showLabel || label ? `
              <div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium text-neutral-700">${label || 'Progress'}</span>
                <span class="text-sm text-neutral-500">${Math.round(percentage)}%</span>
              </div>
            ` : ''}
            
            <div class="w-full bg-neutral-200 rounded-full ${sizeClasses[size]}">
              <div 
                class="${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-500"
                style="width: ${percentage}%"
                data-component="progressBar"
                role="progressbar"
                aria-valuenow="${value}"
                aria-valuemin="0"
                aria-valuemax="${max}"
              ></div>
            </div>
          </div>
        `;
      }
    });
  }

  /**
   * Dropdown Component
   */
  registerDropdown() {
    this.components.set('dropdown', {
      create: (options = {}) => {
        const {
          id = `dropdown-${Date.now()}`,
          trigger = '',
          items = [],
          position = 'bottom-left',
          className = ''
        } = options;

        const positionClasses = {
          'bottom-left': 'top-full left-0 mt-1',
          'bottom-right': 'top-full right-0 mt-1',
          'top-left': 'bottom-full left-0 mb-1',
          'top-right': 'bottom-full right-0 mb-1'
        };

        return `
          <div class="relative inline-block ${className}" data-component="dropdown">
            <div data-dropdown-trigger="${id}">
              ${trigger}
            </div>
            
            <div
              id="${id}"
              class="absolute z-dropdown hidden bg-white rounded-lg shadow-lg border border-neutral-200 py-1 min-w-48 ${positionClasses[position]}"
              data-dropdown-menu
            >
              ${items.map(item => {
                if (item.divider) {
                  return '<div class="border-t border-neutral-200 my-1"></div>';
                }
                
                return `
                  <a
                    href="${item.href || '#'}"
                    class="flex items-center px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors ${item.className || ''}"
                    ${item.onClick ? `onclick="${item.onClick}"` : ''}
                  >
                    ${item.icon ? `<i class="${item.icon} mr-2"></i>` : ''}
                    ${item.label}
                    ${item.badge ? `<span class="ml-auto text-xs bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">${item.badge}</span>` : ''}
                  </a>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    });
  }

  /**
   * Table Component
   */
  registerTable() {
    this.components.set('table', {
      create: (options = {}) => {
        const {
          columns = [],
          data = [],
          sortable = false,
          hoverable = true,
          striped = false,
          className = ''
        } = options;

        return `
          <div class="overflow-x-auto ${className}">
            <table class="min-w-full divide-y divide-neutral-200" data-component="table">
              <thead class="bg-neutral-50">
                <tr>
                  ${columns.map(column => `
                    <th
                      class="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider ${sortable ? 'cursor-pointer hover:bg-neutral-100' : ''}"
                      ${sortable ? `data-sort-key="${column.key}"` : ''}
                    >
                      <div class="flex items-center">
                        ${column.label}
                        ${sortable ? '<i class="fas fa-sort ml-1 text-neutral-400"></i>' : ''}
                      </div>
                    </th>
                  `).join('')}
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-neutral-200">
                ${data.map((row, rowIndex) => `
                  <tr class="${hoverable ? 'hover:bg-neutral-50' : ''} ${striped && rowIndex % 2 === 1 ? 'bg-neutral-25' : ''}">
                    ${columns.map(column => `
                      <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-900">
                        ${column.render ? column.render(row[column.key], row) : row[column.key] || ''}
                      </td>
                    `).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    });
  }

  /**
   * Tabs Component
   */
  registerTabs() {
    this.components.set('tabs', {
      create: (options = {}) => {
        const {
          id = `tabs-${Date.now()}`,
          tabs = [],
          activeTab = 0,
          variant = 'underline',
          className = ''
        } = options;

        const variantClasses = {
          underline: 'border-b border-neutral-200',
          pills: 'bg-neutral-100 rounded-lg p-1'
        };

        return `
          <div class="${className}" data-component="tabs" data-tabs-id="${id}">
            <div class="flex space-x-1 ${variantClasses[variant]}">
              ${tabs.map((tab, index) => `
                <button
                  class="px-4 py-2 text-sm font-medium transition-colors ${
                    index === activeTab 
                      ? variant === 'underline' 
                        ? 'text-primary-600 border-b-2 border-primary-600' 
                        : 'bg-white text-primary-600 rounded-md shadow-sm'
                      : 'text-neutral-500 hover:text-neutral-700'
                  }"
                  data-tab-trigger="${index}"
                  role="tab"
                  aria-selected="${index === activeTab}"
                >
                  ${tab.icon ? `<i class="${tab.icon} mr-2"></i>` : ''}
                  ${tab.label}
                </button>
              `).join('')}
            </div>
            
            <div class="mt-4">
              ${tabs.map((tab, index) => `
                <div
                  class="${index === activeTab ? 'block' : 'hidden'}"
                  data-tab-content="${index}"
                  role="tabpanel"
                >
                  ${tab.content}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
    });
  }

  /**
   * Accordion Component
   */
  registerAccordion() {
    this.components.set('accordion', {
      create: (options = {}) => {
        const {
          id = `accordion-${Date.now()}`,
          items = [],
          allowMultiple = false,
          className = ''
        } = options;

        return `
          <div class="space-y-2 ${className}" data-component="accordion" data-accordion-id="${id}" data-multiple="${allowMultiple}">
            ${items.map((item, index) => `
              <div class="border border-neutral-200 rounded-lg">
                <button
                  class="flex items-center justify-between w-full px-4 py-3 text-left text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                  data-accordion-trigger="${index}"
                  aria-expanded="false"
                >
                  <span>${item.title}</span>
                  <i class="fas fa-chevron-down transform transition-transform duration-200"></i>
                </button>
                <div
                  class="hidden px-4 pb-3 text-sm text-neutral-600"
                  data-accordion-content="${index}"
                >
                  ${item.content}
                </div>
              </div>
            `).join('')}
          </div>
        `;
      }
    });
  }

  /**
   * Slider Component
   */
  registerSlider() {
    this.components.set('slider', {
      create: (options = {}) => {
        const {
          id = `slider-${Date.now()}`,
          min = 0,
          max = 100,
          value = 50,
          step = 1,
          label = null,
          showValue = true,
          className = ''
        } = options;

        return `
          <div class="space-y-2 ${className}">
            ${label ? `
              <div class="flex justify-between items-center">
                <label for="${id}" class="block text-sm font-medium text-neutral-700">${label}</label>
                ${showValue ? `<span class="text-sm text-neutral-500" data-slider-value>${value}</span>` : ''}
              </div>
            ` : ''}
            
            <input
              type="range"
              id="${id}"
              min="${min}"
              max="${max}"
              value="${value}"
              step="${step}"
              class="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer slider"
              data-component="slider"
            />
            
            <style>
              .slider::-webkit-slider-thumb {
                appearance: none;
                height: 20px;
                width: 20px;
                border-radius: 50%;
                background: #ec4899;
                cursor: pointer;
              }
              
              .slider::-moz-range-thumb {
                height: 20px;
                width: 20px;
                border-radius: 50%;
                background: #ec4899;
                cursor: pointer;
                border: none;
              }
            </style>
          </div>
        `;
      }
    });
  }

  /**
   * Toggle Component
   */
  registerToggle() {
    this.components.set('toggle', {
      create: (options = {}) => {
        const {
          id = `toggle-${Date.now()}`,
          name = null,
          label = null,
          checked = false,
          disabled = false,
          size = 'md',
          className = ''
        } = options;

        const sizeClasses = {
          sm: 'w-8 h-4',
          md: 'w-10 h-5',
          lg: 'w-12 h-6'
        };

        const thumbSizes = {
          sm: 'w-3 h-3',
          md: 'w-4 h-4', 
          lg: 'w-5 h-5'
        };

        return `
          <label class="flex items-center cursor-pointer ${className}" data-component="toggle">
            <div class="relative">
              <input
                type="checkbox"
                id="${id}"
                ${name ? `name="${name}"` : ''}
                ${checked ? 'checked' : ''}
                ${disabled ? 'disabled' : ''}
                class="sr-only peer"
              />
              <div class="block bg-neutral-300 ${sizeClasses[size]} rounded-full peer-checked:bg-primary-500 transition-colors"></div>
              <div class="absolute top-0.5 left-0.5 bg-white ${thumbSizes[size]} rounded-full transition-transform peer-checked:translate-x-full shadow-sm"></div>
            </div>
            ${label ? `<span class="ml-3 text-sm font-medium text-neutral-700">${label}</span>` : ''}
          </label>
        `;
      }
    });
  }

  /**
   * Create component instance
   * @param {string} componentName - Component name
   * @param {Object} options - Component options
   * @returns {string} Component HTML
   */
  create(componentName, options = {}) {
    const component = this.components.get(componentName);
    if (!component) {
      console.warn(`Component "${componentName}" not found`);
      return '';
    }

    return component.create(options);
  }

  /**
   * Handle global click events
   * @param {Event} event - Click event
   */
  handleGlobalClick(event) {
    // Handle dropdown triggers
    const dropdownTrigger = event.target.closest('[data-dropdown-trigger]');
    if (dropdownTrigger) {
      event.preventDefault();
      const menuId = dropdownTrigger.dataset.dropdownTrigger;
      const menu = document.getElementById(menuId);
      
      if (menu) {
        const isVisible = !menu.classList.contains('hidden');
        
        // Hide all other dropdowns
        document.querySelectorAll('[data-dropdown-menu]').forEach(m => {
          m.classList.add('hidden');
        });
        
        // Toggle current dropdown
        if (!isVisible) {
          menu.classList.remove('hidden');
        }
      }
      return;
    }

    // Handle tab triggers
    const tabTrigger = event.target.closest('[data-tab-trigger]');
    if (tabTrigger) {
      const tabIndex = parseInt(tabTrigger.dataset.tabTrigger);
      const tabsContainer = tabTrigger.closest('[data-component="tabs"]');
      
      if (tabsContainer) {
        // Update active tab
        tabsContainer.querySelectorAll('[data-tab-trigger]').forEach((trigger, index) => {
          if (index === tabIndex) {
            trigger.classList.add('text-primary-600', 'border-b-2', 'border-primary-600');
            trigger.classList.remove('text-neutral-500');
            trigger.setAttribute('aria-selected', 'true');
          } else {
            trigger.classList.remove('text-primary-600', 'border-b-2', 'border-primary-600');
            trigger.classList.add('text-neutral-500');
            trigger.setAttribute('aria-selected', 'false');
          }
        });

        // Show active content
        tabsContainer.querySelectorAll('[data-tab-content]').forEach((content, index) => {
          content.classList.toggle('hidden', index !== tabIndex);
        });
      }
      return;
    }

    // Handle accordion triggers
    const accordionTrigger = event.target.closest('[data-accordion-trigger]');
    if (accordionTrigger) {
      const itemIndex = parseInt(accordionTrigger.dataset.accordionTrigger);
      const accordion = accordionTrigger.closest('[data-component="accordion"]');
      const content = accordion.querySelector(`[data-accordion-content="${itemIndex}"]`);
      const icon = accordionTrigger.querySelector('i');
      const allowMultiple = accordion.dataset.multiple === 'true';
      
      if (!allowMultiple) {
        // Close other items
        accordion.querySelectorAll('[data-accordion-content]').forEach((c, index) => {
          if (index !== itemIndex) {
            c.classList.add('hidden');
            const otherTrigger = accordion.querySelector(`[data-accordion-trigger="${index}"]`);
            const otherIcon = otherTrigger.querySelector('i');
            otherTrigger.setAttribute('aria-expanded', 'false');
            otherIcon.classList.remove('rotate-180');
          }
        });
      }

      // Toggle current item
      const isOpen = !content.classList.contains('hidden');
      content.classList.toggle('hidden');
      accordionTrigger.setAttribute('aria-expanded', !isOpen);
      icon.classList.toggle('rotate-180');
      return;
    }

    // Handle modal backdrop clicks
    const modalBackdrop = event.target.closest('[data-modal-backdrop]');
    if (modalBackdrop && event.target === modalBackdrop) {
      const modal = modalBackdrop.closest('[data-component="modal"]');
      if (modal && modal.dataset.backdrop !== 'false') {
        this.components.get('modal').hide(modal.id);
      }
      return;
    }

    // Handle modal close buttons
    const modalClose = event.target.closest('[data-modal-close]');
    if (modalClose) {
      const modal = modalClose.closest('[data-component="modal"]');
      if (modal) {
        this.components.get('modal').hide(modal.id);
      }
      return;
    }

    // Close dropdowns when clicking outside
    if (!event.target.closest('[data-component="dropdown"]')) {
      document.querySelectorAll('[data-dropdown-menu]').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  }

  /**
   * Handle global keydown events
   * @param {Event} event - Keydown event
   */
  handleGlobalKeydown(event) {
    // Handle modal keyboard navigation
    if (event.key === 'Escape') {
      const openModal = document.querySelector('[data-component="modal"]:not(.hidden)');
      if (openModal && openModal.dataset.keyboard !== 'false') {
        this.components.get('modal').hide(openModal.id);
      }
      
      // Close dropdowns
      document.querySelectorAll('[data-dropdown-menu]:not(.hidden)').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  }

  /**
   * Handle global input events
   * @param {Event} event - Input event
   */
  handleGlobalInput(event) {
    const target = event.target;

    // Handle slider value updates
    if (target.dataset.component === 'slider') {
      const valueDisplay = target.parentElement.querySelector('[data-slider-value]');
      if (valueDisplay) {
        valueDisplay.textContent = target.value;
      }
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type
   * @param {Object} options - Additional options
   * @returns {string} Toast ID
   */
  showToast(message, type = 'info', options = {}) {
    return this.components.get('toast').show({
      message,
      type,
      ...options
    });
  }

  /**
   * Show modal
   * @param {string} modalId - Modal ID
   */
  showModal(modalId) {
    this.components.get('modal').show(modalId);
  }

  /**
   * Hide modal
   * @param {string} modalId - Modal ID
   */
  hideModal(modalId) {
    this.components.get('modal').hide(modalId);
  }

  /**
   * Get component instance
   * @param {string} componentName - Component name
   * @returns {Object} Component instance
   */
  getComponent(componentName) {
    return this.components.get(componentName);
  }

  /**
   * Register custom component
   * @param {string} name - Component name
   * @param {Object} component - Component definition
   */
  registerCustomComponent(name, component) {
    this.components.set(name, component);
  }

  /**
   * Unregister component
   * @param {string} name - Component name
   */
  unregisterComponent(name) {
    this.components.delete(name);
  }
}

// Create global component library instance
document.addEventListener('DOMContentLoaded', () => {
  window.beautyComponents = new BeautyComponentLibrary(window.designSystem);
  
  // Global helper functions
  window.createComponent = (name, options) => window.beautyComponents.create(name, options);
  window.showToast = (message, type, options) => window.beautyComponents.showToast(message, type, options);
  window.showModal = (id) => window.beautyComponents.showModal(id);
  window.hideModal = (id) => window.beautyComponents.hideModal(id);
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BeautyComponentLibrary;
}