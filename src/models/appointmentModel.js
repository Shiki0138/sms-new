const { v4: uuidv4 } = require('uuid');

// In-memory storage (replace with database later)
let appointments = [];
let services = [];
let staff = [];

/**
 * Initialize default services and staff
 */
const initializeDefaults = () => {
  if (services.length === 0) {
    services.push(
      {
        id: uuidv4(),
        name: 'Haircut & Style',
        duration: 60,
        price: 65.00,
        category: 'Hair',
        description: 'Professional haircut with wash and styling'
      },
      {
        id: uuidv4(),
        name: 'Hair Color',
        duration: 120,
        price: 150.00,
        category: 'Hair',
        description: 'Full hair coloring service'
      },
      {
        id: uuidv4(),
        name: 'Facial Treatment',
        duration: 75,
        price: 85.00,
        category: 'Skincare',
        description: 'Deep cleansing facial with moisturizing treatment'
      },
      {
        id: uuidv4(),
        name: 'Manicure',
        duration: 45,
        price: 35.00,
        category: 'Nails',
        description: 'Classic manicure with polish'
      },
      {
        id: uuidv4(),
        name: 'Pedicure',
        duration: 60,
        price: 45.00,
        category: 'Nails',
        description: 'Relaxing pedicure with polish'
      }
    );
  }

  if (staff.length === 0) {
    staff.push(
      {
        id: uuidv4(),
        name: 'Sarah Martinez',
        specialties: ['Hair', 'Skincare'],
        workingHours: {
          monday: { start: '09:00', end: '17:00' },
          tuesday: { start: '09:00', end: '17:00' },
          wednesday: { start: '09:00', end: '17:00' },
          thursday: { start: '09:00', end: '17:00' },
          friday: { start: '09:00', end: '17:00' },
          saturday: { start: '10:00', end: '16:00' },
          sunday: null
        },
        isActive: true
      },
      {
        id: uuidv4(),
        name: 'Jessica Chen',
        specialties: ['Nails', 'Skincare'],
        workingHours: {
          monday: { start: '10:00', end: '18:00' },
          tuesday: { start: '10:00', end: '18:00' },
          wednesday: { start: '10:00', end: '18:00' },
          thursday: { start: '10:00', end: '18:00' },
          friday: { start: '10:00', end: '18:00' },
          saturday: { start: '09:00', end: '15:00' },
          sunday: null
        },
        isActive: true
      },
      {
        id: uuidv4(),
        name: 'Michael Johnson',
        specialties: ['Hair'],
        workingHours: {
          monday: { start: '08:00', end: '16:00' },
          tuesday: { start: '08:00', end: '16:00' },
          wednesday: { start: '08:00', end: '16:00' },
          thursday: { start: '08:00', end: '16:00' },
          friday: { start: '08:00', end: '16:00' },
          saturday: null,
          sunday: null
        },
        isActive: true
      }
    );
  }
};

/**
 * Create a new appointment
 * @param {Object} appointmentData - Appointment data
 * @returns {Promise<Object>} Created appointment
 */
const createAppointment = async (appointmentData) => {
  const {
    customerId,
    staffId,
    serviceIds,
    startTime,
    notes = '',
    status = 'scheduled'
  } = appointmentData;

  // Calculate total duration and price
  const selectedServices = services.filter(service => serviceIds.includes(service.id));
  const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
  
  // Calculate end time
  const startDateTime = new Date(startTime);
  const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);

  // Check for conflicts
  const conflict = await checkAppointmentConflict(staffId, startDateTime, endDateTime);
  if (conflict) {
    throw new Error(`Appointment conflict detected. Staff member is busy from ${conflict.startTime} to ${conflict.endTime}`);
  }

  const appointment = {
    id: uuidv4(),
    customerId,
    staffId,
    serviceIds,
    services: selectedServices,
    startTime: startDateTime.toISOString(),
    endTime: endDateTime.toISOString(),
    duration: totalDuration,
    totalPrice,
    status, // scheduled, confirmed, in-progress, completed, cancelled, no-show
    notes,
    paymentStatus: 'pending', // pending, paid, refunded
    reminderSent: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appointments.push(appointment);
  return appointment;
};

