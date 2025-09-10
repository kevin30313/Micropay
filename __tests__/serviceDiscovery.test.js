const serviceRegistry = require('../src/middleware/serviceDiscovery');

describe('Service Discovery', () => {
  beforeEach(() => {
    // Clear existing services
    serviceRegistry.services.clear();
  });

  describe('Service Registration', () => {
    test('should register a new service', () => {
      const serviceName = 'test-service';
      const instance = {
        id: 'test-1',
        url: 'http://localhost:3001',
        version: '1.0.0'
      };

      serviceRegistry.register(serviceName, instance);

      const services = serviceRegistry.discover(serviceName);
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe(instance.id);
      expect(services[0].url).toBe(instance.url);
      expect(services[0].status).toBe('healthy');
      expect(services[0].registeredAt).toBeDefined();
    });

    test('should register multiple instances of same service', () => {
      const serviceName = 'test-service';
      const instance1 = {
        id: 'test-1',
        url: 'http://localhost:3001',
        version: '1.0.0'
      };
      const instance2 = {
        id: 'test-2',
        url: 'http://localhost:3002',
        version: '1.0.0'
      };

      serviceRegistry.register(serviceName, instance1);
      serviceRegistry.register(serviceName, instance2);

      const services = serviceRegistry.discover(serviceName);
      expect(services).toHaveLength(2);
    });

    test('should register different services', () => {
      serviceRegistry.register('service-a', { id: 'a-1', url: 'http://localhost:3001' });
      serviceRegistry.register('service-b', { id: 'b-1', url: 'http://localhost:3002' });

      const serviceA = serviceRegistry.discover('service-a');
      const serviceB = serviceRegistry.discover('service-b');

      expect(serviceA).toHaveLength(1);
      expect(serviceB).toHaveLength(1);
      expect(serviceA[0].url).toBe('http://localhost:3001');
      expect(serviceB[0].url).toBe('http://localhost:3002');
    });
  });

  describe('Service Discovery', () => {
    beforeEach(() => {
      serviceRegistry.register('test-service', {
        id: 'test-1',
        url: 'http://localhost:3001',
        version: '1.0.0'
      });
      serviceRegistry.register('test-service', {
        id: 'test-2',
        url: 'http://localhost:3002',
        version: '1.0.0'
      });
    });

    test('should discover healthy services only', () => {
      const services = serviceRegistry.discover('test-service');
      
      expect(services).toHaveLength(2);
      services.forEach(service => {
        expect(service.status).toBe('healthy');
      });
    });

    test('should return empty array for non-existent service', () => {
      const services = serviceRegistry.discover('non-existent-service');
      expect(services).toHaveLength(0);
    });

    test('should get a healthy instance', () => {
      const instance = serviceRegistry.getHealthyInstance('test-service');
      
      expect(instance).toBeDefined();
      expect(instance.status).toBe('healthy');
      expect(['http://localhost:3001', 'http://localhost:3002']).toContain(instance.url);
    });

    test('should throw error when no healthy instances available', () => {
      expect(() => {
        serviceRegistry.getHealthyInstance('non-existent-service');
      }).toThrow('No healthy instances found for service: non-existent-service');
    });
  });

  describe('Service Health Management', () => {
    beforeEach(() => {
      serviceRegistry.register('test-service', {
        id: 'test-1',
        url: 'http://localhost:3001',
        version: '1.0.0'
      });
      serviceRegistry.register('test-service', {
        id: 'test-2',
        url: 'http://localhost:3002',
        version: '1.0.0'
      });
    });

    test('should mark service as unhealthy', () => {
      serviceRegistry.markUnhealthy('test-service', 'test-1');
      
      const healthyServices = serviceRegistry.discover('test-service');
      expect(healthyServices).toHaveLength(1);
      expect(healthyServices[0].id).toBe('test-2');
    });

    test('should unregister service instance', () => {
      serviceRegistry.unregister('test-service', 'test-1');
      
      const services = serviceRegistry.discover('test-service');
      expect(services).toHaveLength(1);
      expect(services[0].id).toBe('test-2');
    });

    test('should handle unregistering non-existent instance', () => {
      serviceRegistry.unregister('test-service', 'non-existent-id');
      
      const services = serviceRegistry.discover('test-service');
      expect(services).toHaveLength(2); // Should still have both instances
    });

    test('should handle marking non-existent service as unhealthy', () => {
      serviceRegistry.markUnhealthy('non-existent-service', 'test-1');
      
      // Should not throw error and other services should be unaffected
      const services = serviceRegistry.discover('test-service');
      expect(services).toHaveLength(2);
    });
  });

  describe('Service Listing', () => {
    test('should get all services', () => {
      serviceRegistry.register('service-a', { id: 'a-1', url: 'http://localhost:3001' });
      serviceRegistry.register('service-b', { id: 'b-1', url: 'http://localhost:3002' });
      
      const allServices = serviceRegistry.getAllServices();
      
      expect(allServices['service-a']).toBeDefined();
      expect(allServices['service-b']).toBeDefined();
      expect(allServices['service-a']).toHaveLength(1);
      expect(allServices['service-b']).toHaveLength(1);
    });

    test('should return empty object when no services registered', () => {
      const allServices = serviceRegistry.getAllServices();
      expect(Object.keys(allServices)).toHaveLength(0);
    });
  });
});