const { v4: uuidv4 } = require('uuid');

// In-memory storage (replace with database later)
let customers = [];

/**
 * Create a new customer
 * @param {Object} customerData - Customer data
 * @returns {Promise<Object>} Created customer
 */
const createCustomer = async (customerData) => {
  const { 
    firstName, 
    lastName, 
    email, 
    phone, 
    dateOfBirth, 
    address, 
    preferences = {},
    notes = ''
  } = customerData;

  // Check if customer already exists by email or phone
  const existingCustomer = customers.find(
    customer => 
      customer.email.toLowerCase() === email.toLowerCase() ||
      customer.phone === phone
  );
  
  if (existingCustomer) {
    throw new Error('Customer with this email or phone already exists');
  }

  const customer = {
    id: uuidv4(),
    firstName,
    lastName,
    email: email.toLowerCase(),
    phone,
    dateOfBirth,
    address: {
      street: address?.street || '',
      city: address?.city || '',
      state: address?.state || '',
      zipCode: address?.zipCode || '',
      country: address?.country || 'US'
    },
    preferences: {
      preferredStaff: preferences.preferredStaff || [],
      communicationMethod: preferences.communicationMethod || 'email',
      allergies: preferences.allergies || [],
      skinType: preferences.skinType || '',
      hairType: preferences.hairType || '',
      ...preferences
    },
    notes,
    isActive: true,
    totalVisits: 0,
    totalSpent: 0,
    lastVisit: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  customers.push(customer);
  return customer;
};

/**
 * Find customer by ID
 * @param {string} id - Customer ID
 * @returns {Promise<Object|null>} Customer object or null
 */
const findCustomerById = async (id) => {
  return customers.find(customer => customer.id === id) || null;
};

/**
 * Find customer by email
 * @param {string} email - Customer email
 * @returns {Promise<Object|null>} Customer object or null
 */
const findCustomerByEmail = async (email) => {
  return customers.find(customer => 
    customer.email.toLowerCase() === email.toLowerCase()
  ) || null;
};

/**
 * Find customer by phone
 * @param {string} phone - Customer phone
 * @returns {Promise<Object|null>} Customer object or null
 */
const findCustomerByPhone = async (phone) => {
  return customers.find(customer => customer.phone === phone) || null;
};

/**
 * Update customer
 * @param {string} id - Customer ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated customer
 */
const updateCustomer = async (id, updateData) => {
  const customerIndex = customers.findIndex(customer => customer.id === id);
  if (customerIndex === -1) {
    throw new Error('Customer not found');
  }

  // Check for duplicate email/phone if being updated
  if (updateData.email || updateData.phone) {
    const existingCustomer = customers.find(
      customer => 
        customer.id !== id && (
          (updateData.email && customer.email.toLowerCase() === updateData.email.toLowerCase()) ||
          (updateData.phone && customer.phone === updateData.phone)
        )
    );
    
    if (existingCustomer) {
      throw new Error('Another customer with this email or phone already exists');
    }
  }

  // Normalize email if provided
  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase();
  }

  // Merge nested objects properly
  const customer = customers[customerIndex];
  const updatedCustomer = {
    ...customer,
    ...updateData,
    address: updateData.address ? { ...customer.address, ...updateData.address } : customer.address,
    preferences: updateData.preferences ? { ...customer.preferences, ...updateData.preferences } : customer.preferences,
    updatedAt: new Date().toISOString()
  };

  customers[customerIndex] = updatedCustomer;
  return updatedCustomer;
};

/**
 * Delete customer (soft delete by setting isActive to false)
 * @param {string} id - Customer ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteCustomer = async (id) => {
  const customer = await findCustomerById(id);
  if (!customer) {
    throw new Error('Customer not found');
  }

  await updateCustomer(id, { isActive: false });
  return true;
};

/**
 * Get all customers with filters
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of customers
 */
const getAllCustomers = async (filters = {}) => {
  let filteredCustomers = [...customers];

  // Apply active filter
  if (filters.isActive !== undefined) {
    filteredCustomers = filteredCustomers.filter(customer => customer.isActive === filters.isActive);
  }

  // Apply search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredCustomers = filteredCustomers.filter(customer => 
      customer.firstName.toLowerCase().includes(searchTerm) ||
      customer.lastName.toLowerCase().includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm) ||
      customer.phone.includes(searchTerm)
    );
  }

  // Apply date range filter
  if (filters.startDate && filters.endDate) {
    filteredCustomers = filteredCustomers.filter(customer => {
      const createdDate = new Date(customer.createdAt);
      return createdDate >= new Date(filters.startDate) && createdDate <= new Date(filters.endDate);
    });
  }

  // Sort customers
  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder || 'desc';
  
  filteredCustomers.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Apply pagination
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  
  return filteredCustomers.slice(offset, offset + limit);
};

/**
 * Update customer visit statistics
 * @param {string} customerId - Customer ID
 * @param {number} amountSpent - Amount spent in this visit
 * @returns {Promise<Object>} Updated customer
 */
const updateCustomerVisitStats = async (customerId, amountSpent = 0) => {
  const customer = await findCustomerById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  return await updateCustomer(customerId, {
    totalVisits: customer.totalVisits + 1,
    totalSpent: customer.totalSpent + amountSpent,
    lastVisit: new Date().toISOString()
  });
};

/**
 * Get customer statistics
 * @returns {Promise<Object>} Customer statistics
 */
const getCustomerStats = async () => {
  const activeCustomers = customers.filter(customer => customer.isActive);
  
  return {
    total: customers.length,
    active: activeCustomers.length,
    inactive: customers.length - activeCustomers.length,
    newThisMonth: customers.filter(customer => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      return new Date(customer.createdAt) > oneMonthAgo;
    }).length,
    topSpenders: activeCustomers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map(customer => ({
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        totalSpent: customer.totalSpent,
        totalVisits: customer.totalVisits
      })),
    averageSpentPerCustomer: activeCustomers.length > 0 
      ? activeCustomers.reduce((sum, customer) => sum + customer.totalSpent, 0) / activeCustomers.length 
      : 0
  };
};

/**
 * Initialize sample customers (for development)
 * @returns {Promise<void>}
 */
const initializeSampleCustomers = async () => {
  if (customers.length === 0) {
    const sampleCustomers = [
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@email.com',
        phone: '+1234567890',
        dateOfBirth: '1990-05-15',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001'
        },
        preferences: {
          communicationMethod: 'email',
          preferredStaff: [],
          skinType: 'combination'
        },
        notes: 'Prefers natural products'
      },
      {
        firstName: 'Emma',
        lastName: 'Davis',
        email: 'emma.davis@email.com',
        phone: '+1234567891',
        dateOfBirth: '1985-03-22',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90210'
        },
        preferences: {
          communicationMethod: 'sms',
          allergies: ['nuts'],
          hairType: 'curly'
        }
      }
    ];

    try {
      for (const customerData of sampleCustomers) {
        await createCustomer(customerData);
      }
      console.log('✅ Sample customers created');
    } catch (error) {
      console.error('❌ Error creating sample customers:', error.message);
    }
  }
};

module.exports = {
  createCustomer,
  findCustomerById,
  findCustomerByEmail,
  findCustomerByPhone,
  updateCustomer,
  deleteCustomer,
  getAllCustomers,
  updateCustomerVisitStats,
  getCustomerStats,
  initializeSampleCustomers
};