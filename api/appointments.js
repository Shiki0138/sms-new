const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

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

// Mock appointments database (updated with consistent customer IDs)
const mockAppointments = [
  {
    id: 'apt-001',
    customerName: '田中 さくら',
    customerId: 'cust-001',
    customerPhone: '090-1234-5678',
    serviceName: 'カット & カラー',
    services: [
      { name: 'カット', duration: 60, price: 4500 },
      { name: 'カラー', duration: 60, price: 4000 }
    ],
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '12:00',
    duration: 120,
    price: 8500,
    status: 'confirmed',
    notes: 'ロングからミディアムに',
    staffName: '田中 美咲',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'apt-002',
    customerName: '佐藤 みゆき',
    customerId: 'cust-002',
    customerPhone: '090-2345-6789',
    serviceName: 'ヘッドスパ',
    services: [
      { name: 'ヘッドスパ', duration: 90, price: 6000 }
    ],
    appointmentDate: new Date().toISOString().split('T')[0],
    startTime: '14:00',
    endTime: '15:30',
    duration: 90,
    price: 6000,
    status: 'completed',
    notes: 'リラクゼーション重視',
    staffName: '山田 花音',
    createdAt: new Date(Date.now() - 60000).toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'apt-003',
    customerName: '山田 えみ',
    customerId: 'cust-003',
    customerPhone: '090-3456-7890',
    serviceName: 'フルコース',
    services: [
      { name: 'カット', duration: 60, price: 4500 },
      { name: 'カラー', duration: 60, price: 4000 },
      { name: 'パーマ', duration: 60, price: 6500 }
    ],
    appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '16:00',
    duration: 180,
    price: 15000,
    status: 'confirmed',
    notes: 'VIP顧客、特別対応',
    staffName: '田中 美咲',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'apt-004',
    customerName: '鈴木 あい',
    customerId: 'cust-004',
    customerPhone: '090-4567-8901',
    serviceName: 'カット',
    services: [
      { name: 'カット', duration: 60, price: 4500 }
    ],
    appointmentDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '16:00',
    duration: 60,
    price: 4500,
    status: 'pending',
    notes: 'シンプルカット希望',
    staffName: '山田 花音',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'apt-005',
    customerName: '田中 さくら',
    customerId: 'cust-001',
    customerPhone: '090-1234-5678',
    serviceName: 'ヘッドスパ & トリートメント',
    services: [
      { name: 'ヘッドスパ', duration: 45, price: 3500 },
      { name: 'ヘアトリートメント', duration: 30, price: 2500 }
    ],
    appointmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '16:15',
    duration: 75,
    price: 6000,
    status: 'completed',
    notes: '髪のダメージケア',
    staffName: '山田 花音',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

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

    switch (req.method) {
      case 'GET':
        // Filter appointments based on query parameters
        let filteredAppointments = [...mockAppointments];
        
        // Filter by customer ID if provided
        if (req.query.customerId) {
          filteredAppointments = filteredAppointments.filter(apt => 
            apt.customerId === req.query.customerId
          );
        }
        
        // Filter by date if provided
        if (req.query.date) {
          filteredAppointments = filteredAppointments.filter(apt => 
            apt.appointmentDate === req.query.date
          );
        }

        // Filter by status if provided
        if (req.query.status) {
          filteredAppointments = filteredAppointments.filter(apt => 
            apt.status === req.query.status
          );
        }

        // Sort by appointment date and time
        filteredAppointments.sort((a, b) => {
          const dateCompare = new Date(a.appointmentDate) - new Date(b.appointmentDate);
          if (dateCompare !== 0) return dateCompare;
          return a.startTime.localeCompare(b.startTime);
        });

        // Calculate summary stats
        const today = new Date().toISOString().split('T')[0];
        const todaysAppointments = mockAppointments.filter(apt => 
          apt.appointmentDate === today
        );
        const confirmedToday = todaysAppointments.filter(apt => 
          apt.status === 'confirmed'
        ).length;

        res.json({
          appointments: filteredAppointments,
          summary: {
            total: mockAppointments.length,
            todaysTotal: todaysAppointments.length,
            todaysConfirmed: confirmedToday,
            pending: mockAppointments.filter(apt => apt.status === 'pending').length,
            completed: mockAppointments.filter(apt => apt.status === 'completed').length
          }
        });
        break;

      case 'POST':
        // Create new appointment
        const newAppointment = {
          id: uuidv4(),
          ...req.body,
          status: req.body.status || 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        mockAppointments.push(newAppointment);
        res.status(201).json({
          message: 'Appointment created successfully',
          appointment: newAppointment
        });
        break;

      case 'PUT':
        // Update appointment
        const appointmentId = req.query.id;
        const appointmentIndex = mockAppointments.findIndex(apt => apt.id === appointmentId);
        
        if (appointmentIndex !== -1) {
          mockAppointments[appointmentIndex] = {
            ...mockAppointments[appointmentIndex],
            ...req.body,
            updatedAt: new Date().toISOString()
          };
          res.json({
            message: 'Appointment updated successfully',
            appointment: mockAppointments[appointmentIndex]
          });
        } else {
          res.status(404).json({ message: 'Appointment not found' });
        }
        break;

      case 'DELETE':
        // Delete appointment
        res.json({
          message: 'Appointment deleted successfully'
        });
        break;

      default:
        res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Appointments API error:', error);
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    res.status(500).json({ message: 'Failed to process appointments request' });
  }
}