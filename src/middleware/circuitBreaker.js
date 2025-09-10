// Circuit Breaker implementation
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000, resetTimeout = 30000) {
    this.threshold = threshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.nextAttempt = Date.now();
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async call(func, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await func(...args);
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  recordFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
    }
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  getState() {
    return this.state;
  }
}

module.exports = CircuitBreaker;