/**
 * Check for appointment conflicts
 * @param {string} staffId - Staff member ID
 * @param {Date} startTime - Appointment start time
 * @param {Date} endTime - Appointment end time
 * @param {string} excludeAppointmentId - Appointment ID to exclude from conflict check
 * @returns {Promise<Object|null>} Conflicting appointment or null
 */
const checkAppointmentConflict = async (staffId, startTime, endTime, excludeAppointmentId = null) => {
  const existingAppointments = appointments.filter(apt => 
    apt.staffId === staffId &&
    apt.status !== 'cancelled' &&
    apt.id !== excludeAppointmentId
  );

  for (const appointment of existingAppointments) {
    const aptStart = new Date(appointment.startTime);
    const aptEnd = new Date(appointment.endTime);

    // Check for overlap
    if (
      (startTime >= aptStart && startTime < aptEnd) ||
      (endTime > aptStart && endTime <= aptEnd) ||
      (startTime <= aptStart && endTime >= aptEnd)
    ) {
      return appointment;
    }
  }

  return null;
};

/**
 * Find appointment by ID
 * @param {string} id - Appointment ID
 * @returns {Promise<Object|null>} Appointment object or null
 */
const findAppointmentById = async (id) => {
  return appointments.find(appointment => appointment.id === id) || null;
};

/**
 * Update appointment
 * @param {string} id - Appointment ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated appointment
 */
const updateAppointment = async (id, updateData) => {
  const appointmentIndex = appointments.findIndex(appointment => appointment.id === id);
  if (appointmentIndex === -1) {
    throw new Error('Appointment not found');
  }

  const appointment = appointments[appointmentIndex];
  
  // If updating time or services, recalculate duration and price
  if (updateData.startTime || updateData.serviceIds) {
    const serviceIds = updateData.serviceIds || appointment.serviceIds;
    const selectedServices = services.filter(service => serviceIds.includes(service.id));
    const totalDuration = selectedServices.reduce((sum, service) => sum + service.duration, 0);
    const totalPrice = selectedServices.reduce((sum, service) => sum + service.price, 0);
    
    if (updateData.startTime) {
      const startDateTime = new Date(updateData.startTime);
      const endDateTime = new Date(startDateTime.getTime() + totalDuration * 60000);
      
      // Check for conflicts (exclude current appointment)
      const conflict = await checkAppointmentConflict(appointment.staffId, startDateTime, endDateTime, id);
      if (conflict) {
        throw new Error(`Appointment conflict detected. Staff member is busy from ${conflict.startTime} to ${conflict.endTime}`);
      }
      
      updateData.endTime = endDateTime.toISOString();
    }
    
    updateData.services = selectedServices;
    updateData.duration = totalDuration;
    updateData.totalPrice = totalPrice;
  }

  const updatedAppointment = {
    ...appointment,
    ...updateData,
    updatedAt: new Date().toISOString()
  };

  appointments[appointmentIndex] = updatedAppointment;
  return updatedAppointment;
};

/**
 * Cancel appointment
 * @param {string} id - Appointment ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Updated appointment
 */
const cancelAppointment = async (id, reason = '') => {
  return await updateAppointment(id, {
    status: 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancellationReason: reason
  });
};

/**
 * Get appointments with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of appointments
 */
