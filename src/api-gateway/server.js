const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const serviceRegistry = require('../middleware/serviceDiscovery');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.'
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(morgan('combined'));
app.use(express.json());

// Health check for API Gateway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Service discovery endpoint
app.get('/services', (req, res) => {
  try {
    const services = serviceRegistry.getAllServices();
    res.json({
      message: 'Services retrieved successfully',
      services
    });
  } catch (error) {
    logger.error('Service discovery error:', error);
    res.status(500).json({
      error: 'Service discovery failed',
      message: 'Error retrieving services'
    });
  }
});

// Proxy function with error handling
const proxyRequest = async (req, res, serviceName, path = '') => {
  try {
    // Get healthy service instance
    const serviceInstance = serviceRegistry.getHealthyInstance(serviceName);
    const targetUrl = `${serviceInstance.url}${path}`;

    logger.info(`Proxying request to ${serviceName}: ${req.method} ${targetUrl}`);

    const config = {
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: undefined, // Remove host header to avoid conflicts
      },
      timeout: 10000, // 10 second timeout
    };

    if (req.body && Object.keys(req.body).length > 0) {
      config.data = req.body;
    }

    const response = await axios(config);
    
    // Forward the response
    res.status(response.status).json(response.data);

  } catch (error) {
    logger.error(`Proxy error for ${serviceName}:`, error.message);

    if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        error: 'Service unavailable',
        message: `${serviceName} service is not available`
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        error: 'Gateway timeout',
        message: `${serviceName} service timed out`
      });
    } else if (error.response) {
      // Forward the error response from the service
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: 'Internal gateway error',
        message: 'Error communicating with service'
      });
    }
  }
};

// Users service routes (public routes)
app.post('/api/users/register', (req, res) => {
  proxyRequest(req, res, 'users', '/users/register');
});

app.post('/api/users/login', (req, res) => {
  proxyRequest(req, res, 'users', '/users/login');
});

// Protected Users service routes
app.get('/api/users', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'users', '/users');
});

app.get('/api/users/:id', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'users', `/users/${req.params.id}`);
});

app.put('/api/users/:id', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'users', `/users/${req.params.id}`);
});

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'users', `/users/${req.params.id}`);
});

// Payments service routes (all protected)
app.post('/api/payments', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'payments', '/payments');
});

app.get('/api/payments', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'payments', '/payments');
});

app.get('/api/payments/:id', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'payments', `/payments/${req.params.id}`);
});

app.post('/api/payments/:id/refund', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'payments', `/payments/${req.params.id}/refund`);
});

app.get('/api/payments/stats/summary', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'payments', '/payments/stats/summary');
});

// Orders service routes (all protected)
app.post('/api/orders', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'orders', '/orders');
});

app.get('/api/orders', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'orders', '/orders');
});

app.get('/api/orders/:id', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'orders', `/orders/${req.params.id}`);
});

app.put('/api/orders/:id/status', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'orders', `/orders/${req.params.id}/status`);
});

app.post('/api/orders/:id/pay', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'orders', `/orders/${req.params.id}/pay`);
});

app.delete('/api/orders/:id', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'orders', `/orders/${req.params.id}`);
});

// Notifications service routes (all protected)
app.get('/api/notifications', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'notifications', '/notifications');
});

app.get('/api/notifications/:id', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'notifications', `/notifications/${req.params.id}`);
});

app.post('/api/notifications', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'notifications', '/notifications');
});

app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'notifications', `/notifications/${req.params.id}/read`);
});

app.get('/api/notifications/stats/summary', authenticateToken, (req, res) => {
  proxyRequest(req, res, 'notifications', '/notifications/stats/summary');
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  const apiDocs = {
    title: 'MicroPay API Gateway',
    version: '1.0.0',
    description: 'Microservices API Gateway for MicroPay fintech platform',
    baseUrl: `http://localhost:${PORT}/api`,
    services: {
      users: {
        description: 'User management and authentication',
        endpoints: {
          'POST /users/register': 'Register new user (public)',
          'POST /users/login': 'User login (public)',
          'GET /users': 'Get all users (protected)',
          'GET /users/:id': 'Get user by ID (protected)',
          'PUT /users/:id': 'Update user (protected)',
          'DELETE /users/:id': 'Delete user (protected)'
        }
      },
      payments: {
        description: 'Payment processing with circuit breaker',
        endpoints: {
          'POST /payments': 'Create payment (protected)',
          'GET /payments': 'Get user payments (protected)',
          'GET /payments/:id': 'Get payment by ID (protected)',
          'POST /payments/:id/refund': 'Refund payment (protected)',
          'GET /payments/stats/summary': 'Payment statistics (protected)'
        }
      },
      orders: {
        description: 'Order management',
        endpoints: {
          'POST /orders': 'Create order (protected)',
          'GET /orders': 'Get user orders (protected)',
          'GET /orders/:id': 'Get order by ID (protected)',
          'PUT /orders/:id/status': 'Update order status (protected)',
          'POST /orders/:id/pay': 'Pay for order (protected)',
          'DELETE /orders/:id': 'Cancel order (protected)'
        }
      },
      notifications: {
        description: 'Notification system with event handling',
        endpoints: {
          'GET /notifications': 'Get user notifications (protected)',
          'GET /notifications/:id': 'Get notification by ID (protected)',
          'POST /notifications': 'Create notification (protected)',
          'PUT /notifications/:id/read': 'Mark as read (protected)',
          'GET /notifications/stats/summary': 'Notification stats (protected)'
        }
      }
    },
    authentication: {
      type: 'JWT Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Obtain token by calling POST /api/users/login'
    },
    features: [
      'JWT Authentication',
      'Rate Limiting (1000 req/15min)',
      'Circuit Breaker Pattern',
      'Service Discovery',
      'Asynchronous Messaging',
      'Health Monitoring',
      'Request Logging'
    ]
  };

  res.json(apiDocs);
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health - API Gateway health check',
      'GET /services - Service discovery',
      'GET /api/docs - API documentation',
      'POST /api/users/register - User registration',
      'POST /api/users/login - User login',
      'GET /api/* - Protected API routes (require authentication)'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  console.log(`🌐 API Gateway running on http://localhost:${PORT}`);
  console.log(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🔍 Service Discovery: http://localhost:${PORT}/services`);
});

module.exports = app;