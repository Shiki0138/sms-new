/**
 * 予約管理システム - appointments.js
 * 美容室VOTAN テーマ対応
 */

// グローバル状態管理
const AppointmentManager = {
    appointments: [],
    currentView: 'list',
    currentFilter: 'all',
    calendar: null,
    
    // 初期化
    init() {
        console.log('Appointment Manager initialized');
        this.loadAppointments();
        this.initializeEventListeners();
        this.initializeCalendar();
    },

    // イベントリスナーの初期化
    initializeEventListeners() {
        // ビュー切り替えボタン
        const viewBtns = document.querySelectorAll('.view-toggle-btn');
        viewBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // フィルターボタン
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyFilter(e.target.dataset.filter);
            });
        });

        // モーダル関連
        document.addEventListener('click', (e) => {
            // モーダル外クリックで閉じる
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });

        // ESCキーでモーダルを閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="display: block"]');
                if (openModal) {
                    this.closeModal(openModal);
                }
            }
        });

        // フォーム送信
        const newAppointmentForm = document.getElementById('newAppointmentForm');
        if (newAppointmentForm) {
            newAppointmentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleNewAppointmentSubmit(e.target);
            });
        }

        // リアルタイム検索
        const searchInput = document.getElementById('appointmentSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchAppointments(e.target.value);
                }, 300);
            });
        }
    },

    // 予約データの読み込み
    async loadAppointments() {
        try {
            const response = await fetch('/api/appointments');
            if (response.ok) {
                const data = await response.json();
                this.appointments = data.appointments || [];
                this.displayAppointments();
                this.updateCalendar();
            } else {
                this.showError('予約データの読み込みに失敗しました');
            }
        } catch (error) {
            console.error('Failed to load appointments:', error);
            this.appointments = this.getMockAppointments();
            this.displayAppointments();
        }
    },

    // モック予約データ
    getMockAppointments() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        return [
            {
                id: 1,
                customerName: '田中 花子',
                customerPhone: '090-1234-5678',
                appointmentDate: today.toISOString().split('T')[0],
                startTime: '10:00',
                endTime: '11:30',
                service: 'カット&カラー',
                services: [
                    { name: 'カット', price: 4000, duration: 60 },
                    { name: 'カラー', price: 6000, duration: 90 }
                ],
                status: 'confirmed',
                stylist: '佐藤スタイリスト',
                notes: 'いつものスタイルで',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                customerName: '山田 美咲',
                customerPhone: '090-2345-6789',
                appointmentDate: today.toISOString().split('T')[0],
                startTime: '14:00',
                endTime: '15:00',
                service: 'カット',
                services: [
                    { name: 'カット', price: 4000, duration: 60 }
                ],
                status: 'pending',
                stylist: '田中スタイリスト',
                notes: '短めでお願いします',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                customerName: '佐藤 良子',
                customerPhone: '090-3456-7890',
                appointmentDate: tomorrow.toISOString().split('T')[0],
                startTime: '11:00',
                endTime: '13:00',
                service: 'パーマ',
                services: [
                    { name: 'パーマ', price: 8500, duration: 120 }
                ],
                status: 'confirmed',
                stylist: '佐藤スタイリスト',
                notes: 'ゆるふわパーマ希望',
                createdAt: new Date().toISOString()
            }
        ];
    },

    // 予約表示
    displayAppointments(appointmentsToShow = null) {
        const appointments = appointmentsToShow || this.appointments;
        const grid = document.getElementById('listView');
        
        if (!grid) return;

        if (appointments.length === 0) {
            grid.innerHTML = `
                <div class="no-appointments">
                    <div style="text-align: center; padding: 60px 20px; color: var(--text-medium);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                        <h3 style="margin: 0 0 0.5rem; color: var(--text-dark);">予約がありません</h3>
                        <p style="margin: 0;">新しい予約を追加してください</p>
                    </div>
                </div>
            `;
            return;
        }

        const appointmentsHTML = appointments.map(appointment => this.createAppointmentCard(appointment)).join('');
        grid.innerHTML = appointmentsHTML;

        // アニメーション効果
        this.animateCards();
    },

    // 予約カードの作成
    createAppointmentCard(appointment) {
        const totalPrice = appointment.services ? 
            appointment.services.reduce((sum, service) => sum + service.price, 0) : 0;
        
        const statusClass = this.getStatusClass(appointment.status);
        const statusText = this.getStatusText(appointment.status);

        return `
            <div class="appointment-card ${statusClass}" 
                 data-appointment-id="${appointment.id}" 
                 data-status="${appointment.status}" 
                 data-date="${appointment.appointmentDate}"
                 style="opacity: 0; transform: translateY(20px);">
                <div class="appointment-header">
                    <div class="customer-info">
                        <h3 style="margin: 0; color: var(--votan-dark); font-size: 1.3rem; font-weight: 700;">
                            ${appointment.customerName}
                        </h3>
                        <p style="margin: 5px 0; color: var(--text-medium); font-size: 0.95rem;">
                            📞 ${appointment.customerPhone || 'N/A'}
                        </p>
                        ${appointment.stylist ? `
                            <p style="margin: 5px 0; color: var(--text-medium); font-size: 0.9rem;">
                                💄 ${appointment.stylist}
                            </p>
                        ` : ''}
                    </div>
                    <div class="appointment-status-badge">
                        <span class="appointment-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="appointment-details">
                    <div class="detail-item">
                        <span class="detail-icon">📅</span>
                        <span class="detail-text">${this.formatDate(appointment.appointmentDate)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">🕐</span>
                        <span class="detail-text">${appointment.startTime} - ${appointment.endTime}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icon">✂️</span>
                        <span class="detail-text">${appointment.service}</span>
                    </div>
                    ${totalPrice > 0 ? `
                        <div class="detail-item">
                            <span class="detail-icon">💰</span>
                            <span class="detail-text">¥${totalPrice.toLocaleString()}</span>
                        </div>
                    ` : ''}
                </div>

                ${appointment.notes ? `
                    <div class="appointment-notes">
                        <span class="notes-icon">💬</span>
                        <span>${appointment.notes}</span>
                    </div>
                ` : ''}
                
                <div class="appointment-actions">
                    <button class="btn btn-sm btn-primary" onclick="AppointmentManager.editAppointment(${appointment.id})">
                        編集
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="AppointmentManager.viewAppointmentDetails(${appointment.id})">
                        詳細
                    </button>
                    ${appointment.status !== 'cancelled' ? `
                        <button class="btn btn-sm btn-danger" onclick="AppointmentManager.cancelAppointment(${appointment.id})">
                            キャンセル
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // カードのアニメーション
    animateCards() {
        const cards = document.querySelectorAll('.appointment-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            }, index * 100);
        });
    },

    // ビューの切り替え
    switchView(viewType) {
        const listView = document.getElementById('listView');
        const calendarView = document.getElementById('calendarView');
        const listFilters = document.getElementById('listFilters');
        const listViewBtn = document.getElementById('listViewBtn');
        const calendarViewBtn = document.getElementById('calendarViewBtn');

        // ボタンの状態更新
        document.querySelectorAll('.view-toggle-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (viewType === 'calendar') {
            calendarViewBtn?.classList.add('active');
            this.showCalendarView(listView, calendarView, listFilters);
        } else {
            listViewBtn?.classList.add('active');
            this.showListView(listView, calendarView, listFilters);
        }

        this.currentView = viewType;
    },

    // リストビューの表示
    showListView(listView, calendarView, listFilters) {
        if (calendarView) calendarView.style.display = 'none';
        if (listView) listView.style.display = 'block';
        if (listFilters) listFilters.style.display = 'flex';
        
        // アニメーション効果
        if (listView) {
            listView.style.opacity = '0';
            setTimeout(() => {
                listView.style.opacity = '1';
                listView.style.transition = 'opacity 0.3s ease';
            }, 50);
        }
    },

    // カレンダービューの表示
    showCalendarView(listView, calendarView, listFilters) {
        if (listView) listView.style.display = 'none';
        if (listFilters) listFilters.style.display = 'none';
        if (calendarView) calendarView.style.display = 'block';
        
        // カレンダーの初期化・更新
        this.initializeCalendar();
        
        // アニメーション効果
        if (calendarView) {
            calendarView.style.opacity = '0';
            setTimeout(() => {
                calendarView.style.opacity = '1';
                calendarView.style.transition = 'opacity 0.3s ease';
            }, 50);
        }
    },

    // フィルターの適用
    applyFilter(filter) {
        // アクティブ状態の更新
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`)?.classList.add('active');

        const filtered = this.filterAppointments(filter);
        this.displayAppointments(filtered);
        this.currentFilter = filter;
    },

    // 予約のフィルタリング
    filterAppointments(filter) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const weekStart = this.getWeekStart();
        const weekEnd = this.getWeekEnd();

        return this.appointments.filter(appointment => {
            switch(filter) {
                case 'all':
                    return true;
                case 'today':
                    return appointment.appointmentDate === today;
                case 'tomorrow':
                    return appointment.appointmentDate === tomorrow;
                case 'this-week':
                    return appointment.appointmentDate >= weekStart && appointment.appointmentDate <= weekEnd;
                case 'confirmed':
                    return appointment.status === 'confirmed' || appointment.status === 'scheduled';
                case 'pending':
                    return appointment.status === 'pending';
                default:
                    return true;
            }
        });
    },

    // 検索機能
    searchAppointments(query) {
        if (!query.trim()) {
            this.displayAppointments();
            return;
        }

        const filtered = this.appointments.filter(appointment => {
            return appointment.customerName.toLowerCase().includes(query.toLowerCase()) ||
                   appointment.service.toLowerCase().includes(query.toLowerCase()) ||
                   (appointment.stylist && appointment.stylist.toLowerCase().includes(query.toLowerCase())) ||
                   (appointment.notes && appointment.notes.toLowerCase().includes(query.toLowerCase()));
        });

        this.displayAppointments(filtered);
    },

    // カレンダーの初期化
    initializeCalendar() {
        const calendarContainer = document.getElementById('appointmentCalendar');
        if (!calendarContainer || this.calendar) return;

        try {
            if (typeof AppointmentCalendar !== 'undefined') {
                this.calendar = new AppointmentCalendar('appointmentCalendar', {
                    appointments: this.appointments,
                    onDateClick: (date) => this.handleCalendarDateClick(date),
                    onAppointmentClick: (appointment) => this.viewAppointmentDetails(appointment.id)
                });
            } else {
                // カレンダーライブラリが無い場合の簡易表示
                calendarContainer.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: var(--text-medium);">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">📅</div>
                        <h3 style="color: var(--text-dark);">カレンダー表示</h3>
                        <p>カレンダーライブラリを読み込み中...</p>
                        <button class="btn btn-primary" onclick="AppointmentManager.switchView('list')" style="margin-top: 1rem;">
                            リスト表示に戻る
                        </button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Calendar initialization failed:', error);
        }
    },

    // カレンダーの更新
    updateCalendar() {
        if (this.calendar && typeof this.calendar.updateAppointments === 'function') {
            this.calendar.updateAppointments(this.appointments);
        }
    },

    // カレンダー日付クリック処理
    handleCalendarDateClick(date) {
        const dateStr = date.toISOString().split('T')[0];
        
        // 新規予約モーダルを開く
        this.openNewAppointmentModal();
        
        // 日付を設定
        const appointmentDate = document.getElementById('appointmentDate');
        if (appointmentDate) {
            appointmentDate.value = dateStr;
        }

        // 時間が設定されている場合は時刻も設定
        if (date.getHours() > 0) {
            const startTime = document.getElementById('startTime');
            if (startTime) {
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                startTime.value = `${hours}:${minutes}`;
            }
        }
    },

    // 新規予約モーダルを開く
    openNewAppointmentModal() {
        const modal = document.getElementById('newAppointmentModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // デフォルト値の設定
            const appointmentDate = document.getElementById('appointmentDate');
            if (appointmentDate && !appointmentDate.value) {
                appointmentDate.value = new Date().toISOString().split('T')[0];
            }

            // フォーカスを最初の入力フィールドに
            const firstInput = modal.querySelector('input, select');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    },

    // モーダルを閉じる
    closeModal(modal) {
        if (typeof modal === 'string') {
            modal = document.getElementById(modal);
        }
        
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);

            // フォームをリセット
            const form = modal.querySelector('form');
            if (form) {
                form.reset();
            }
        }
    },

    // 新規予約フォーム送信
    async handleNewAppointmentSubmit(form) {
        try {
            const formData = new FormData(form);
            const appointmentData = {
                customerName: formData.get('customerName'),
                customerPhone: formData.get('customerPhone') || '',
                appointmentDate: formData.get('appointmentDate'),
                startTime: formData.get('startTime'),
                endTime: formData.get('endTime'),
                service: formData.get('service'),
                notes: formData.get('notes') || '',
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // バリデーション
            if (!this.validateAppointmentData(appointmentData)) {
                return;
            }

            // サーバーに送信
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(appointmentData)
            });

            if (response.ok) {
                const result = await response.json();
                appointmentData.id = result.id || Date.now();
                
                // ローカルデータを更新
                this.appointments.push(appointmentData);
                this.displayAppointments();
                this.updateCalendar();
                
                this.showSuccess('予約が作成されました');
                this.closeModal('newAppointmentModal');
            } else {
                this.showError('予約の作成に失敗しました');
            }
        } catch (error) {
            console.error('Failed to create appointment:', error);
            this.showError('予約の作成中にエラーが発生しました');
        }
    },

    // 予約データのバリデーション
    validateAppointmentData(data) {
        if (!data.customerName.trim()) {
            this.showError('顧客名は必須です');
            return false;
        }

        if (!data.appointmentDate) {
            this.showError('予約日は必須です');
            return false;
        }

        if (!data.startTime || !data.endTime) {
            this.showError('開始時間と終了時間は必須です');
            return false;
        }

        if (data.startTime >= data.endTime) {
            this.showError('終了時間は開始時間より後に設定してください');
            return false;
        }

        if (!data.service) {
            this.showError('サービスを選択してください');
            return false;
        }

        return true;
    },

    // 予約の編集
    editAppointment(id) {
        const appointment = this.appointments.find(a => a.id === id);
        if (appointment) {
            // TODO: 編集モーダルの実装
            this.showInfo(`予約編集機能 (ID: ${id}) - 実装予定`);
        }
    },

    // 予約詳細の表示
    viewAppointmentDetails(id) {
        const appointment = this.appointments.find(a => a.id === id);
        if (appointment) {
            // TODO: 詳細モーダルの実装
            this.showInfo(`予約詳細表示機能 (ID: ${id}) - 実装予定`);
        }
    },

    // 予約のキャンセル
    async cancelAppointment(id) {
        if (!confirm('この予約をキャンセルしますか？')) {
            return;
        }

        try {
            const response = await fetch(`/api/appointments/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: 'cancelled' })
            });

            if (response.ok) {
                const appointment = this.appointments.find(a => a.id === id);
                if (appointment) {
                    appointment.status = 'cancelled';
                    this.displayAppointments();
                    this.updateCalendar();
                    this.showSuccess('予約をキャンセルしました');
                }
            } else {
                this.showError('予約のキャンセルに失敗しました');
            }
        } catch (error) {
            console.error('Failed to cancel appointment:', error);
            this.showError('予約のキャンセル中にエラーが発生しました');
        }
    },

    // ユーティリティ関数
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short'
        });
    },

    getWeekStart() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day;
        return new Date(now.setDate(diff)).toISOString().split('T')[0];
    },

    getWeekEnd() {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + 6;
        return new Date(now.setDate(diff)).toISOString().split('T')[0];
    },

    getStatusClass(status) {
        const statusMap = {
            'confirmed': 'status-confirmed',
            'scheduled': 'status-confirmed',
            'pending': 'status-pending',
            'cancelled': 'status-cancelled',
            'completed': 'status-completed'
        };
        return statusMap[status] || 'status-pending';
    },

    getStatusText(status) {
        const statusMap = {
            'confirmed': '確定',
            'scheduled': '予約済み',
            'pending': '保留中',
            'cancelled': 'キャンセル',
            'completed': '完了'
        };
        return statusMap[status] || status;
    },

    // 通知表示
    showSuccess(message) {
        this.showNotification(message, 'success');
    },

    showError(message) {
        this.showNotification(message, 'error');
    },

    showInfo(message) {
        this.showNotification(message, 'info');
    },

    showNotification(message, type = 'info') {
        // 既存の通知を削除
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // スタイルを設定
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            padding: 16px 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            border-left: 4px solid ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : 'var(--info)'};
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 400px;
        `;

        document.body.appendChild(notification);

        // アニメーション
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自動削除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
};

// グローバル関数（HTMLから呼び出し用）
function openNewAppointmentModal() {
    AppointmentManager.openNewAppointmentModal();
}

function closeNewAppointmentModal() {
    AppointmentManager.closeModal('newAppointmentModal');
}

function switchView(viewType) {
    AppointmentManager.switchView(viewType);
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    AppointmentManager.init();
});

// エクスポート
window.AppointmentManager = AppointmentManager;