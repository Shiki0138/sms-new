const jwt = require('jsonwebtoken');
const customerData = require('./data/customers');

// Simple auth middleware
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const user = verifyToken(req);

    // Handle search query
    const { query } = req.query;
    
    switch (req.method) {
      case 'GET':
        // Handle search if query parameter exists
        if (query) {
          const results = customerData.searchCustomers(query);
          return res.json({
            customers: results,
            total: results.length,
            message: 'Search results retrieved successfully'
          });
        }
        
        // Return all active customers
        const allCustomers = customerData.getAllCustomers();
        res.json({
          customers: allCustomers,
          total: allCustomers.length,
          message: 'All customers retrieved successfully'
        });
        break;

      case 'POST':
        // Create new customer
        const newCustomer = customerData.createCustomer(req.body);
        res.status(201).json({
          message: 'Customer created successfully',
          customer: newCustomer
        });
        break;

      case 'PUT':
        // Update customer by ID (expects customerId in query params or body)
        const customerId = req.query.id || req.body.id;
        
        if (!customerId) {
          return res.status(400).json({ 
            message: 'Customer ID is required for update operation' 
          });
        }

        const updatedCustomer = customerData.updateCustomer(customerId, req.body);
        
        if (!updatedCustomer) {
          return res.status(404).json({ 
            message: 'Customer not found',
            customerId: customerId
          });
        }

        res.json({
          message: 'Customer updated successfully',
          customer: updatedCustomer
        });
        break;

      case 'DELETE':
        // Delete customer by ID (expects customerId in query params)
        const deleteCustomerId = req.query.id;
        
        if (!deleteCustomerId) {
          return res.status(400).json({ 
            message: 'Customer ID is required for delete operation' 
          });
        }

        const deletedCustomer = customerData.deleteCustomer(deleteCustomerId);
        
        if (!deletedCustomer) {
          return res.status(404).json({ 
            message: 'Customer not found',
            customerId: deleteCustomerId
          });
        }

        res.json({
          message: 'Customer deleted successfully',
          customer: deletedCustomer
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Customers API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process customers request' });
  }
}