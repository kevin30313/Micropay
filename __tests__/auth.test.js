const jwt = require('jsonwebtoken');
const { generateToken, authenticateToken, JWT_SECRET } = require('../src/middleware/auth');

describe('Authentication Middleware', () => {
  describe('generateToken', () => {
    test('should generate a valid JWT token', () => {
      const userId = 'user123';
      const email = 'test@example.com';
      
      const token = generateToken(userId, email);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify the token
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe(userId);
      expect(decoded.email).toBe(email);
      expect(decoded.exp).toBeDefined();
    });

    test('should generate different tokens for different users', () => {
      const token1 = generateToken('user1', 'user1@example.com');
      const token2 = generateToken('user2', 'user2@example.com');
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('authenticateToken', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
      mockReq = {
        headers: {}
      };
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      mockNext = jest.fn();
    });

    test('should authenticate valid token', () => {
      const userId = 'user123';
      const email = 'test@example.com';
      const token = generateToken(userId, email);
      
      mockReq.headers['authorization'] = `Bearer ${token}`;
      
      authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.userId).toBe(userId);
      expect(mockReq.user.email).toBe(email);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject request without token', () => {
      authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access denied',
        message: 'Token requerido'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject invalid token', () => {
      mockReq.headers['authorization'] = 'Bearer invalid-token';
      
      authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid token',
        message: 'Token inválido o expirado'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should reject malformed authorization header', () => {
      mockReq.headers['authorization'] = 'InvalidFormat';
      
      authenticateToken(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});