// Analytics Service
class AnalyticsService {
  constructor() {
    this.events = [];
    this.metrics = new Map();
  }

  async track(event, properties = {}) {
    try {
      const trackedEvent = {
        event,
        properties,
        timestamp: new Date(),
        userId: properties.userId || null
      };

      this.events.push(trackedEvent);

      // Update metrics
      this.updateMetrics(event, properties);

      // In production, this would send to an analytics service
      if (process.env.NODE_ENV === 'production') {
        // Send to analytics provider (e.g., Mixpanel, Amplitude, etc.)
        await this.sendToProvider(trackedEvent);
      }

      return true;
    } catch (error) {
      // Don't let analytics errors break the main flow
      console.error('Analytics tracking error:', error);
      return false;
    }
  }

  updateMetrics(event, properties) {
    const key = `${event}_count`;
    const currentCount = this.metrics.get(key) || 0;
    this.metrics.set(key, currentCount + 1);

    // Track specific metrics
    switch (event) {
      case 'customer_created':
        this.incrementMetric('total_customers');
        break;
      case 'appointment_booked':
        this.incrementMetric('total_appointments');
        break;
      case 'message_sent':
        this.incrementMetric('total_messages');
        break;
    }
  }

  incrementMetric(key, value = 1) {
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
  }

  async sendToProvider(event) {
    // Placeholder for actual analytics provider integration
    // This would be implemented based on the chosen provider
    return Promise.resolve();
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  getEvents(filters = {}) {
    let filteredEvents = [...this.events];

    if (filters.event) {
      filteredEvents = filteredEvents.filter(e => e.event === filters.event);
    }

    if (filters.userId) {
      filteredEvents = filteredEvents.filter(e => e.properties.userId === filters.userId);
    }

    if (filters.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endDate);
    }

    return filteredEvents;
  }

  clearEvents() {
    this.events = [];
    this.metrics.clear();
  }
}

// Export singleton instance
module.exports = new AnalyticsService();
module.exports.AnalyticsService = AnalyticsService;