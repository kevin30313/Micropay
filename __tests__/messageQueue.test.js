const messageQueue = require('../src/services/messaging/messageQueue');

describe('Message Queue', () => {
  beforeEach(() => {
    // Clear all queues and subscribers
    messageQueue.queues.clear();
    messageQueue.subscribers.clear();
    
    // Recreate default queues
    messageQueue.createQueue('user-events');
    messageQueue.createQueue('payment-events');
    messageQueue.createQueue('order-events');
    messageQueue.createQueue('notification-events');
  });

  describe('Queue Operations', () => {
    test('should create a new queue', () => {
      const queueName = 'test-queue';
      messageQueue.createQueue(queueName);
      
      const queues = messageQueue.listQueues();
      expect(queues).toContain(queueName);
    });

    test('should not create duplicate queues', () => {
      const queueName = 'test-queue';
      messageQueue.createQueue(queueName);
      messageQueue.createQueue(queueName); // Try to create again
      
      const queues = messageQueue.listQueues();
      const queueCount = queues.filter(name => name === queueName).length;
      expect(queueCount).toBe(1);
    });

    test('should send message to queue', () => {
      const queueName = 'test-queue';
      const message = { event: 'test', data: 'test data' };
      
      const messageId = messageQueue.sendMessage(queueName, message);
      
      expect(messageId).toBeDefined();
      expect(typeof messageId).toBe('string');
      
      const stats = messageQueue.getQueueStats(queueName);
      expect(stats.messageCount).toBe(1);
      expect(stats.messages[0].body).toEqual(message);
    });

    test('should receive messages from queue', () => {
      const queueName = 'test-queue';
      const message1 = { event: 'test1', data: 'data1' };
      const message2 = { event: 'test2', data: 'data2' };
      
      messageQueue.sendMessage(queueName, message1);
      messageQueue.sendMessage(queueName, message2);
      
      const receivedMessages = messageQueue.receiveMessages(queueName, 2);
      
      expect(receivedMessages).toHaveLength(2);
      expect(receivedMessages[0].body).toEqual(message1);
      expect(receivedMessages[1].body).toEqual(message2);
      
      // Messages should be removed from queue after receiving
      const stats = messageQueue.getQueueStats(queueName);
      expect(stats.messageCount).toBe(0);
    });

    test('should limit number of received messages', () => {
      const queueName = 'test-queue';
      
      for (let i = 0; i < 5; i++) {
        messageQueue.sendMessage(queueName, { event: `test${i}` });
      }
      
      const receivedMessages = messageQueue.receiveMessages(queueName, 2);
      
      expect(receivedMessages).toHaveLength(2);
      
      const stats = messageQueue.getQueueStats(queueName);
      expect(stats.messageCount).toBe(3); // 3 messages remaining
    });
  });

  describe('Subscription System', () => {
    test('should subscribe to queue', () => {
      const queueName = 'test-queue';
      const callback = jest.fn();
      
      messageQueue.subscribe(queueName, callback);
      
      const stats = messageQueue.getQueueStats(queueName);
      expect(stats.subscriberCount).toBe(1);
    });

    test('should notify subscribers when message is sent', () => {
      const queueName = 'test-queue';
      const callback = jest.fn();
      const message = { event: 'test', data: 'test data' };
      
      messageQueue.subscribe(queueName, callback);
      messageQueue.sendMessage(queueName, message);
      
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        body: message,
        id: expect.any(String),
        timestamp: expect.any(String)
      }));
    });

    test('should handle multiple subscribers', () => {
      const queueName = 'test-queue';
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      const message = { event: 'test' };
      
      messageQueue.subscribe(queueName, callback1);
      messageQueue.subscribe(queueName, callback2);
      messageQueue.sendMessage(queueName, message);
      
      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    test('should handle subscriber errors gracefully', () => {
      const queueName = 'test-queue';
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      const normalCallback = jest.fn();
      
      messageQueue.subscribe(queueName, errorCallback);
      messageQueue.subscribe(queueName, normalCallback);
      
      // Should not throw error
      expect(() => {
        messageQueue.sendMessage(queueName, { event: 'test' });
      }).not.toThrow();
      
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe('Topic Publishing', () => {
    test('should publish to topic and notify related queues', () => {
      const topicName = 'user';
      const message = { event: 'user.created', userId: 'user123' };
      
      const result = messageQueue.publishToTopic(topicName, message);
      
      expect(result).toBeDefined();
      expect(result.topicName).toBe(topicName);
      expect(result.messageId).toBeDefined();
      expect(result.queuesNotified).toBeGreaterThan(0);
      
      // Check if user-events queue received the message
      const stats = messageQueue.getQueueStats('user-events');
      expect(stats.messageCount).toBe(1);
    });
  });

  describe('Queue Statistics', () => {
    test('should return correct queue statistics', () => {
      const queueName = 'test-queue';
      const callback = jest.fn();
      
      messageQueue.subscribe(queueName, callback);
      messageQueue.sendMessage(queueName, { event: 'test1' });
      messageQueue.sendMessage(queueName, { event: 'test2' });
      
      const stats = messageQueue.getQueueStats(queueName);
      
      expect(stats.queueName).toBe(queueName);
      expect(stats.messageCount).toBe(2);
      expect(stats.subscriberCount).toBe(1);
      expect(stats.messages).toHaveLength(2);
    });

    test('should list all queues', () => {
      const queues = messageQueue.listQueues();
      
      expect(queues).toContain('user-events');
      expect(queues).toContain('payment-events');
      expect(queues).toContain('order-events');
      expect(queues).toContain('notification-events');
    });
  });
});