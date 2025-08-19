/**
 * SMS Analytics Model for Campaign Performance Tracking
 */
class SmsAnalytics {
  constructor(data = {}) {
    this.id = data.id;
    this.campaignId = data.campaignId;
    this.userId = data.userId;
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.metrics = data.metrics || {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalOptedOut: 0,
      totalClicked: 0,
      deliveryRate: 0,
      failureRate: 0,
      clickRate: 0,
      optOutRate: 0
    };
    this.cost = data.cost || 0;
    this.revenue = data.revenue || 0;
    this.roi = data.roi || 0;
    this.avgDeliveryTime = data.avgDeliveryTime || 0; // seconds
    this.peakSendHour = data.peakSendHour || null;
    this.deviceBreakdown = data.deviceBreakdown || {};
    this.carrierBreakdown = data.carrierBreakdown || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Calculate metrics from recipients data
  calculateMetrics(recipients) {
    const total = recipients.length;
    if (total === 0) return;

    const sent = recipients.filter(r => ['sent', 'delivered', 'clicked'].includes(r.status)).length;
    const delivered = recipients.filter(r => r.status === 'delivered' || r.status === 'clicked').length;
    const failed = recipients.filter(r => r.status === 'failed').length;
    const optedOut = recipients.filter(r => r.status === 'opted_out').length;
    const clicked = recipients.filter(r => r.hasClicked && r.hasClicked()).length;

    this.metrics = {
      totalSent: sent,
      totalDelivered: delivered,
      totalFailed: failed,
      totalOptedOut: optedOut,
      totalClicked: clicked,
      deliveryRate: sent > 0 ? (delivered / sent * 100) : 0,
      failureRate: sent > 0 ? (failed / sent * 100) : 0,
      clickRate: delivered > 0 ? (clicked / delivered * 100) : 0,
      optOutRate: sent > 0 ? (optedOut / sent * 100) : 0
    };

    // Calculate average delivery time
    const deliveredRecipients = recipients.filter(r => r.sentAt && r.deliveredAt);
    if (deliveredRecipients.length > 0) {
      const totalDeliveryTime = deliveredRecipients.reduce((sum, r) => {
        return sum + (new Date(r.deliveredAt) - new Date(r.sentAt));
      }, 0);
      this.avgDeliveryTime = Math.round(totalDeliveryTime / deliveredRecipients.length / 1000); // Convert to seconds
    }\n\n    this.updatedAt = new Date();\n  }\n\n  // Calculate ROI if revenue data is available\n  calculateROI(revenue = 0, cost = null) {\n    if (revenue > 0) {\n      this.revenue = revenue;\n    }\n\n    if (cost !== null) {\n      this.cost = cost;\n    }\n\n    if (this.cost > 0) {\n      this.roi = ((this.revenue - this.cost) / this.cost * 100);\n    }\n\n    this.updatedAt = new Date();\n  }\n\n  // Get performance summary\n  getPerformanceSummary() {\n    const { metrics } = this;\n    \n    let performance = 'poor';\n    if (metrics.deliveryRate >= 95 && metrics.failureRate <= 5) {\n      performance = 'excellent';\n    } else if (metrics.deliveryRate >= 90 && metrics.failureRate <= 10) {\n      performance = 'good';\n    } else if (metrics.deliveryRate >= 80 && metrics.failureRate <= 20) {\n      performance = 'fair';\n    }\n\n    return {\n      performance,\n      deliveryRate: Math.round(metrics.deliveryRate * 100) / 100,\n      failureRate: Math.round(metrics.failureRate * 100) / 100,\n      clickRate: Math.round(metrics.clickRate * 100) / 100,\n      avgDeliveryTime: this.avgDeliveryTime,\n      roi: Math.round(this.roi * 100) / 100\n    };\n  }\n\n  // Generate insights and recommendations\n  generateInsights() {\n    const insights = [];\n    const { metrics } = this;\n\n    if (metrics.failureRate > 10) {\n      insights.push({\n        type: 'warning',\n        message: 'High failure rate detected. Check phone number formatting and carrier restrictions.'\n      });\n    }\n\n    if (metrics.optOutRate > 5) {\n      insights.push({\n        type: 'warning',\n        message: 'High opt-out rate. Consider reviewing message content and frequency.'\n      });\n    }\n\n    if (metrics.clickRate < 2 && metrics.totalClicked > 0) {\n      insights.push({\n        type: 'info',\n        message: 'Low click-through rate. Consider adding clearer call-to-action.'\n      });\n    }\n\n    if (metrics.deliveryRate >= 95) {\n      insights.push({\n        type: 'success',\n        message: 'Excellent delivery rate! Your SMS setup is working well.'\n      });\n    }\n\n    if (this.avgDeliveryTime > 300) { // 5 minutes\n      insights.push({\n        type: 'info',\n        message: 'Delivery times are slower than average. Consider sending during off-peak hours.'\n      });\n    }\n\n    return insights;\n  }\n\n  toJSON() {\n    return {\n      id: this.id,\n      campaignId: this.campaignId,\n      userId: this.userId,\n      date: this.date,\n      metrics: this.metrics,\n      cost: this.cost,\n      revenue: this.revenue,\n      roi: this.roi,\n      avgDeliveryTime: this.avgDeliveryTime,\n      peakSendHour: this.peakSendHour,\n      deviceBreakdown: this.deviceBreakdown,\n      carrierBreakdown: this.carrierBreakdown,\n      createdAt: this.createdAt,\n      updatedAt: this.updatedAt\n    };\n  }\n\n  static fromJSON(data) {\n    return new SmsAnalytics(data);\n  }\n}\n\nmodule.exports = SmsAnalytics;