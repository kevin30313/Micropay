// Application constants
const CONSTANTS = {
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503,
    GATEWAY_TIMEOUT: 504
  },

  // Service Names
  SERVICES: {
    API_GATEWAY: 'api-gateway',
    USERS: 'users',
    PAYMENTS: 'payments',
    ORDERS: 'orders',
    NOTIFICATIONS: 'notifications'
  },

  // Event Types
  EVENTS: {
    USER: {
      REGISTERED: 'user.registered',
      LOGIN: 'user.login',
      UPDATED: 'user.updated',
      DELETED: 'user.deleted'
    },
    PAYMENT: {
      COMPLETED: 'payment.completed',
      FAILED: 'payment.failed',
      REFUNDED: 'payment.refunded'
    },
    ORDER: {
      CREATED: 'order.created',
      STATUS_UPDATED: 'order.status.updated',
      PAYMENT_COMPLETED: 'order.payment.completed',
      CANCELLED: 'order.cancelled'
    },
    NOTIFICATION: {
      CREATED: 'notification.created',
      READ: 'notification.read'
    }
  },

  // Queue Names
  QUEUES: {
    USER_EVENTS: 'user-events',
    PAYMENT_EVENTS: 'payment-events',
    ORDER_EVENTS: 'order-events',
    NOTIFICATION_EVENTS: 'notification-events'
  },

  // Order Statuses
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPED: 'shipped',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    PAYMENT_FAILED: 'payment_failed'
  },

  // Payment Statuses
  PAYMENT_STATUS: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  // Notification Types
  NOTIFICATION_TYPE: {
    USER: 'user',
    PAYMENT: 'payment',
    ORDER: 'order',
    MANUAL: 'manual'
  },

  // Notification Channels
  NOTIFICATION_CHANNEL: {
    IN_APP: 'in-app',
    EMAIL: 'email',
    PUSH: 'push',
    SMS: 'sms'
  },

  // Circuit Breaker States
  CIRCUIT_BREAKER_STATE: {
    CLOSED: 'CLOSED',
    OPEN: 'OPEN',
    HALF_OPEN: 'HALF_OPEN'
  },

  // Default Values
  DEFAULTS: {
    JWT_EXPIRY: '24h',
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
    RATE_LIMIT_MAX: 1000,
    CIRCUIT_BREAKER_THRESHOLD: 5,
    CIRCUIT_BREAKER_TIMEOUT: 60000,
    CIRCUIT_BREAKER_RESET_TIMEOUT: 30000,
    REQUEST_TIMEOUT: 10000
  },

  // Validation Rules
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 8,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^\+?[\d\s\-\(\)]+$/,
    AMOUNT_MIN: 0.01,
    AMOUNT_MAX: 999999.99
  }
};

module.exports = CONSTANTS;