const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const database = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../utils/logger');
const messageQueue = require('../messaging/messageQueue');
const serviceRegistry = require('../../middleware/serviceDiscovery');

const app = express();
const PORT = process.env.ORDERS_PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'orders',
    timestamp: new Date().toISOString()
  });
});

// Create order
app.post('/orders', authenticateToken, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user.userId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Items array is required and cannot be empty'
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Shipping address is required'
      });
    }

    // Calculate total
    const total = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    if (total <= 0) {
      return res.status(400).json({ 
        error: 'Invalid order',
        message: 'Order total must be greater than 0'
      });
    }

    // Create order
    const order = database.createOrder({
      userId,
      items,
      total,
      shippingAddress,
      paymentMethod: paymentMethod || 'pending',
      status: 'pending'
    });

    // Send order created event
    messageQueue.sendMessage('order-events', {
      event: 'order.created',
      orderId: order.id,
      userId,
      total,
      itemCount: items.length
    });

    logger.info(`Order created: ${order.id}`);

    res.status(201).json({
      message: 'Order created successfully',
      order
    });

  } catch (error) {
    logger.error('Order creation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error creating order'
    });
  }
});

// Get order by ID
app.get('/orders/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const order = database.getOrderById(id);

    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found',
        message: `Order with ID ${id} does not exist`
      });
    }

    // Check if user owns the order
    if (order.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only access your own orders'
      });
    }

    res.json({
      message: 'Order retrieved successfully',
      order
    });

  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving order'
    });
  }
});

// Get all orders for user
app.get('/orders', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const allOrders = database.getAllOrders();
    const userOrders = allOrders.filter(order => order.userId === userId);

    // Sort by creation date (newest first)
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      message: 'Orders retrieved successfully',
      count: userOrders.length,
      orders: userOrders
    });

  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving orders'
    });
  }
});

// Update order status
app.put('/orders/:id/status', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const order = database.getOrderById(id);

    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found',
        message: `Order with ID ${id} does not exist`
      });
    }

    // Check if user owns the order
    if (order.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only update your own orders'
      });
    }

    // Update order
    const updatedOrder = database.updateOrder(id, {
      status,
      notes,
      statusUpdatedAt: new Date().toISOString()
    });

    // Send status update event
    messageQueue.sendMessage('order-events', {
      event: 'order.status.updated',
      orderId: id,
      userId: order.userId,
      oldStatus: order.status,
      newStatus: status,
      notes
    });

    logger.info(`Order status updated: ${id} -> ${status}`);

    res.json({
      message: 'Order status updated successfully',
      order: updatedOrder
    });

  } catch (error) {
    logger.error('Order status update error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error updating order status'
    });
  }
});

// Process payment for order
app.post('/orders/:id/pay', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod } = req.body;

    const order = database.getOrderById(id);

    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found',
        message: `Order with ID ${id} does not exist`
      });
    }

    // Check if user owns the order
    if (order.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only pay for your own orders'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Cannot process payment',
        message: 'Order must be in pending status to process payment'
      });
    }

    try {
      // Get payments service instance
      const paymentsService = serviceRegistry.getHealthyInstance('payments');
      
      // Create payment through payments service
      const paymentResponse = await axios.post(
        `${paymentsService.url}/payments`,
        {
          amount: order.total,
          currency: 'USD',
          method: paymentMethod,
          orderId: order.id,
          description: `Payment for order ${order.id}`
        },
        {
          headers: {
            'Authorization': req.headers['authorization'],
            'Content-Type': 'application/json'
          }
        }
      );

      if (paymentResponse.data.payment.status === 'completed') {
        // Update order with payment info
        const paidOrder = database.updateOrder(id, {
          status: 'confirmed',
          paymentId: paymentResponse.data.payment.id,
          paidAt: new Date().toISOString()
        });

        // Send payment success event
        messageQueue.sendMessage('order-events', {
          event: 'order.payment.completed',
          orderId: id,
          userId: order.userId,
          paymentId: paymentResponse.data.payment.id,
          amount: order.total
        });

        logger.info(`Order payment completed: ${id}`);

        res.json({
          message: 'Payment processed successfully',
          order: paidOrder,
          payment: paymentResponse.data.payment
        });
      } else {
        res.status(502).json({
          error: 'Payment failed',
          message: 'Payment processing failed',
          paymentDetails: paymentResponse.data
        });
      }

    } catch (paymentError) {
      logger.error(`Order payment failed: ${id}`, paymentError);
      
      // Update order status to indicate payment failure
      database.updateOrder(id, {
        status: 'payment_failed',
        paymentError: paymentError.response?.data?.message || paymentError.message
      });

      res.status(502).json({
        error: 'Payment service error',
        message: 'Unable to process payment',
        details: paymentError.response?.data || paymentError.message
      });
    }

  } catch (error) {
    logger.error('Order payment error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error processing order payment'
    });
  }
});

// Cancel order
app.delete('/orders/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = database.getOrderById(id);

    if (!order) {
      return res.status(404).json({ 
        error: 'Order not found',
        message: `Order with ID ${id} does not exist`
      });
    }

    // Check if user owns the order
    if (order.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only cancel your own orders'
      });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ 
        error: 'Cannot cancel order',
        message: 'Order cannot be cancelled after shipping'
      });
    }

    // Update order status to cancelled
    const cancelledOrder = database.updateOrder(id, {
      status: 'cancelled',
      cancelReason: reason,
      cancelledAt: new Date().toISOString()
    });

    // Send cancellation event
    messageQueue.sendMessage('order-events', {
      event: 'order.cancelled',
      orderId: id,
      userId: order.userId,
      reason,
      originalTotal: order.total
    });

    logger.info(`Order cancelled: ${id}`);

    res.json({
      message: 'Order cancelled successfully',
      order: cancelledOrder
    });

  } catch (error) {
    logger.error('Order cancellation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error cancelling order'
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Orders service running on port ${PORT}`);
  console.log(`📦 Orders Service running on http://localhost:${PORT}`);
});

module.exports = app;