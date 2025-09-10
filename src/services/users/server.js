const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const database = require('../../config/database');
const { generateToken } = require('../../middleware/auth');
const logger = require('../../utils/logger');
const messageQueue = require('../messaging/messageQueue');

const app = express();
const PORT = process.env.USERS_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'users',
    timestamp: new Date().toISOString()
  });
});

// Register user
app.post('/users/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['email', 'password', 'name']
      });
    }

    // Check if user already exists
    const existingUser = database.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = database.createUser({
      email,
      password: hashedPassword,
      name,
      phone,
      status: 'active'
    });

    // Remove password from response
    const { password: _, ...userResponse } = user;

    // Send event to message queue
    messageQueue.sendMessage('user-events', {
      event: 'user.registered',
      userId: user.id,
      email: user.email,
      name: user.name
    });

    logger.info(`User registered: ${user.id}`);

    res.status(201).json({
      message: 'User registered successfully',
      user: userResponse
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error during registration'
    });
  }
});

// Login user
app.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing credentials',
        required: ['email', 'password']
      });
    }

    // Find user
    const user = database.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password incorrect'
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email);

    // Send event to message queue
    messageQueue.sendMessage('user-events', {
      event: 'user.login',
      userId: user.id,
      email: user.email,
      loginTime: new Date().toISOString()
    });

    logger.info(`User logged in: ${user.id}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error during login'
    });
  }
});

// Get all users
app.get('/users', (req, res) => {
  try {
    const users = database.getAllUsers().map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    res.json({
      message: 'Users retrieved successfully',
      count: users.length,
      users
    });

  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving users'
    });
  }
});

// Get user by ID
app.get('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const user = database.getUserById(id);

    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with ID ${id} does not exist`
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.json({
      message: 'User retrieved successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving user'
    });
  }
});

// Update user
app.put('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates.id;

    const updatedUser = database.updateUser(id, updates);

    if (!updatedUser) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with ID ${id} does not exist`
      });
    }

    const { password, ...userWithoutPassword } = updatedUser;

    // Send event to message queue
    messageQueue.sendMessage('user-events', {
      event: 'user.updated',
      userId: updatedUser.id,
      updates
    });

    logger.info(`User updated: ${updatedUser.id}`);

    res.json({
      message: 'User updated successfully',
      user: userWithoutPassword
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error updating user'
    });
  }
});

// Delete user
app.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const deleted = database.deleteUser(id);

    if (!deleted) {
      return res.status(404).json({ 
        error: 'User not found',
        message: `User with ID ${id} does not exist`
      });
    }

    // Send event to message queue
    messageQueue.sendMessage('user-events', {
      event: 'user.deleted',
      userId: id
    });

    logger.info(`User deleted: ${id}`);

    res.json({
      message: 'User deleted successfully',
      deletedUserId: id
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error deleting user'
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Users service running on port ${PORT}`);
  console.log(`👥 Users Service running on http://localhost:${PORT}`);
});

module.exports = app;