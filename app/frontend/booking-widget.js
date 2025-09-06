// Salon Booking Widget
// Embeddable booking system for Light Plan and above

(function() {
  'use strict';

  // Widget configuration
  const WIDGET_VERSION = '1.0.0';
  const API_BASE_URL = window.SALON_WIDGET_CONFIG?.apiUrl || 'https://api.salonbooking.jp';
  
  // Widget styles
  const widgetStyles = `
    .salon-booking-widget {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 400px;
      margin: 0 auto;
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .sbw-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .sbw-title {
      font-size: 24px;
      color: #333;
      margin: 0 0 10px;
    }
    
    .sbw-subtitle {
      font-size: 14px;
      color: #666;
    }
    
    .sbw-form-group {
      margin-bottom: 15px;
    }
    
    .sbw-label {
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
    
    .sbw-input, .sbw-select, .sbw-textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.3s;
    }
    
    .sbw-input:focus, .sbw-select:focus, .sbw-textarea:focus {
      outline: none;
      border-color: #4CAF50;
    }
    
    .sbw-date-time-group {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .sbw-time-slots {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 10px;
    }
    
    .sbw-time-slot {
      padding: 8px;
      text-align: center;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.3s;
      font-size: 14px;
    }
    
    .sbw-time-slot:hover {
      background: #f5f5f5;
    }
    
    .sbw-time-slot.selected {
      background: #4CAF50;
      color: white;
      border-color: #4CAF50;
    }
    
    .sbw-time-slot.disabled {
      background: #f0f0f0;
      color: #999;
      cursor: not-allowed;
    }
    
    .sbw-button {
      width: 100%;
      padding: 12px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.3s;
    }
    
    .sbw-button:hover {
      background: #45a049;
    }
    
    .sbw-button:disabled {
      background: #ccc;
      cursor: not-allowed;
    }
    
    .sbw-loading {
      text-align: center;
      padding: 20px;
    }
    
    .sbw-spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #4CAF50;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: sbw-spin 1s linear infinite;
      margin: 0 auto;
    }
    
    @keyframes sbw-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .sbw-success {
      text-align: center;
      padding: 20px;
    }
    
    .sbw-success-icon {
      font-size: 48px;
      color: #4CAF50;
      margin-bottom: 10px;
    }
    
    .sbw-error {
      background: #fee;
      color: #c33;
      padding: 10px;
      border-radius: 4px;
      margin-bottom: 15px;
      font-size: 14px;
    }
    
    .sbw-powered-by {
      text-align: center;
      margin-top: 20px;
      font-size: 12px;
      color: #999;
    }
    
    .sbw-powered-by a {
      color: #666;
      text-decoration: none;
    }
  `;

  // Widget HTML template
  const widgetTemplate = `
    <div class="salon-booking-widget">
      <div class="sbw-header">
        <h2 class="sbw-title">オンライン予約</h2>
        <p class="sbw-subtitle">ご希望の日時をお選びください</p>
      </div>
      
      <form id="sbw-booking-form">
        <div class="sbw-form-group">
          <label class="sbw-label">サービス</label>
          <select class="sbw-select" id="sbw-service" required>
            <option value="">サービスを選択</option>
          </select>
        </div>
        
        <div class="sbw-form-group">
          <label class="sbw-label">スタッフ</label>
          <select class="sbw-select" id="sbw-staff">
            <option value="">指名なし</option>
          </select>
        </div>
        
        <div class="sbw-form-group">
          <label class="sbw-label">予約日</label>
          <input type="date" class="sbw-input" id="sbw-date" required>
        </div>
        
        <div class="sbw-form-group">
          <label class="sbw-label">予約時間</label>
          <div class="sbw-time-slots" id="sbw-time-slots">
            <!-- Time slots will be dynamically loaded -->
          </div>
        </div>
        
        <div class="sbw-form-group">
          <label class="sbw-label">お名前</label>
          <input type="text" class="sbw-input" id="sbw-name" required>
        </div>
        
        <div class="sbw-form-group">
          <label class="sbw-label">電話番号</label>
          <input type="tel" class="sbw-input" id="sbw-phone" required>
        </div>
        
        <div class="sbw-form-group">
          <label class="sbw-label">メールアドレス</label>
          <input type="email" class="sbw-input" id="sbw-email" required>
        </div>
        
        <div class="sbw-form-group">
          <label class="sbw-label">備考（任意）</label>
          <textarea class="sbw-textarea" id="sbw-notes" rows="3"></textarea>
        </div>
        
        <button type="submit" class="sbw-button" id="sbw-submit">予約する</button>
      </form>
      
      <div class="sbw-powered-by">
        Powered by <a href="https://salonbooking.jp" target="_blank">Salon Booking</a>
      </div>
    </div>
  `;

  // Widget class
  class SalonBookingWidget {
    constructor(config) {
      this.config = {
        salonId: config.salonId,
        apiKey: config.apiKey,
        container: config.container || 'salon-booking-widget',
        theme: config.theme || 'light',
        lang: config.lang || 'ja',
        onSuccess: config.onSuccess || null,
        onError: config.onError || null
      };
      
      this.selectedService = null;
      this.selectedStaff = null;
      this.selectedDate = null;
      this.selectedTime = null;
      
      this.init();
    }
    
    init() {
      // Inject styles
      if (!document.getElementById('sbw-styles')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'sbw-styles';
        styleEl.textContent = widgetStyles;
        document.head.appendChild(styleEl);
      }
      
      // Render widget
      this.render();
      
      // Load initial data
      this.loadServices();
      this.loadStaff();
      
      // Bind events
      this.bindEvents();
    }
    
    render() {
      const container = document.getElementById(this.config.container);
      if (!container) {
        console.error('Salon Booking Widget: Container not found');
        return;
      }
      
      container.innerHTML = widgetTemplate;
    }
    
    bindEvents() {
      // Service selection
      document.getElementById('sbw-service').addEventListener('change', (e) => {
        this.selectedService = e.target.value;
        this.updateAvailability();
      });
      
      // Staff selection
      document.getElementById('sbw-staff').addEventListener('change', (e) => {
        this.selectedStaff = e.target.value;
        this.updateAvailability();
      });
      
      // Date selection
      document.getElementById('sbw-date').addEventListener('change', (e) => {
        this.selectedDate = e.target.value;
        this.loadTimeSlots();
      });
      
      // Form submission
      document.getElementById('sbw-booking-form').addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitBooking();
      });
      
      // Set minimum date to today
      const dateInput = document.getElementById('sbw-date');
      dateInput.min = new Date().toISOString().split('T')[0];
    }
    
    async loadServices() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/salons/${this.config.salonId}/services`, {
          headers: {
            'X-API-Key': this.config.apiKey
          }
        });
        
        if (!response.ok) throw new Error('Failed to load services');
        
        const data = await response.json();
        const select = document.getElementById('sbw-service');
        
        data.services.forEach(service => {
          const option = document.createElement('option');
          option.value = service._id;
          option.textContent = `${service.name} (${service.duration}分 - ¥${service.price.toLocaleString()})`;
          select.appendChild(option);
        });
      } catch (error) {
        console.error('Error loading services:', error);
        this.showError('サービスの読み込みに失敗しました');
      }
    }
    
    async loadStaff() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/public/salons/${this.config.salonId}/staff`, {
          headers: {
            'X-API-Key': this.config.apiKey
          }
        });
        
        if (!response.ok) throw new Error('Failed to load staff');
        
        const data = await response.json();
        const select = document.getElementById('sbw-staff');
        
        data.staff.forEach(member => {
          const option = document.createElement('option');
          option.value = member._id;
          option.textContent = member.name;
          select.appendChild(option);
        });
      } catch (error) {
        console.error('Error loading staff:', error);
      }
    }
    
    async loadTimeSlots() {
      if (!this.selectedDate || !this.selectedService) return;
      
      const container = document.getElementById('sbw-time-slots');
      container.innerHTML = '<div class="sbw-loading"><div class="sbw-spinner"></div></div>';
      
      try {
        const params = new URLSearchParams({
          date: this.selectedDate,
          service: this.selectedService,
          staff: this.selectedStaff || ''
        });
        
        const response = await fetch(`${API_BASE_URL}/api/public/salons/${this.config.salonId}/availability?${params}`, {
          headers: {
            'X-API-Key': this.config.apiKey
          }
        });
        
        if (!response.ok) throw new Error('Failed to load availability');
        
        const data = await response.json();
        this.renderTimeSlots(data.slots);
      } catch (error) {
        console.error('Error loading time slots:', error);
        container.innerHTML = '<p style="color: #999; text-align: center;">時間帯の読み込みに失敗しました</p>';
      }
    }
    
    renderTimeSlots(slots) {
      const container = document.getElementById('sbw-time-slots');
      container.innerHTML = '';
      
      slots.forEach(slot => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sbw-time-slot';
        button.textContent = slot.time;
        button.dataset.time = slot.time;
        
        if (!slot.available) {
          button.classList.add('disabled');
          button.disabled = true;
        } else {
          button.addEventListener('click', () => {
            // Remove previous selection
            container.querySelectorAll('.selected').forEach(el => {
              el.classList.remove('selected');
            });
            
            // Select this time
            button.classList.add('selected');
            this.selectedTime = slot.time;
          });
        }
        
        container.appendChild(button);
      });
    }
    
    async submitBooking() {
      if (!this.selectedTime) {
        this.showError('予約時間を選択してください');
        return;
      }
      
      const submitButton = document.getElementById('sbw-submit');
      submitButton.disabled = true;
      submitButton.textContent = '予約処理中...';
      
      try {
        const bookingData = {
          service: this.selectedService,
          staff: this.selectedStaff || null,
          date: this.selectedDate,
          time: this.selectedTime,
          customer: {
            name: document.getElementById('sbw-name').value,
            phone: document.getElementById('sbw-phone').value,
            email: document.getElementById('sbw-email').value
          },
          notes: document.getElementById('sbw-notes').value
        };
        
        const response = await fetch(`${API_BASE_URL}/api/public/salons/${this.config.salonId}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.config.apiKey
          },
          body: JSON.stringify(bookingData)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Booking failed');
        }
        
        const result = await response.json();
        this.showSuccess(result.booking);
        
        if (this.config.onSuccess) {
          this.config.onSuccess(result.booking);
        }
      } catch (error) {
        console.error('Booking error:', error);
        this.showError(error.message || '予約の送信に失敗しました');
        
        if (this.config.onError) {
          this.config.onError(error);
        }
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = '予約する';
      }
    }
    
    updateAvailability() {
      if (this.selectedDate) {
        this.loadTimeSlots();
      }
    }
    
    showError(message) {
      const existingError = document.querySelector('.sbw-error');
      if (existingError) {
        existingError.remove();
      }
      
      const error = document.createElement('div');
      error.className = 'sbw-error';
      error.textContent = message;
      
      const form = document.getElementById('sbw-booking-form');
      form.insertBefore(error, form.firstChild);
      
      setTimeout(() => {
        error.remove();
      }, 5000);
    }
    
    showSuccess(booking) {
      const widget = document.querySelector('.salon-booking-widget');
      widget.innerHTML = `
        <div class="sbw-success">
          <div class="sbw-success-icon">✓</div>
          <h3>予約が完了しました</h3>
          <p>予約番号: ${booking.bookingNumber}</p>
          <p>${booking.date} ${booking.time}</p>
          <p>確認メールをお送りしました。</p>
          <button class="sbw-button" onclick="location.reload()">新しい予約を作成</button>
        </div>
      `;
    }
  }
  
  // Export to global scope
  window.SalonBookingWidget = SalonBookingWidget;
  
  // Auto-initialize if config is present
  if (window.SALON_WIDGET_CONFIG) {
    document.addEventListener('DOMContentLoaded', () => {
      new SalonBookingWidget(window.SALON_WIDGET_CONFIG);
    });
  }
})();