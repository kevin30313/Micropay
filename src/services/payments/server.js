const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');
const CircuitBreaker = require('../../middleware/circuitBreaker');
const logger = require('../../utils/logger');
const messageQueue = require('../messaging/messageQueue');

const app = express();
const PORT = process.env.PAYMENTS_PORT || 3002;

// Circuit breaker for external payment gateway
const paymentGatewayBreaker = new CircuitBreaker(3, 10000, 15000);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'payments',
    circuitBreaker: paymentGatewayBreaker.getState(),
    timestamp: new Date().toISOString()
  });
});

// Simulate external payment gateway call
const callPaymentGateway = async (amount, method) => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
  
  // Simulate occasional failures (20% chance)
  if (Math.random() < 0.2) {
    throw new Error('Payment gateway timeout');
  }
  
  return {
    transactionId: require('uuid').v4(),
    status: 'completed',
    gatewayResponse: {
      amount,
      method,
      processedAt: new Date().toISOString()
    }
  };
};

// Create payment
app.post('/payments', authenticateToken, async (req, res) => {
  try {
    const { amount, currency, method, orderId, description } = req.body;
    const userId = req.user.userId;

    if (!amount || !currency || !method) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'currency', 'method']
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount',
        message: 'Amount must be greater than 0'
      });
    }

    // Create payment record
    const payment = database.createPayment({
      userId,
      amount: parseFloat(amount),
      currency,
      method,
      orderId,
      description,
      status: 'processing'
    });

    try {
      // Call payment gateway through circuit breaker
      const gatewayResponse = await paymentGatewayBreaker.call(
        callPaymentGateway, 
        amount, 
        method
      );

      // Update payment with gateway response
      const completedPayment = database.updatePayment(payment.id, {
        status: 'completed',
        transactionId: gatewayResponse.transactionId,
        gatewayResponse: gatewayResponse.gatewayResponse,
        completedAt: new Date().toISOString()
      });

      // Send success event
      messageQueue.sendMessage('payment-events', {
        event: 'payment.completed',
        paymentId: payment.id,
        userId,
        amount,
        currency,
        transactionId: gatewayResponse.transactionId
      });

      logger.info(`Payment completed: ${payment.id}`);

      res.status(201).json({
        message: 'Payment processed successfully',
        payment: completedPayment
      });

    } catch (gatewayError) {
      // Update payment as failed
      const failedPayment = database.updatePayment(payment.id, {
        status: 'failed',
        error: gatewayError.message,
        failedAt: new Date().toISOString()
      });

      // Send failure event
      messageQueue.sendMessage('payment-events', {
        event: 'payment.failed',
        paymentId: payment.id,
        userId,
        amount,
        currency,
        error: gatewayError.message
      });

      logger.error(`Payment failed: ${payment.id}`, gatewayError);

      res.status(502).json({
        error: 'Payment processing failed',
        message: 'External payment gateway error',
        payment: failedPayment,
        circuitBreakerState: paymentGatewayBreaker.getState()
      });
    }

  } catch (error) {
    logger.error('Payment creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error creating payment'
    });
  }
});

// Get payment by ID
app.get('/payments/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const payment = database.getPaymentById(id);

    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment not found',
        message: `Payment with ID ${id} does not exist`
      });
    }

    // Check if user owns the payment
    if (payment.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only access your own payments'
      });
    }

    res.json({
      message: 'Payment retrieved successfully',
      payment
    });

  } catch (error) {
    logger.error('Get payment error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving payment'
    });
  }
});

// Get all payments for user
app.get('/payments', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const allPayments = database.getAllPayments();
    const userPayments = allPayments.filter(payment => payment.userId === userId);

    res.json({
      message: 'Payments retrieved successfully',
      count: userPayments.length,
      payments: userPayments
    });

  } catch (error) {
    logger.error('Get payments error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving payments'
    });
  }
});

// Refund payment
app.post('/payments/:id/refund', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const payment = database.getPaymentById(id);

    if (!payment) {
      return res.status(404).json({ 
        error: 'Payment not found',
        message: `Payment with ID ${id} does not exist`
      });
    }

    // Check if user owns the payment
    if (payment.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only refund your own payments'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Cannot refund',
        message: 'Only completed payments can be refunded'
      });
    }

    // Process refund through circuit breaker
    try {
      const refundResponse = await paymentGatewayBreaker.call(async () => {
        // Simulate refund processing
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          refundId: require('uuid').v4(),
          status: 'completed',
          refundedAt: new Date().toISOString()
        };
      });

      // Update payment
      const refundedPayment = database.updatePayment(id, {
        status: 'refunded',
        refundId: refundResponse.refundId,
        refundReason: reason,
        refundedAt: refundResponse.refundedAt
      });

      // Send refund event
      messageQueue.sendMessage('payment-events', {
        event: 'payment.refunded',
        paymentId: id,
        userId: payment.userId,
        amount: payment.amount,
        refundId: refundResponse.refundId,
        reason
      });

      logger.info(`Payment refunded: ${id}`);

      res.json({
        message: 'Payment refunded successfully',
        payment: refundedPayment
      });

    } catch (refundError) {
      logger.error(`Refund failed: ${id}`, refundError);
      res.status(502).json({
        error: 'Refund processing failed',
        message: 'External payment gateway error',
        circuitBreakerState: paymentGatewayBreaker.getState()
      });
    }

  } catch (error) {
    logger.error('Refund error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error processing refund'
    });
  }
});

// Get payment stats
app.get('/payments/stats/summary', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const allPayments = database.getAllPayments();
    const userPayments = allPayments.filter(payment => payment.userId === userId);

    const stats = {
      totalPayments: userPayments.length,
      completedPayments: userPayments.filter(p => p.status === 'completed').length,
      failedPayments: userPayments.filter(p => p.status === 'failed').length,
      refundedPayments: userPayments.filter(p => p.status === 'refunded').length,
      totalAmount: userPayments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0),
      circuitBreakerState: paymentGatewayBreaker.getState()
    };

    res.json({
      message: 'Payment stats retrieved successfully',
      stats
    });

  } catch (error) {
    logger.error('Payment stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving payment stats'
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Payments service running on port ${PORT}`);
  console.log(`💳 Payments Service running on http://localhost:${PORT}`);
});

module.exports = app;