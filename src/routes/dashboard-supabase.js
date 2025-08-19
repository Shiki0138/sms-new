const express = require('express');
const router = express.Router();
const { 
  tenantService, 
  customerService, 
  reservationService, 
  messageService,
  staffService 
} = require('../services/supabase');
const moment = require('moment');

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private
 */
router.get('/stats', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;

    // Get multiple stats in parallel
    const [
      dashboardStats,
      monthlyUsage,
      todayReservations,
      upcomingReservations
    ] = await Promise.all([
      tenantService.getDashboardStats(tenantId),
      tenantService.getUsageStats(tenantId),
      reservationService.findByDateRange(
        moment().startOf('day').toISOString(),
        moment().endOf('day').toISOString(),
        tenantId,
        { filters: { status: ['confirmed', 'completed'] } }
      ),
      reservationService.getUpcomingForReminders(tenantId, 24)
    ]);

    res.json({
      overview: {
        totalCustomers: dashboardStats.total_customers,
        activeCustomers: dashboardStats.active_customers,
        totalReservations: dashboardStats.total_reservations,
        monthlyRevenue: dashboardStats.monthly_revenue,
        totalStaff: dashboardStats.total_staff
      },
      today: {
        reservations: todayReservations.length,
        revenue: todayReservations.reduce((sum, r) => sum + (r.price || 0), 0)
      },
      upcoming: {
        next24Hours: upcomingReservations.length
      },
      usage: monthlyUsage,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

/**
 * @route   GET /api/dashboard/upcoming-appointments
 * @desc    Get upcoming appointments for dashboard
 * @access  Private
 */
router.get('/upcoming-appointments', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const reservations = await reservationService.findAll({
      tenantId: req.user.tenantId,
      filters: {
        status: ['pending', 'confirmed'],
        start_time: { operator: 'gte', value: new Date().toISOString() }
      },
      select: '*, customers(name, phone_number), staff(name), services(name)',
      orderBy: 'start_time',
      orderDirection: 'asc',
      limit: parseInt(limit)
    });

    res.json(reservations.data);
  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
  }
});

/**
 * @route   GET /api/dashboard/recent-activities
 * @desc    Get recent activities
 * @access  Private
 */
router.get('/recent-activities', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const tenantId = req.user.tenantId;

    // Get recent reservations and messages
    const [recentReservations, recentMessages] = await Promise.all([
      reservationService.findAll({
        tenantId,
        select: 'id, created_at, status, customers(name), staff(name)',
        orderBy: 'created_at',
        orderDirection: 'desc',
        limit: parseInt(limit) / 2
      }),
      messageService.findAll({
        tenantId,
        select: 'id, created_at, direction, channel_type, customers(name)',
        orderBy: 'created_at',
        orderDirection: 'desc',
        limit: parseInt(limit) / 2
      })
    ]);

    // Combine and format activities
    const activities = [];

    recentReservations.data.forEach(reservation => {
      activities.push({
        id: reservation.id,
        type: 'reservation',
        description: `New reservation for ${reservation.customers?.name || 'Unknown'}`,
        timestamp: reservation.created_at,
        status: reservation.status,
        metadata: {
          customerName: reservation.customers?.name,
          staffName: reservation.staff?.name
        }
      });
    });

    recentMessages.data.forEach(message => {
      activities.push({
        id: message.id,
        type: 'message',
        description: `${message.direction === 'sent' ? 'Sent' : 'Received'} ${message.channel_type} message ${message.direction === 'sent' ? 'to' : 'from'} ${message.customers?.name || 'Unknown'}`,
        timestamp: message.created_at,
        metadata: {
          customerName: message.customers?.name,
          channel: message.channel_type,
          direction: message.direction
        }
      });
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(activities.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

/**
 * @route   GET /api/dashboard/revenue-chart
 * @desc    Get revenue data for charts
 * @access  Private
 */
router.get('/revenue-chart', async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const tenantId = req.user.tenantId;

    let startDate, groupBy;

    switch (period) {
      case 'week':
        startDate = moment().subtract(7, 'days').startOf('day');
        groupBy = 'day';
        break;
      case 'month':
        startDate = moment().subtract(30, 'days').startOf('day');
        groupBy = 'day';
        break;
      case 'year':
        startDate = moment().subtract(12, 'months').startOf('month');
        groupBy = 'month';
        break;
      default:
        startDate = moment().subtract(7, 'days').startOf('day');
        groupBy = 'day';
    }

    // Get completed reservations with revenue
    const reservations = await reservationService.findAll({
      tenantId,
      filters: {
        status: 'completed',
        start_time: { operator: 'gte', value: startDate.toISOString() }
      },
      select: 'start_time, price'
    });

    // Group revenue by period
    const revenueData = {};
    const labels = [];

    if (groupBy === 'day') {
      for (let i = 0; i <= moment().diff(startDate, 'days'); i++) {
        const date = startDate.clone().add(i, 'days').format('YYYY-MM-DD');
        labels.push(date);
        revenueData[date] = 0;
      }
    } else {
      for (let i = 0; i <= moment().diff(startDate, 'months'); i++) {
        const month = startDate.clone().add(i, 'months').format('YYYY-MM');
        labels.push(month);
        revenueData[month] = 0;
      }
    }

    // Calculate revenue
    reservations.data.forEach(reservation => {
      const key = groupBy === 'day' 
        ? moment(reservation.start_time).format('YYYY-MM-DD')
        : moment(reservation.start_time).format('YYYY-MM');
      
      if (revenueData[key] !== undefined) {
        revenueData[key] += reservation.price || 0;
      }
    });

    res.json({
      labels,
      datasets: [{
        label: 'Revenue',
        data: labels.map(label => revenueData[label]),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)'
      }]
    });
  } catch (error) {
    console.error('Get revenue chart error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

/**
 * @route   GET /api/dashboard/popular-services
 * @desc    Get popular services
 * @access  Private
 */
router.get('/popular-services', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const popularServices = await serviceService.getPopularServices(
      req.user.tenantId, 
      parseInt(limit)
    );

    res.json(popularServices);
  } catch (error) {
    console.error('Get popular services error:', error);
    res.status(500).json({ error: 'Failed to fetch popular services' });
  }
});

/**
 * @route   GET /api/dashboard/staff-performance
 * @desc    Get staff performance summary
 * @access  Private
 */
router.get('/staff-performance', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const tenantId = req.user.tenantId;

    // Get all active staff
    const staff = await staffService.findActiveByTenant(tenantId);

    // Get performance stats for each staff member
    const performanceData = await Promise.all(
      staff.data.map(async (member) => {
        const stats = await staffService.getPerformanceStats(member.id, period);
        return {
          id: member.id,
          name: member.name,
          ...stats
        };
      })
    );

    // Sort by total revenue
    performanceData.sort((a, b) => b.total_revenue - a.total_revenue);

    res.json(performanceData);
  } catch (error) {
    console.error('Get staff performance error:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});

/**
 * @route   GET /api/dashboard/notifications
 * @desc    Get dashboard notifications/alerts
 * @access  Private
 */
router.get('/notifications', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const notifications = [];

    // Check for unread messages
    const unreadCount = await messageService.getUnreadCount(tenantId);
    if (unreadCount > 0) {
      notifications.push({
        type: 'info',
        title: 'Unread Messages',
        message: `You have ${unreadCount} unread message${unreadCount > 1 ? 's' : ''}`,
        action: '/messages',
        icon: 'message'
      });
    }

    // Check for today's appointments without reminders
    const todayReservations = await reservationService.findByDateRange(
      moment().startOf('day').toISOString(),
      moment().endOf('day').toISOString(),
      tenantId,
      { 
        filters: { 
          status: 'confirmed',
          reminder_sent: false 
        } 
      }
    );

    if (todayReservations.length > 0) {
      notifications.push({
        type: 'warning',
        title: 'Pending Reminders',
        message: `${todayReservations.length} appointment${todayReservations.length > 1 ? 's' : ''} today without reminders`,
        action: '/reservations',
        icon: 'bell'
      });
    }

    // Check plan usage limits
    const planLimits = await tenantService.checkPlanLimits(tenantId, 'customers');
    if (planLimits.limit && planLimits.current >= planLimits.limit * 0.8) {
      notifications.push({
        type: 'warning',
        title: 'Plan Limit Warning',
        message: `You've used ${planLimits.current} of ${planLimits.limit} customer slots (${Math.round(planLimits.current / planLimits.limit * 100)}%)`,
        action: '/settings/billing',
        icon: 'alert'
      });
    }

    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * @route   GET /api/dashboard/quick-stats
 * @desc    Get quick stats for dashboard widgets
 * @access  Private
 */
router.get('/quick-stats', async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const today = moment();

    // Get various quick stats
    const [
      newCustomersThisMonth,
      completedReservationsToday,
      monthlyMessages,
      activeStaff
    ] = await Promise.all([
      customerService.count({
        created_at: { 
          operator: 'gte', 
          value: today.startOf('month').toISOString() 
        }
      }, { tenantId }),
      reservationService.count({
        status: 'completed',
        start_time: { 
          operator: 'gte', 
          value: today.startOf('day').toISOString() 
        }
      }, { tenantId }),
      messageService.count({
        created_at: { 
          operator: 'gte', 
          value: today.startOf('month').toISOString() 
        }
      }, { tenantId }),
      staffService.count({ is_active: true }, { tenantId })
    ]);

    res.json({
      newCustomersThisMonth,
      completedReservationsToday,
      monthlyMessages,
      activeStaff
    });
  } catch (error) {
    console.error('Get quick stats error:', error);
    res.status(500).json({ error: 'Failed to fetch quick stats' });
  }
});

module.exports = router;