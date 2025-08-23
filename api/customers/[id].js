const jwt = require('jsonwebtoken');
const customerData = require('../data/customers');

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    
    // Get customer ID from URL path
    const { id: customerId } = req.query;
    
    if (!customerId) {
      return res.status(400).json({ 
        message: 'Customer ID is required',
        error: 'MISSING_CUSTOMER_ID'
      });
    }

    console.log(`Looking for customer with ID: ${customerId}`);

    switch (req.method) {
      case 'GET':
        // Get individual customer
        const customer = customerData.getCustomerById(customerId);
        
        if (!customer) {
          return res.status(404).json({ 
            message: `指定された顧客が見つかりません (ID: ${customerId})`,
            customerId: customerId,
            error: 'CUSTOMER_NOT_FOUND'
          });
        }

        res.json({
          message: 'Customer retrieved successfully',
          customer: customer
        });
        break;

      case 'PUT':
        // Update customer
        const updatedCustomer = customerData.updateCustomer(customerId, req.body);
        
        if (!updatedCustomer) {
          return res.status(404).json({ 
            message: `指定された顧客が見つかりません (ID: ${customerId})`,
            error: 'CUSTOMER_NOT_FOUND'
          });
        }

        res.json({
          message: 'Customer updated successfully',
          customer: updatedCustomer
        });
        break;

      case 'DELETE':
        // Soft delete customer
        const deletedCustomer = customerData.deleteCustomer(customerId);
        
        if (!deletedCustomer) {
          return res.status(404).json({ 
            message: `指定された顧客が見つかりません (ID: ${customerId})`,
            error: 'CUSTOMER_NOT_FOUND'
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
    console.error('Customer detail API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ 
        message: 'Unauthorized',
        error: 'AUTH_REQUIRED'
      });
    }
    res.status(500).json({ 
      message: 'Failed to process customer request',
      error: 'INTERNAL_ERROR'
    });
  }
}