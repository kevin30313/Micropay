// Simulación de base de datos en memoria para demo
class InMemoryDatabase {
  constructor() {
    this.users = new Map();
    this.payments = new Map();
    this.orders = new Map();
    this.notifications = new Map();
  }

  // Users operations
  createUser(user) {
    const id = require('uuid').v4();
    user.id = id;
    user.createdAt = new Date().toISOString();
    this.users.set(id, user);
    return user;
  }

  getUserById(id) {
    return this.users.get(id);
  }

  getUserByEmail(email) {
    for (let user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  updateUser(id, updates) {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates);
      user.updatedAt = new Date().toISOString();
      return user;
    }
    return null;
  }

  deleteUser(id) {
    return this.users.delete(id);
  }

  // Payments operations
  createPayment(payment) {
    const id = require('uuid').v4();
    payment.id = id;
    payment.createdAt = new Date().toISOString();
    payment.status = payment.status || 'pending';
    this.payments.set(id, payment);
    return payment;
  }

  getPaymentById(id) {
    return this.payments.get(id);
  }

  getAllPayments() {
    return Array.from(this.payments.values());
  }

  updatePayment(id, updates) {
    const payment = this.payments.get(id);
    if (payment) {
      Object.assign(payment, updates);
      payment.updatedAt = new Date().toISOString();
      return payment;
    }
    return null;
  }

  // Orders operations
  createOrder(order) {
    const id = require('uuid').v4();
    order.id = id;
    order.createdAt = new Date().toISOString();
    order.status = order.status || 'pending';
    this.orders.set(id, order);
    return order;
  }

  getOrderById(id) {
    return this.orders.get(id);
  }

  getAllOrders() {
    return Array.from(this.orders.values());
  }

  updateOrder(id, updates) {
    const order = this.orders.get(id);
    if (order) {
      Object.assign(order, updates);
      order.updatedAt = new Date().toISOString();
      return order;
    }
    return null;
  }

  deleteOrder(id) {
    return this.orders.delete(id);
  }

  // Notifications operations
  createNotification(notification) {
    const id = require('uuid').v4();
    notification.id = id;
    notification.createdAt = new Date().toISOString();
    notification.status = notification.status || 'pending';
    this.notifications.set(id, notification);
    return notification;
  }

  getNotificationById(id) {
    return this.notifications.get(id);
  }

  getAllNotifications() {
    return Array.from(this.notifications.values());
  }
}

// Singleton instance
const database = new InMemoryDatabase();

module.exports = database;