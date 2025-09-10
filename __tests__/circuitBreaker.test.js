const CircuitBreaker = require('../src/middleware/circuitBreaker');

describe('Circuit Breaker', () => {
  let circuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(2, 1000, 100); // threshold: 2, timeout: 1s, reset: 100ms
  });

  test('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  test('should execute successful function calls', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.call(mockFn, 'arg1');
    
    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledWith('arg1');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  test('should open circuit after threshold failures', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));
    
    // First failure
    try {
      await circuitBreaker.call(mockFn);
    } catch (error) {
      expect(error.message).toBe('Service error');
    }
    expect(circuitBreaker.getState()).toBe('CLOSED');
    
    // Second failure - should open circuit
    try {
      await circuitBreaker.call(mockFn);
    } catch (error) {
      expect(error.message).toBe('Service error');
    }
    expect(circuitBreaker.getState()).toBe('OPEN');
  });

  test('should reject calls when circuit is OPEN', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Service error'));
    
    // Trigger circuit opening
    try {
      await circuitBreaker.call(mockFn);
    } catch (error) {}
    try {
      await circuitBreaker.call(mockFn);
    } catch (error) {}
    
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Next call should be rejected immediately
    try {
      await circuitBreaker.call(mockFn);
      fail('Should have thrown an error');
    } catch (error) {
      expect(error.message).toBe('Circuit breaker is OPEN');
    }
  });

  test('should reset after successful call in HALF_OPEN state', async () => {
    const mockFn = jest.fn()
      .mockRejectedValueOnce(new Error('Service error'))
      .mockRejectedValueOnce(new Error('Service error'))
      .mockResolvedValue('success');
    
    // Trigger circuit opening
    try { await circuitBreaker.call(mockFn); } catch (error) {}
    try { await circuitBreaker.call(mockFn); } catch (error) {}
    
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Next call should work and reset circuit
    const result = await circuitBreaker.call(mockFn);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  test('should handle multiple consecutive successes', async () => {
    const mockFn = jest.fn().mockResolvedValue('success');
    
    for (let i = 0; i < 5; i++) {
      const result = await circuitBreaker.call(mockFn);
      expect(result).toBe('success');
    }
    
    expect(circuitBreaker.getState()).toBe('CLOSED');
    expect(mockFn).toHaveBeenCalledTimes(5);
  });

  test('should pass function arguments correctly', async () => {
    const mockFn = jest.fn().mockImplementation((a, b, c) => a + b + c);
    
    const result = await circuitBreaker.call(mockFn, 1, 2, 3);
    
    expect(result).toBe(6);
    expect(mockFn).toHaveBeenCalledWith(1, 2, 3);
  });
});