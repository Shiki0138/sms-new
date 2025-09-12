/**
 * Test Environment Setup
 * SMS Salon Management System
 */

const fs = require('fs');
const path = require('path');

class TestEnvironmentSetup {
  constructor() {
    this.config = require('../test.config.js');
    this.environment = process.env.NODE_ENV || 'development';
  }
  
  async setupEnvironment() {
    console.log(`🚀 Setting up test environment: ${this.environment}`);
    
    try {
      // Create necessary directories
      await this.createDirectories();
      
      // Setup test database
      await this.setupTestDatabase();
      
      // Generate test data
      await this.generateTestData();
      
      // Setup mock services
      await this.setupMockServices();
      
      // Validate environment
      await this.validateEnvironment();
      
      console.log('✅ Test environment setup completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error);
      throw error;
    }
  }
  
  async createDirectories() {
    const directories = [
      './test-results',
      './test-results/coverage',
      './test-results/screenshots',
      './test-results/videos',
      './test-results/reports',
      './test-data',
      './test-data/fixtures',
      './test-data/mocks'
    ];
    
    for (const dir of directories) {
      const fullPath = path.resolve(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }
  
  async setupTestDatabase() {
    console.log('🗄️  Setting up test database...');
    
    // For this in-memory system, we'll create mock data structures
    const mockData = {
      users: [
        {
          id: 1,
          email: 'admin@salon.com',
          password: '$2a$10$kFVBZMghl0Y4dGz1ktSjXOmGawrEj3SJZQqcXKxOvvGzFBKu1Qjmq', // admin123
          name: '管理者',
          role: 'admin',
          createdAt: '2023-01-01T00:00:00Z'
        },
        {
          id: 2,
          email: 'staff@salon.com',
          password: '$2a$10$kFVBZMghl0Y4dGz1ktSjXOmGawrEj3SJZQqcXKxOvvGzFBKu1Qjmq', // staff123
          name: 'スタッフ',
          role: 'staff',
          createdAt: '2023-01-01T00:00:00Z'
        }
      ],
      customers: this.generateMockCustomers(50),
      appointments: this.generateMockAppointments(30),
      staff: this.generateMockStaff(6)
    };
    
    // Save test data
    const testDataPath = path.resolve(__dirname, '../test-data/test-database.json');
    fs.writeFileSync(testDataPath, JSON.stringify(mockData, null, 2));
    
    console.log(`💾 Test database created with ${mockData.customers.length} customers, ${mockData.appointments.length} appointments`);
  }
  
  generateMockCustomers(count) {
    const customers = [];
    const statuses = ['VIP', '常連', '新規', '休眠'];
    const names = [
      '山田太郎', '鈴木花子', '田中一郎', '佐藤美咲', '伊藤健太',
      '渡辺由美', '高橋誠', '小林愛子', '加藤大輔', '吉田麻衣'
    ];
    
    for (let i = 1; i <= count; i++) {
      customers.push({
        id: i,
        name: `${names[i % names.length]}${i}`,
        phone: `090-${String(1000 + (i * 111) % 9000).padStart(4, '0')}-${String(1000 + (i * 222) % 9000).padStart(4, '0')}`,
        email: `customer${i}@example.com`,
        lastVisit: this.randomDate(new Date(2023, 0, 1), new Date()),
        visitCount: Math.floor(Math.random() * 50) + 1,
        status: statuses[i % statuses.length],
        notes: `テスト顧客${i}のメモ`,
        totalSpent: Math.floor(Math.random() * 500000),
        birthDate: this.randomDate(new Date(1950, 0, 1), new Date(2000, 11, 31)),
        createdAt: this.randomDate(new Date(2022, 0, 1), new Date()).toISOString()
      });
    }
    
    return customers;
  }
  
  generateMockAppointments(count) {
    const appointments = [];
    const services = ['カット', 'カラー', 'パーマ', 'カット・カラー', 'トリートメント', '縮毛矯正'];
    const statuses = ['確定', '未確定', 'キャンセル', '完了'];
    
    for (let i = 1; i <= count; i++) {
      const date = this.randomDate(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      const hour = 9 + Math.floor(Math.random() * 10); // 9-18時
      const minute = Math.random() < 0.5 ? '00' : '30';
      
      appointments.push({
        id: i,
        customerId: Math.floor(Math.random() * 50) + 1,
        customerName: `テスト顧客${Math.floor(Math.random() * 50) + 1}`,
        date: date.toISOString().split('T')[0],
        time: `${hour.toString().padStart(2, '0')}:${minute}`,
        endTime: `${(hour + 2).toString().padStart(2, '0')}:${minute}`,
        service: services[i % services.length],
        staffId: Math.floor(Math.random() * 6) + 1,
        staffName: `スタッフ${Math.floor(Math.random() * 6) + 1}`,
        status: statuses[i % statuses.length],
        notes: `予約${i}のメモ`,
        price: Math.floor(Math.random() * 20000) + 3000,
        createdAt: new Date().toISOString()
      });
    }
    
    return appointments;
  }
  
  generateMockStaff(count) {
    const staff = [];
    const roles = ['スタイリスト', 'アシスタント', 'マネージャー'];
    const statuses = ['勤務中', '待機中', '休憩中', '退勤'];
    const skills = [
      ['カット', 'カラー'],
      ['カット', 'パーマ'],
      ['カラー', 'トリートメント'],
      ['カット', 'カラー', 'パーマ', '縮毛矯正'],
      ['アシスタント業務'],
      ['管理業務', 'カット', 'カラー']
    ];
    
    for (let i = 1; i <= count; i++) {
      staff.push({
        id: i,
        name: `スタッフ${i}`,
        role: roles[i % roles.length],
        status: statuses[i % statuses.length],
        skills: skills[i % skills.length],
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0-5.0
        workDays: ['月', '火', '水', '木', '金', '土'],
        workHours: {
          start: '09:00',
          end: '18:00'
        },
        monthlyTarget: 500000,
        currentMonthSales: Math.floor(Math.random() * 600000)
      });
    }
    
    return staff;
  }
  
  randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }
  
  async generateTestData() {
    console.log('📊 Generating additional test data...');
    
    // Generate test fixtures for different scenarios
    const fixtures = {
      validCustomer: {
        name: 'テスト顧客',
        phone: '090-1234-5678',
        email: 'test@customer.com',
        notes: 'テスト用の顧客データ'
      },
      invalidCustomer: {
        name: '',
        phone: 'invalid-phone',
        email: 'invalid-email'
      },
      validAppointment: {
        customerId: 1,
        date: '2024-12-31',
        time: '10:00',
        service: 'テストサービス',
        staffId: 1,
        notes: 'テスト予約'
      },
      conflictingAppointment: {
        customerId: 2,
        date: '2024-12-31',
        time: '10:00',
        service: '重複テスト',
        staffId: 1,
        notes: '重複予約のテスト'
      }
    };
    
    const fixturesPath = path.resolve(__dirname, '../test-data/fixtures/test-fixtures.json');
    fs.writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2));
    
    console.log('📋 Test fixtures generated');
  }
  
  async setupMockServices() {
    console.log('🎭 Setting up mock services...');
    
    // Create mock API responses
    const mockResponses = {
      auth: {
        validLogin: {
          token: 'mock.jwt.token',
          user: {
            id: 1,
            email: 'admin@salon.com',
            name: '管理者',
            role: 'admin'
          }
        },
        invalidLogin: {
          error: 'Invalid credentials'
        }
      },
      customers: {
        list: {
          customers: [],
          total: 0,
          page: 1,
          totalPages: 0
        },
        created: {
          id: 999,
          name: 'モック顧客',
          phone: '090-9999-9999',
          email: 'mock@example.com',
          status: '新規',
          visitCount: 0
        }
      }
    };
    
    const mocksPath = path.resolve(__dirname, '../test-data/mocks/api-responses.json');
    fs.writeFileSync(mocksPath, JSON.stringify(mockResponses, null, 2));
    
    console.log('🎯 Mock services configured');
  }
  
  async validateEnvironment() {
    console.log('✅ Validating test environment...');
    
    const requiredFiles = [
      '../test-data/test-database.json',
      '../test-data/fixtures/test-fixtures.json',
      '../test-data/mocks/api-responses.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.resolve(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required test file not found: ${file}`);
      }
    }
    
    // Validate configuration
    if (!this.config.testCategories) {
      throw new Error('Test configuration is invalid');
    }
    
    // Check environment variables
    const requiredEnvVars = ['NODE_ENV'];
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        console.warn(`⚠️  Warning: ${envVar} environment variable not set`);
      }
    }
    
    console.log('🎉 Environment validation completed');
  }
  
  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    const tempDirectories = [
      './test-results/screenshots',
      './test-results/videos'
    ];
    
    for (const dir of tempDirectories) {
      const fullPath = path.resolve(__dirname, '..', dir);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`🗑️  Cleaned directory: ${dir}`);
      }
    }
  }
}

// CLI interface
if (require.main === module) {
  const setup = new TestEnvironmentSetup();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      setup.setupEnvironment()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Setup failed:', error);
          process.exit(1);
        });
      break;
      
    case 'cleanup':
      setup.cleanup()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Cleanup failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: node test-environment.js [setup|cleanup]');
      process.exit(1);
  }
}

module.exports = TestEnvironmentSetup;