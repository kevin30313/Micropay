const database = require('../src/config/database');

describe('In-Memory Database', () => {
  beforeEach(() => {
    // Clear all data before each test
    database.users.clear();
    database.payments.clear();
    database.orders.clear();
    database.notifications.clear();
  });

  describe('User Operations', () => {
    test('should create a new user', () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User'
      };
      
      const user = database.createUser(userData);
      
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.name).toBe(userData.name);
      expect(user.createdAt).toBeDefined();
    });

    test('should retrieve user by ID', () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User'
      };
      
      const createdUser = database.createUser(userData);
      const retrievedUser = database.getUserById(createdUser.id);
      
      expect(retrievedUser).toEqual(createdUser);
    });

    test('should retrieve user by email', () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User'
      };
      
      const createdUser = database.createUser(userData);
      const retrievedUser = database.getUserByEmail(userData.email);
      
      expect(retrievedUser).toEqual(createdUser);
    });

    test('should return null for non-existent user', () => {
      const user = database.getUserById('non-existent-id');
      expect(user).toBeNull();
    });

    test('should update user', () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User'
      };
      
      const createdUser = database.createUser(userData);
      const updates = { name: 'Updated Name', phone: '123-456-7890' };
      
      const updatedUser = database.updateUser(createdUser.id, updates);
      
      expect(updatedUser.name).toBe(updates.name);
      expect(updatedUser.phone).toBe(updates.phone);
      expect(updatedUser.updatedAt).toBeDefined();
    });

    test('should delete user', () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User'
      };
      
      const createdUser = database.createUser(userData);
      const deleted = database.deleteUser(createdUser.id);
      
      expect(deleted).toBe(true);
      expect(database.getUserById(createdUser.id)).toBeNull();
    });

    test('should get all users', () => {
      const user1 = database.createUser({ email: 'user1@test.com', password: 'pass', name: 'User 1' });
      const user2 = database.createUser({ email: 'user2@test.com', password: 'pass', name: 'User 2' });
      
      const allUsers = database.getAllUsers();
      
      expect(allUsers).toHaveLength(2);
      expect(allUsers).toContainEqual(user1);
      expect(allUsers).toContainEqual(user2);
    });
  });

  describe('Payment Operations', () => {
    test('should create a new payment', () => {
      const paymentData = {
        userId: 'user123',
        amount: 100.50,
        currency: 'USD',
        method: 'credit_card'
      };
      
      const payment = database.createPayment(paymentData);
      
      expect(payment).toBeDefined();
      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(paymentData.amount);
      expect(payment.status).toBe('pending');
      expect(payment.createdAt).toBeDefined();
    });

    test('should retrieve payment by ID', () => {
      const paymentData = {
        userId: 'user123',
        amount: 100.50,
        currency: 'USD',
        method: 'credit_card'
      };
      
      const createdPayment = database.createPayment(paymentData);
      const retrievedPayment = database.getPaymentById(createdPayment.id);
      
      expect(retrievedPayment).toEqual(createdPayment);
    });

    test('should update payment', () => {
      const paymentData = {
        userId: 'user123',
        amount: 100.50,
        currency: 'USD',
        method: 'credit_card'
      };
      
      const createdPayment = database.createPayment(paymentData);
      const updates = { status: 'completed', transactionId: 'txn123' };
      
      const updatedPayment = database.updatePayment(createdPayment.id, updates);
      
      expect(updatedPayment.status).toBe(updates.status);
      expect(updatedPayment.transactionId).toBe(updates.transactionId);
      expect(updatedPayment.updatedAt).toBeDefined();
    });

    test('should get all payments', () => {
      const payment1 = database.createPayment({ userId: 'user1', amount: 100, currency: 'USD', method: 'card' });
      const payment2 = database.createPayment({ userId: 'user2', amount: 200, currency: 'USD', method: 'bank' });
      
      const allPayments = database.getAllPayments();
      
      expect(allPayments).toHaveLength(2);
      expect(allPayments).toContainEqual(payment1);
      expect(allPayments).toContainEqual(payment2);
    });
  });
});