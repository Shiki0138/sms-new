// Calendar Component
class AppointmentCalendar {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            view: 'month', // month, week, day
            onDateClick: null,
            onAppointmentClick: null,
            ...options
        };
        
        this.currentDate = new Date();
        this.appointments = [];
        this.settings = null;
        this.holidays = [];
        this.closures = [];
        
        this.init();
    }
    
    async init() {
        await this.loadSettings();
        this.render();
        this.loadAppointments();
    }
    
    async loadSettings() {
        try {
            const response = await apiRequest('/settings');
            this.settings = response.setting;
            this.holidays = this.settings.holidays || [];
            this.closures = this.settings.temporaryClosures || [];
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }
    
    async loadAppointments() {
        try {
            let startDate, endDate;
            
            switch (this.options.view) {
                case 'month':
                    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
                    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
                    
                    // Include days from previous/next month
                    startDate = new Date(firstDay);
                    startDate.setDate(startDate.getDate() - firstDay.getDay());
                    
                    endDate = new Date(lastDay);
                    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
                    break;
                    
                case 'week':
                    const weekStart = new Date(this.currentDate);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    startDate = weekStart;
                    
                    endDate = new Date(weekStart);
                    endDate.setDate(endDate.getDate() + 6);
                    break;
                    
                case 'day':
                    startDate = new Date(this.currentDate);
                    endDate = new Date(this.currentDate);
                    break;
            }
            
            const response = await apiRequest(
                `/appointments?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );
            
            this.appointments = response.appointments;
            this.renderAppointments();
        } catch (error) {
            console.error('Failed to load appointments:', error);
        }
    }
    
    render() {
        const html = `
            <div class="calendar-wrapper">
                <div class="calendar-controls">
                    <div class="calendar-nav">
                        <button onclick="calendar.previousPeriod()">◀</button>
                        <div class="calendar-title">${this.getTitle()}</div>
                        <button onclick="calendar.nextPeriod()">▶</button>
                        <button onclick="calendar.today()">今日</button>
                    </div>
                    <div class="view-selector">
                        <button class="view-btn ${this.options.view === 'day' ? 'active' : ''}" 
                                onclick="calendar.setView('day')">日</button>
                        <button class="view-btn ${this.options.view === 'week' ? 'active' : ''}" 
                                onclick="calendar.setView('week')">週</button>
                        <button class="view-btn ${this.options.view === 'month' ? 'active' : ''}" 
                                onclick="calendar.setView('month')">月</button>
                    </div>
                </div>
                <div id="calendar-content">
                    ${this.renderView()}
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
    }
    
    renderView() {
        switch (this.options.view) {
            case 'month':
                return this.renderMonthView();
            case 'week':
                return this.renderWeekView();
            case 'day':
                return this.renderDayView();
            default:
                return this.renderMonthView();
        }
    }
    
    renderMonthView() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        
        let html = '<div class="calendar-month">';
        
        // Weekday headers
        html += '<div class="calendar-weekdays">';
        weekdays.forEach((day, index) => {
            const className = index === 0 ? 'sunday' : index === 6 ? 'saturday' : '';
            html += `<div class="weekday ${className}">${day}</div>`;
        });
        html += '</div>';
        
        // Days
        html += '<div class="calendar-days">';
        const date = new Date(startDate);
        
        for (let i = 0; i < 42; i++) {
            const isCurrentMonth = date.getMonth() === month;
            const isToday = this.isToday(date);
            const isHoliday = this.isHoliday(date);
            const isClosed = this.isClosed(date);
            const dayOfWeek = date.getDay();
            
            let className = 'calendar-day';
            if (!isCurrentMonth) className += ' other-month';
            if (isToday) className += ' today';
            if (isHoliday || dayOfWeek === 0) className += ' holiday';
            if (isClosed) className += ' closed';
            
            const dateStr = this.formatDate(date);
            
            html += `
                <div class="${className}" data-date="${dateStr}" onclick="calendar.onDayClick('${dateStr}')">
                    <div class="day-number">${date.getDate()}</div>
                    ${isHoliday && isCurrentMonth ? '<div class="holiday-indicator">祝</div>' : ''}
                    ${isClosed ? this.getClosureReason(date) : ''}
                    <div class="day-appointments" id="appointments-${dateStr}"></div>
                </div>
            `;
            
            date.setDate(date.getDate() + 1);
        }
        
        html += '</div></div>';
        
        return html;
    }
    
    renderWeekView() {
        const weekStart = new Date(this.currentDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const timeSlots = this.generateTimeSlots();
        
        let html = '<div class="calendar-week">';
        
        // Header
        html += '<div class="time-slot"></div>';
        for (let i = 0; i < 7; i++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + i);
            const isClosed = this.isClosed(date);
            
            html += `
                <div class="week-day-header ${isClosed ? 'closed' : ''}">
                    <div class="day-name">${weekdays[i]}</div>
                    <div class="day-date">${date.getMonth() + 1}/${date.getDate()}</div>
                </div>
            `;
        }
        
        // Time slots
        timeSlots.forEach(time => {
            html += `<div class="time-slot">${time}</div>`;
            
            for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                const dateStr = this.formatDate(date);
                const isClosed = this.isClosed(date);
                
                html += `
                    <div class="week-time-grid ${isClosed ? 'closed' : ''}" 
                         data-date="${dateStr}" 
                         data-time="${time}"
                         onclick="calendar.onTimeSlotClick('${dateStr}', '${time}')">
                        <div id="slot-${dateStr}-${time.replace(':', '')}"></div>
                    </div>
                `;
            }
        });
        
        html += '</div>';
        
        return html;
    }
    
    renderDayView() {
        const dateStr = this.formatDate(this.currentDate);
        const dayName = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'][this.currentDate.getDay()];
        const timeSlots = this.generateTimeSlots();
        const isClosed = this.isClosed(this.currentDate);
        
        let html = `
            <div class="calendar-day-view">
                <div class="day-view-header ${isClosed ? 'closed' : ''}">
                    ${this.currentDate.getMonth() + 1}月${this.currentDate.getDate()}日 ${dayName}
                    ${isClosed ? '<div class="closure-reason">休業日</div>' : ''}
                </div>
        `;
        
        timeSlots.forEach(time => {
            html += `
                <div class="time-slot">${time}</div>
                <div class="day-time-slot ${isClosed ? 'closed' : ''}" 
                     data-time="${time}"
                     onclick="calendar.onTimeSlotClick('${dateStr}', '${time}')">
                    <div id="slot-${dateStr}-${time.replace(':', '')}"></div>
                </div>
            `;
        });
        
        html += '</div>';
        
        return html;
    }
    
    renderAppointments() {
        if (this.options.view === 'month') {
            this.renderMonthAppointments();
        } else if (this.options.view === 'week') {
            this.renderWeekAppointments();
        } else if (this.options.view === 'day') {
            this.renderDayAppointments();
        }
    }
    
    renderMonthAppointments() {
        // Group appointments by date
        const appointmentsByDate = {};
        
        this.appointments.forEach(apt => {
            const dateStr = this.formatDate(new Date(apt.appointmentDate));
            if (!appointmentsByDate[dateStr]) {
                appointmentsByDate[dateStr] = [];
            }
            appointmentsByDate[dateStr].push(apt);
        });
        
        // Render appointments for each date
        Object.entries(appointmentsByDate).forEach(([dateStr, appointments]) => {
            const container = document.getElementById(`appointments-${dateStr}`);
            if (!container) return;
            
            const maxShow = 3;
            const visibleAppointments = appointments.slice(0, maxShow);
            const moreCount = appointments.length - maxShow;
            
            let html = '';
            visibleAppointments.forEach(apt => {
                html += `
                    <div class="appointment-item ${apt.status}" 
                         onclick="calendar.onAppointmentClick('${apt.id}', event)">
                        ${apt.startTime} ${apt.customer?.lastName || ''}
                    </div>
                `;
            });
            
            if (moreCount > 0) {
                html += `<div class="more-appointments">他${moreCount}件</div>`;
            }
            
            container.innerHTML = html;
        });
    }
    
    renderWeekAppointments() {
        this.appointments.forEach(apt => {
            const dateStr = this.formatDate(new Date(apt.appointmentDate));
            const startTime = apt.startTime.replace(':', '');
            const slotId = `slot-${dateStr}-${startTime}`;
            const slot = document.getElementById(slotId);
            
            if (slot) {
                const startMinutes = this.timeToMinutes(apt.startTime);
                const endMinutes = this.timeToMinutes(apt.endTime);
                const duration = endMinutes - startMinutes;
                const top = (startMinutes % 60) / 60 * 100;
                const height = duration / 60 * 100;
                
                slot.innerHTML = `
                    <div class="week-appointment ${apt.status}" 
                         style="top: ${top}%; height: ${height}%;"
                         onclick="calendar.onAppointmentClick('${apt.id}', event)">
                        <div>${apt.customer?.lastName || ''}</div>
                        <div>${apt.services?.[0]?.name || ''}</div>
                    </div>
                `;
            }
        });
    }
    
    renderDayAppointments() {
        this.renderWeekAppointments(); // Same logic for day view
    }
    
    // Navigation methods
    previousPeriod() {
        switch (this.options.view) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
        }
        this.render();
        this.loadAppointments();
    }
    
    nextPeriod() {
        switch (this.options.view) {
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
        }
        this.render();
        this.loadAppointments();
    }
    
    today() {
        this.currentDate = new Date();
        this.render();
        this.loadAppointments();
    }
    
    setView(view) {
        this.options.view = view;
        this.render();
        this.loadAppointments();
    }
    
    // Event handlers
    onDayClick(dateStr) {
        if (this.options.onDateClick) {
            this.options.onDateClick(new Date(dateStr));
        }
    }
    
    onTimeSlotClick(dateStr, time, event) {
        if (event) event.stopPropagation();
        if (this.options.onDateClick) {
            const date = new Date(dateStr);
            const [hours, minutes] = time.split(':');
            date.setHours(parseInt(hours), parseInt(minutes));
            this.options.onDateClick(date);
        }
    }
    
    onAppointmentClick(appointmentId, event) {
        if (event) event.stopPropagation();
        if (this.options.onAppointmentClick) {
            const appointment = this.appointments.find(apt => apt.id === appointmentId);
            this.options.onAppointmentClick(appointment);
        }
    }
    
    // Utility methods
    getTitle() {
        switch (this.options.view) {
            case 'month':
                return `${this.currentDate.getFullYear()}年${this.currentDate.getMonth() + 1}月`;
            case 'week':
                const weekStart = new Date(this.currentDate);
                weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
            case 'day':
                return `${this.currentDate.getMonth() + 1}月${this.currentDate.getDate()}日`;
        }
    }
    
    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    isToday(date) {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    }
    
    isHoliday(date) {
        const dateStr = this.formatDate(date);
        return this.holidays.includes(dateStr);
    }
    
    isClosed(date) {
        // Check regular closed days
        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
        const businessHours = this.settings?.businessHours?.[dayOfWeek];
        if (businessHours && !businessHours.isOpen) {
            return true;
        }
        
        // Check temporary closures
        const dateStr = this.formatDate(date);
        return this.closures.some(closure => {
            const start = new Date(closure.startDate);
            const end = new Date(closure.endDate);
            const current = new Date(dateStr);
            return current >= start && current <= end;
        });
    }
    
    getClosureReason(date) {
        const dateStr = this.formatDate(date);
        const closure = this.closures.find(c => {
            const start = new Date(c.startDate);
            const end = new Date(c.endDate);
            const current = new Date(dateStr);
            return current >= start && current <= end;
        });
        
        if (closure && closure.reason) {
            return `<div class="closure-reason">${closure.reason}</div>`;
        }
        return '';
    }
    
    generateTimeSlots() {
        const slots = [];
        const startHour = 9;
        const endHour = 20;
        
        for (let hour = startHour; hour < endHour; hour++) {
            slots.push(`${String(hour).padStart(2, '0')}:00`);
            slots.push(`${String(hour).padStart(2, '0')}:30`);
        }
        
        return slots;
    }
    
    timeToMinutes(time) {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    }
}

// Export for global use
window.AppointmentCalendar = AppointmentCalendar;