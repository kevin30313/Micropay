// Service Discovery Simulation
class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  register(serviceName, instance) {
    if (!this.services.has(serviceName)) {
      this.services.set(serviceName, []);
    }
    this.services.get(serviceName).push({
      ...instance,
      registeredAt: new Date(),
      status: 'healthy'
    });
    console.log(`Service registered: ${serviceName} at ${instance.url}`);
  }

  discover(serviceName) {
    const instances = this.services.get(serviceName) || [];
    return instances.filter(instance => instance.status === 'healthy');
  }

  getHealthyInstance(serviceName) {
    const instances = this.discover(serviceName);
    if (instances.length === 0) {
      throw new Error(`No healthy instances found for service: ${serviceName}`);
    }
    // Simple round-robin selection
    return instances[Math.floor(Math.random() * instances.length)];
  }

  unregister(serviceName, instanceId) {
    const instances = this.services.get(serviceName);
    if (instances) {
      const filtered = instances.filter(instance => instance.id !== instanceId);
      this.services.set(serviceName, filtered);
    }
  }

  markUnhealthy(serviceName, instanceId) {
    const instances = this.services.get(serviceName);
    if (instances) {
      const instance = instances.find(i => i.id === instanceId);
      if (instance) {
        instance.status = 'unhealthy';
      }
    }
  }

  getAllServices() {
    const result = {};
    for (let [name, instances] of this.services) {
      result[name] = instances;
    }
    return result;
  }
}

// Singleton instance
const serviceRegistry = new ServiceRegistry();

// Register default services
serviceRegistry.register('users', {
  id: 'users-1',
  url: 'http://localhost:3001',
  version: '1.0.0'
});

serviceRegistry.register('payments', {
  id: 'payments-1', 
  url: 'http://localhost:3002',
  version: '1.0.0'
});

serviceRegistry.register('orders', {
  id: 'orders-1',
  url: 'http://localhost:3003', 
  version: '1.0.0'
});

serviceRegistry.register('notifications', {
  id: 'notifications-1',
  url: 'http://localhost:3004',
  version: '1.0.0'
});

module.exports = serviceRegistry;