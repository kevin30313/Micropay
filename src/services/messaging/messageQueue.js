// Simple Message Queue Implementation (simulating SNS/SQS)
class MessageQueue {
  constructor() {
    this.queues = new Map();
    this.subscribers = new Map();
  }

  // Create a queue
  createQueue(queueName) {
    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
      console.log(`Queue created: ${queueName}`);
    }
  }

  // Send message to queue
  sendMessage(queueName, message) {
    this.createQueue(queueName);
    const messageWithId = {
      id: require('uuid').v4(),
      body: message,
      timestamp: new Date().toISOString(),
      attempts: 0
    };
    
    this.queues.get(queueName).push(messageWithId);
    console.log(`Message sent to ${queueName}:`, messageWithId.id);
    
    // Notify subscribers
    this.notifySubscribers(queueName, messageWithId);
    
    return messageWithId.id;
  }

  // Receive messages from queue
  receiveMessages(queueName, maxMessages = 1) {
    const queue = this.queues.get(queueName) || [];
    const messages = queue.splice(0, maxMessages);
    return messages;
  }

  // Subscribe to queue (for real-time processing)
  subscribe(queueName, callback) {
    if (!this.subscribers.has(queueName)) {
      this.subscribers.set(queueName, []);
    }
    this.subscribers.get(queueName).push(callback);
    console.log(`Subscribed to queue: ${queueName}`);
  }

  // Notify all subscribers
  notifySubscribers(queueName, message) {
    const callbacks = this.subscribers.get(queueName) || [];
    callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Subscriber error:', error);
      }
    });
  }

  // Get queue stats
  getQueueStats(queueName) {
    const queue = this.queues.get(queueName) || [];
    const subscribers = this.subscribers.get(queueName) || [];
    
    return {
      queueName,
      messageCount: queue.length,
      subscriberCount: subscribers.length,
      messages: queue
    };
  }

  // List all queues
  listQueues() {
    return Array.from(this.queues.keys());
  }

  // Publish to topic (SNS simulation)
  publishToTopic(topicName, message) {
    console.log(`Publishing to topic ${topicName}:`, message);
    
    // Simulate broadcasting to multiple queues
    const relatedQueues = Array.from(this.queues.keys())
      .filter(queue => queue.includes(topicName.toLowerCase()));
    
    relatedQueues.forEach(queueName => {
      this.sendMessage(queueName, {
        topic: topicName,
        ...message
      });
    });

    return {
      topicName,
      messageId: require('uuid').v4(),
      queuesNotified: relatedQueues.length
    };
  }
}

// Singleton instance
const messageQueue = new MessageQueue();

// Create default queues
messageQueue.createQueue('user-events');
messageQueue.createQueue('payment-events');
messageQueue.createQueue('order-events');
messageQueue.createQueue('notification-events');

module.exports = messageQueue;