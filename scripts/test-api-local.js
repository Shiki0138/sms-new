const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Import the customer API handler
// For testing, we'll create a simple version
const customersData = [
  {
    id: 'cust-001',
    firstName: 'さくら',
    lastName: '田中',
    email: 'tanaka.sakura@example.com',
    phoneNumber: '090-1234-5678',
    isActive: true
  },
  {
    id: 'cust-002', 
    firstName: 'みゆき',
    lastName: '佐藤',
    email: 'sato.miyuki@example.com',
    phoneNumber: '090-2345-6789',
    isActive: true
  }
];

// Customer API endpoint (simplified for testing)
app.all('/api/customers', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { query } = req.query;
    
    switch (req.method) {
      case 'GET':
        if (query) {
          const results = customersData.filter(c => 
            c.firstName.includes(query) || 
            c.lastName.includes(query) ||
            c.email.includes(query)
          );
          return res.json({
            customers: results,
            total: results.length,
            message: 'Search results retrieved successfully'
          });
        }
        
        res.json({
          customers: customersData,
          total: customersData.length,
          message: 'All customers retrieved successfully'
        });
        break;

      case 'POST':
        const newCustomer = {
          ...req.body,
          id: `cust-${Date.now()}`,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        customersData.push(newCustomer);
        
        res.status(201).json({
          message: 'Customer created successfully',
          customer: newCustomer
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: 'Failed to process customers request',
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`📋 Test the API at http://localhost:${PORT}/test-api-customers.html`);
  console.log(`🔍 API endpoint: http://localhost:${PORT}/api/customers`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});