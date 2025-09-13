// Jest setup file for MicroPay project

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.API_GATEWAY_PORT = '3000';
process.env.USERS_PORT = '3001';
process.env.PAYMENTS_PORT = '3002';
process.env.ORDERS_PORT = '3003';
process.env.NOTIFICATIONS_PORT = '3004';

// Global test timeout
jest.setTimeout(10000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test utilities
global.testUtils = {
  // Helper to create test user data
  createTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'testpassword123',
    name: 'Test User',
    phone: '123-456-7890'
  }),
  
  // Helper to create test payment data
  createTestPayment: () => ({
    amount: 100.50,
    currency: 'USD',
    method: 'credit_card',
    description: 'Test payment'
  }),
  
  // Helper to create test order data
  createTestOrder: () => ({
    items: [
      { name: 'Test Product', price: 50.25, quantity: 2 }
    ],
    shippingAddress: '123 Test St, Test City, TC 12345'
  })
};

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});