const request = require('supertest');
const app = require('../src/services/users/server');
const database = require('../src/config/database');

describe('Users Service', () => {
  beforeEach(() => {
    // Clear database before each test
    database.users.clear();
  });

  describe('POST /users/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phone: '123-456-7890'
      };

      const response = await request(app)
        .post('/users/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should return 400 for missing required fields', async () => {
      const userData = {
        email: 'test@example.com'
        // Missing password and name
      };

      const response = await request(app)
        .post('/users/register')
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.required).toEqual(['email', 'password', 'name']);
    });

    test('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      };

      // Register first user
      await request(app)
        .post('/users/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/users/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('User already exists');
      expect(response.body.message).toBe('Email already registered');
    });
  });

  describe('POST /users/login', () => {
    beforeEach(async () => {
      // Register a test user
      await request(app)
        .post('/users/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
    });

    test('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.user.password).toBeUndefined();
    });

    test('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/users/login')
        .send({ email: 'test@example.com' }) // Missing password
        .expect(400);

      expect(response.body.error).toBe('Missing credentials');
      expect(response.body.required).toEqual(['email', 'password']);
    });

    test('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.message).toBe('Email or password incorrect');
    });

    test('should return 401 for incorrect password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/users/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
      expect(response.body.message).toBe('Email or password incorrect');
    });
  });

  describe('GET /users', () => {
    test('should return all users', async () => {
      // Register test users
      await request(app)
        .post('/users/register')
        .send({
          email: 'user1@example.com',
          password: 'password123',
          name: 'User 1'
        });

      await request(app)
        .post('/users/register')
        .send({
          email: 'user2@example.com',
          password: 'password123',
          name: 'User 2'
        });

      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.body.message).toBe('Users retrieved successfully');
      expect(response.body.count).toBe(2);
      expect(response.body.users).toHaveLength(2);
      
      // Check that passwords are not returned
      response.body.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    test('should return empty array when no users exist', async () => {
      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.body.count).toBe(0);
      expect(response.body.users).toHaveLength(0);
    });
  });

  describe('GET /users/:id', () => {
    let userId;

    beforeEach(async () => {
      const registerResponse = await request(app)
        .post('/users/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });
      
      userId = registerResponse.body.user.id;
    });

    test('should return user by ID', async () => {
      const response = await request(app)
        .get(`/users/${userId}`)
        .expect(200);

      expect(response.body.message).toBe('User retrieved successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.id).toBe(userId);
      expect(response.body.user.password).toBeUndefined();
    });

    test('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/non-existent-id')
        .expect(404);

      expect(response.body.error).toBe('User not found');
      expect(response.body.message).toBe('User with ID non-existent-id does not exist');
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('users');
      expect(response.body.timestamp).toBeDefined();
    });
  });
});