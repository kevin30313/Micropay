const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const database = require('../../config/database');
const { authenticateToken } = require('../../middleware/auth');
const logger = require('../../utils/logger');
const messageQueue = require('../messaging/messageQueue');

const app = express();
const PORT = process.env.NOTIFICATIONS_PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'notifications',
    timestamp: new Date().toISOString()
  });
});

// Subscribe to message queues
messageQueue.subscribe('user-events', (message) => {
  handleUserEvent(message);
});

messageQueue.subscribe('payment-events', (message) => {
  handlePaymentEvent(message);
});

messageQueue.subscribe('order-events', (message) => {
  handleOrderEvent(message);
});

// Event handlers
function handleUserEvent(message) {
  try {
    const { event, userId, email, name } = message.body;
    
    let notificationContent = '';
    
    switch (event) {
      case 'user.registered':
        notificationContent = `Welcome to MicroPay, ${name}! Your account has been successfully created.`;
        break;
      case 'user.login':
        notificationContent = `Login successful. Welcome back, ${name}!`;
        break;
      case 'user.updated':
        notificationContent = `Your profile has been updated successfully.`;
        break;
      default:
        notificationContent = `User event: ${event}`;
    }

    const notification = database.createNotification({
      userId,
      type: 'user',
      event,
      title: 'Account Notification',
      message: notificationContent,
      channel: 'in-app',
      metadata: { email, name }
    });

    logger.info(`User notification created: ${notification.id}`);
  } catch (error) {
    logger.error('Error handling user event:', error);
  }
}

function handlePaymentEvent(message) {
  try {
    const { event, paymentId, userId, amount, currency, transactionId } = message.body;
    
    let notificationContent = '';
    let title = 'Payment Notification';
    
    switch (event) {
      case 'payment.completed':
        notificationContent = `Your payment of ${amount} ${currency} has been processed successfully. Transaction ID: ${transactionId}`;
        title = 'Payment Successful';
        break;
      case 'payment.failed':
        notificationContent = `Your payment of ${amount} ${currency} could not be processed. Please try again.`;
        title = 'Payment Failed';
        break;
      case 'payment.refunded':
        notificationContent = `Your refund of ${amount} ${currency} has been processed successfully.`;
        title = 'Refund Processed';
        break;
      default:
        notificationContent = `Payment event: ${event}`;
    }

    const notification = database.createNotification({
      userId,
      type: 'payment',
      event,
      title,
      message: notificationContent,
      channel: 'email',
      metadata: { paymentId, amount, currency, transactionId }
    });

    logger.info(`Payment notification created: ${notification.id}`);
  } catch (error) {
    logger.error('Error handling payment event:', error);
  }
}

function handleOrderEvent(message) {
  try {
    const { event, orderId, userId, total, newStatus } = message.body;
    
    let notificationContent = '';
    let title = 'Order Notification';
    
    switch (event) {
      case 'order.created':
        notificationContent = `Your order has been created successfully. Order total: $${total}`;
        title = 'Order Created';
        break;
      case 'order.status.updated':
        notificationContent = `Your order status has been updated to: ${newStatus}`;
        title = 'Order Status Update';
        break;
      case 'order.payment.completed':
        notificationContent = `Payment for your order has been processed successfully.`;
        title = 'Order Payment Confirmed';
        break;
      case 'order.cancelled':
        notificationContent = `Your order has been cancelled.`;
        title = 'Order Cancelled';
        break;
      default:
        notificationContent = `Order event: ${event}`;
    }

    const notification = database.createNotification({
      userId,
      type: 'order',
      event,
      title,
      message: notificationContent,
      channel: 'push',
      metadata: { orderId, total, newStatus }
    });

    logger.info(`Order notification created: ${notification.id}`);
  } catch (error) {
    logger.error('Error handling order event:', error);
  }
}

// Get user notifications
app.get('/notifications', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const allNotifications = database.getAllNotifications();
    const userNotifications = allNotifications
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      message: 'Notifications retrieved successfully',
      count: userNotifications.length,
      notifications: userNotifications
    });

  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving notifications'
    });
  }
});

// Get notification by ID
app.get('/notifications/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const notification = database.getNotificationById(id);

    if (!notification) {
      return res.status(404).json({ 
        error: 'Notification not found',
        message: `Notification with ID ${id} does not exist`
      });
    }

    // Check if user owns the notification
    if (notification.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only access your own notifications'
      });
    }

    res.json({
      message: 'Notification retrieved successfully',
      notification
    });

  } catch (error) {
    logger.error('Get notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving notification'
    });
  }
});

// Create manual notification
app.post('/notifications', authenticateToken, (req, res) => {
  try {
    const { title, message, type, channel } = req.body;
    const userId = req.user.userId;

    if (!title || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'message']
      });
    }

    const notification = database.createNotification({
      userId,
      type: type || 'manual',
      event: 'manual.created',
      title,
      message,
      channel: channel || 'in-app',
      metadata: {}
    });

    logger.info(`Manual notification created: ${notification.id}`);

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });

  } catch (error) {
    logger.error('Create notification error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error creating notification'
    });
  }
});

// Mark notification as read
app.put('/notifications/:id/read', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const notification = database.getNotificationById(id);

    if (!notification) {
      return res.status(404).json({ 
        error: 'Notification not found',
        message: `Notification with ID ${id} does not exist`
      });
    }

    // Check if user owns the notification
    if (notification.userId !== req.user.userId) {
      return res.status(403).json({ 
        error: 'Forbidden',
        message: 'You can only update your own notifications'
      });
    }

    // Update notification as read (simulated by adding readAt timestamp)
    notification.readAt = new Date().toISOString();
    notification.status = 'read';

    logger.info(`Notification marked as read: ${id}`);

    res.json({
      message: 'Notification marked as read',
      notification
    });

  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error updating notification'
    });
  }
});

// Get notification stats
app.get('/notifications/stats/summary', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const allNotifications = database.getAllNotifications();
    const userNotifications = allNotifications.filter(n => n.userId === userId);

    const stats = {
      totalNotifications: userNotifications.length,
      unreadNotifications: userNotifications.filter(n => !n.readAt).length,
      readNotifications: userNotifications.filter(n => n.readAt).length,
      byType: {
        user: userNotifications.filter(n => n.type === 'user').length,
        payment: userNotifications.filter(n => n.type === 'payment').length,
        order: userNotifications.filter(n => n.type === 'order').length,
        manual: userNotifications.filter(n => n.type === 'manual').length
      },
      byChannel: {
        'in-app': userNotifications.filter(n => n.channel === 'in-app').length,
        email: userNotifications.filter(n => n.channel === 'email').length,
        push: userNotifications.filter(n => n.channel === 'push').length,
        sms: userNotifications.filter(n => n.channel === 'sms').length
      }
    };

    res.json({
      message: 'Notification stats retrieved successfully',
      stats
    });

  } catch (error) {
    logger.error('Notification stats error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Error retrieving notification stats'
    });
  }
});

// Start server
app.listen(PORT, () => {
  logger.info(`Notifications service running on port ${PORT}`);
  console.log(`🔔 Notifications Service running on http://localhost:${PORT}`);
});

module.exports = app;