const getAppointments = async (filters = {}) => {
  let filteredAppointments = [...appointments];

  // Apply customer filter
  if (filters.customerId) {
    filteredAppointments = filteredAppointments.filter(apt => apt.customerId === filters.customerId);
  }

  // Apply staff filter
  if (filters.staffId) {
    filteredAppointments = filteredAppointments.filter(apt => apt.staffId === filters.staffId);
  }

  // Apply status filter
  if (filters.status) {
    filteredAppointments = filteredAppointments.filter(apt => apt.status === filters.status);
  }

  // Apply date range filter
  if (filters.startDate && filters.endDate) {
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    filteredAppointments = filteredAppointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startDate && aptDate <= endDate;
    });
  }

  // Apply search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredAppointments = filteredAppointments.filter(apt =>
      apt.notes.toLowerCase().includes(searchTerm) ||
      apt.services.some(service => service.name.toLowerCase().includes(searchTerm))
    );
  }

  // Sort appointments
  const sortBy = filters.sortBy || 'startTime';
  const sortOrder = filters.sortOrder || 'asc';
  
  filteredAppointments.sort((a, b) => {
    const aValue = new Date(a[sortBy]);
    const bValue = new Date(b[sortBy]);
    
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

  // Apply pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  
  return filteredAppointments.slice(offset, offset + limit);
};

/**
 * Get available time slots for a staff member on a specific date
 * @param {string} staffId - Staff member ID
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {number} duration - Required duration in minutes
 * @returns {Promise<Array>} Array of available time slots
 */
const getAvailableSlots = async (staffId, date, duration = 60) => {
  const staffMember = staff.find(s => s.id === staffId);
  if (!staffMember) {
    throw new Error('Staff member not found');
  }

  const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
  const workingHours = staffMember.workingHours[dayOfWeek];
  
  if (!workingHours) {
    return []; // Staff member doesn't work on this day
  }

  const slots = [];
  const startTime = new Date(`${date} ${workingHours.start}`);
  const endTime = new Date(`${date} ${workingHours.end}`);
  
  // Get existing appointments for this staff member on this date
  const dayAppointments = appointments.filter(apt =>
    apt.staffId === staffId &&
    apt.status !== 'cancelled' &&
    new Date(apt.startTime).toDateString() === new Date(date).toDateString()
  );

  // Generate 30-minute slots
  const slotDuration = 30; // minutes
  let currentSlot = new Date(startTime);
  
  while (currentSlot.getTime() + duration * 60000 <= endTime.getTime()) {
    const slotEnd = new Date(currentSlot.getTime() + duration * 60000);
    
    // Check if this slot conflicts with any existing appointment
    const hasConflict = dayAppointments.some(apt => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      
      return (
        (currentSlot >= aptStart && currentSlot < aptEnd) ||
        (slotEnd > aptStart && slotEnd <= aptEnd) ||
        (currentSlot <= aptStart && slotEnd >= aptEnd)
      );
    });
    
    if (!hasConflict) {
      slots.push({
        startTime: currentSlot.toISOString(),
        endTime: slotEnd.toISOString(),
        available: true
      });
    }
    
    currentSlot = new Date(currentSlot.getTime() + slotDuration * 60000);
  }
  
  return slots;
};

/**
 * Get appointment statistics
 * @returns {Promise<Object>} Appointment statistics
 */
const getAppointmentStats = async () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    total: appointments.length,
    scheduled: appointments.filter(apt => apt.status === 'scheduled').length,
    completed: appointments.filter(apt => apt.status === 'completed').length,
    cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
    today: appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= thisWeek;
    }).length,
    thisMonth: appointments.filter(apt => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= thisMonth;
    }).length,
    revenue: {
      total: appointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + apt.totalPrice, 0),
      thisMonth: appointments
        .filter(apt => {
          const aptDate = new Date(apt.startTime);
          return apt.status === 'completed' && aptDate >= thisMonth;
        })
        .reduce((sum, apt) => sum + apt.totalPrice, 0)
    }
  };
};

/**
 * Get all services
 * @returns {Promise<Array>} Array of services
 */
const getAllServices = async () => {
  return services.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get all staff members
 * @returns {Promise<Array>} Array of staff members
 */
const getAllStaff = async () => {
  return staff.filter(s => s.isActive).sort((a, b) => a.name.localeCompare(b.name));
};

// Initialize defaults
initializeDefaults();

module.exports = {
  createAppointment,
  findAppointmentById,
  updateAppointment,
  cancelAppointment,
  getAppointments,
  getAvailableSlots,
  getAppointmentStats,
  getAllServices,
  getAllStaff,
  checkAppointmentConflict
};