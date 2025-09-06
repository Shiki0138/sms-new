const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const Customer = require('../models/customerModel');
const Appointment = require('../models/appointmentModel');
const { asyncHandler } = require('../middleware/errorMiddleware');

const router = express.Router();

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 * @access  Private
 */
router.get('/stats', authenticateToken, asyncHandler(async (req, res) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    // Get today's appointments
    const todayAppointments = Appointment.getByDateRange(
        startOfDay.toISOString().split('T')[0],
        endOfDay.toISOString().split('T')[0]
    );
    
    // Get total customers
    const totalCustomers = Customer.getAll().length;
    
    // Get this month's appointments for revenue calculation
    const monthlyAppointments = Appointment.getByDateRange(
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
    );
    
    const monthlyRevenue = monthlyAppointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    
    // Get new customers this month
    const newCustomersThisMonth = Customer.getAll()
        .filter(customer => {
            const createdDate = new Date(customer.createdAt);
            return createdDate >= startOfMonth && createdDate <= endOfMonth;
        }).length;
    
    // Calculate completion rate
    const completedAppointments = todayAppointments.filter(apt => apt.status === 'completed').length;
    const totalTodayAppointments = todayAppointments.length;
    const completionRate = totalTodayAppointments > 0 ? (completedAppointments / totalTodayAppointments * 100).toFixed(1) : 0;
    
    res.json({
        success: true,
        data: {
            today: {
                appointments: totalTodayAppointments,
                completed: completedAppointments,
                completionRate: parseFloat(completionRate)
            },
            thisMonth: {
                revenue: monthlyRevenue,
                appointments: monthlyAppointments.length,
                newCustomers: newCustomersThisMonth
            },
            totals: {
                customers: totalCustomers,
                staff: 4, // Hardcoded for light plan
                services: 8 // Hardcoded for light plan
            }
        }
    });
}));

/**
 * @desc    Get recent activity
 * @route   GET /api/dashboard/activity
 * @access  Private
 */
router.get('/activity', authenticateToken, asyncHandler(async (req, res) => {
    // Get recent appointments (last 5)
    const recentAppointments = Appointment.getAll()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(appointment => ({
            id: appointment.id,
            customerName: appointment.customerName,
            serviceName: appointment.serviceName,
            status: appointment.status,
            scheduledFor: appointment.scheduledFor,
            totalAmount: appointment.totalAmount
        }));
    
    // Get recent customers (last 5)
    const recentCustomers = Customer.getAll()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(customer => ({
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            totalVisits: customer.totalVisits,
            createdAt: customer.createdAt
        }));
    
    res.json({
        success: true,
        data: {
            recentAppointments,
            recentCustomers
        }
    });
}));

/**
 * @desc    Get revenue analytics
 * @route   GET /api/dashboard/revenue
 * @access  Private
 */
router.get('/revenue', authenticateToken, asyncHandler(async (req, res) => {
    const { period = 'month' } = req.query;
    const today = new Date();
    
    let startDate, endDate;
    
    if (period === 'week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDate = startOfWeek;
        endDate = new Date();
    } else {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    }
    
    const appointments = Appointment.getByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
    );
    
    const completedAppointments = appointments.filter(apt => apt.status === 'completed');
    
    const revenue = {
        total: completedAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0),
        average: completedAppointments.length > 0 
            ? (completedAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0) / completedAppointments.length).toFixed(2)
            : 0,
        appointments: completedAppointments.length,
        period
    };
    
    res.json({
        success: true,
        data: revenue
    });
}));

/**
 * @desc    Get upcoming appointments for today
 * @route   GET /api/dashboard/upcoming
 * @access  Private
 */
router.get('/upcoming', authenticateToken, asyncHandler(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    const upcomingAppointments = Appointment.getByDate(today)
        .filter(appointment => {
            const appointmentTime = new Date(`${appointment.appointmentDate}T${appointment.startTime}`);
            return appointmentTime > now && (appointment.status === 'scheduled' || appointment.status === 'confirmed');
        })
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .slice(0, 10)
        .map(appointment => ({
            id: appointment.id,
            customerName: appointment.customerName,
            serviceName: appointment.serviceName,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: appointment.status,
            totalAmount: appointment.totalAmount
        }));
    
    res.json({
        success: true,
        data: upcomingAppointments
    });
}));

module.exports = router;