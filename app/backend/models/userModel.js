const { v4: uuidv4 } = require('uuid');
const { hashPassword, comparePassword } = require('../auth/bcrypt');

// In-memory storage (replace with database later)
let users = [];

/**
 * Create a new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user (without password)
 */
const createUser = async (userData) => {
  const { email, password, firstName, lastName, phone, role = 'customer' } = userData;
  
  // Check if user already exists
  const existingUser = users.find(user => user.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = {
    id: uuidv4(),
    email: email.toLowerCase(),
    password: hashedPassword,
    firstName,
    lastName,
    phone,
    role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLogin: null
  };

  users.push(user);
  
  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Find user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
const findUserByEmail = async (email) => {
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
};

/**
 * Find user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object|null>} User object (without password) or null
 */
const findUserById = async (id) => {
  const user = users.find(user => user.id === id);
  if (!user) return null;
  
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Update user
 * @param {string} id - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user (without password)
 */
const updateUser = async (id, updateData) => {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  // Handle password update
  if (updateData.password) {
    updateData.password = await hashPassword(updateData.password);
  }

  // Update user
  users[userIndex] = {
    ...users[userIndex],
    ...updateData,
    updatedAt: new Date().toISOString()
  };

  const { password, ...userWithoutPassword } = users[userIndex];
  return userWithoutPassword;
};

/**
 * Delete user
 * @param {string} id - User ID
 * @returns {Promise<boolean>} True if deleted
 */
const deleteUser = async (id) => {
  const userIndex = users.findIndex(user => user.id === id);
  if (userIndex === -1) {
    throw new Error('User not found');
  }

  users.splice(userIndex, 1);
  return true;
};

/**
 * Authenticate user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object (without password) or null
 */
const authenticateUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) return null;

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) return null;

  // Update last login
  await updateUser(user.id, { lastLogin: new Date().toISOString() });

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Get all users (admin only)
 * @param {Object} filters - Filter options
 * @returns {Promise<Array>} Array of users (without passwords)
 */
const getAllUsers = async (filters = {}) => {
  let filteredUsers = [...users];

  // Apply role filter
  if (filters.role) {
    filteredUsers = filteredUsers.filter(user => user.role === filters.role);
  }

  // Apply active filter
  if (filters.isActive !== undefined) {
    filteredUsers = filteredUsers.filter(user => user.isActive === filters.isActive);
  }

  // Apply search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredUsers = filteredUsers.filter(user => 
      user.firstName.toLowerCase().includes(searchTerm) ||
      user.lastName.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm)
    );
  }

  // Remove passwords and sort by creation date
  return filteredUsers
    .map(({ password, ...user }) => user)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50));
};

/**
 * Get user statistics
 * @returns {Promise<Object>} User statistics
 */
const getUserStats = async () => {
  return {
    total: users.length,
    active: users.filter(user => user.isActive).length,
    customers: users.filter(user => user.role === 'customer').length,
    staff: users.filter(user => user.role === 'staff').length,
    admins: users.filter(user => user.role === 'admin').length,
    recentSignups: users.filter(user => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(user.createdAt) > oneWeekAgo;
    }).length
  };
};

/**
 * Initialize default admin user (for development)
 * @returns {Promise<void>}
 */
const initializeDefaultUsers = async () => {
  if (users.length === 0) {
    try {
      await createUser({
        email: 'admin@salon.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        phone: '+1234567890',
        role: 'admin'
      });
      
      await createUser({
        email: 'staff@salon.com',
        password: 'Staff123!',
        firstName: 'Staff',
        lastName: 'Member',
        phone: '+1234567891',
        role: 'staff'
      });

      console.log('✅ Default users created');
    } catch (error) {
      console.error('❌ Error creating default users:', error.message);
    }
  }
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  updateUser,
  deleteUser,
  authenticateUser,
  getAllUsers,
  getUserStats,
  initializeDefaultUsers
};