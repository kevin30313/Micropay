const CONSTANTS = require('../config/constants');

class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const validators = {
  // Email validation
  email: (email) => {
    if (!email) {
      throw new ValidationError('Email is required', 'email');
    }
    if (typeof email !== 'string') {
      throw new ValidationError('Email must be a string', 'email');
    }
    if (!CONSTANTS.VALIDATION.EMAIL_REGEX.test(email)) {
      throw new ValidationError('Invalid email format', 'email');
    }
    return email.toLowerCase().trim();
  },

  // Password validation
  password: (password) => {
    if (!password) {
      throw new ValidationError('Password is required', 'password');
    }
    if (typeof password !== 'string') {
      throw new ValidationError('Password must be a string', 'password');
    }
    if (password.length < CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH) {
      throw new ValidationError(
        `Password must be at least ${CONSTANTS.VALIDATION.PASSWORD_MIN_LENGTH} characters long`,
        'password'
      );
    }
    return password;
  },

  // Name validation
  name: (name) => {
    if (!name) {
      throw new ValidationError('Name is required', 'name');
    }
    if (typeof name !== 'string') {
      throw new ValidationError('Name must be a string', 'name');
    }
    if (name.trim().length < 2) {
      throw new ValidationError('Name must be at least 2 characters long', 'name');
    }
    return name.trim();
  },

  // Phone validation
  phone: (phone) => {
    if (!phone) return null; // Phone is optional
    if (typeof phone !== 'string') {
      throw new ValidationError('Phone must be a string', 'phone');
    }
    if (!CONSTANTS.VALIDATION.PHONE_REGEX.test(phone)) {
      throw new ValidationError('Invalid phone format', 'phone');
    }
    return phone.trim();
  },

  // Amount validation
  amount: (amount) => {
    if (amount === undefined || amount === null) {
      throw new ValidationError('Amount is required', 'amount');
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      throw new ValidationError('Amount must be a valid number', 'amount');
    }
    if (numAmount < CONSTANTS.VALIDATION.AMOUNT_MIN) {
      throw new ValidationError(
        `Amount must be at least ${CONSTANTS.VALIDATION.AMOUNT_MIN}`,
        'amount'
      );
    }
    if (numAmount > CONSTANTS.VALIDATION.AMOUNT_MAX) {
      throw new ValidationError(
        `Amount cannot exceed ${CONSTANTS.VALIDATION.AMOUNT_MAX}`,
        'amount'
      );
    }
    return numAmount;
  },

  // Currency validation
  currency: (currency) => {
    if (!currency) {
      throw new ValidationError('Currency is required', 'currency');
    }
    if (typeof currency !== 'string') {
      throw new ValidationError('Currency must be a string', 'currency');
    }
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
    if (!validCurrencies.includes(currency.toUpperCase())) {
      throw new ValidationError(
        `Currency must be one of: ${validCurrencies.join(', ')}`,
        'currency'
      );
    }
    return currency.toUpperCase();
  },

  // Payment method validation
  paymentMethod: (method) => {
    if (!method) {
      throw new ValidationError('Payment method is required', 'method');
    }
    if (typeof method !== 'string') {
      throw new ValidationError('Payment method must be a string', 'method');
    }
    const validMethods = ['credit_card', 'debit_card', 'bank_transfer', 'paypal'];
    if (!validMethods.includes(method.toLowerCase())) {
      throw new ValidationError(
        `Payment method must be one of: ${validMethods.join(', ')}`,
        'method'
      );
    }
    return method.toLowerCase();
  },

  // Order status validation
  orderStatus: (status) => {
    if (!status) {
      throw new ValidationError('Order status is required', 'status');
    }
    if (typeof status !== 'string') {
      throw new ValidationError('Order status must be a string', 'status');
    }
    const validStatuses = Object.values(CONSTANTS.ORDER_STATUS);
    if (!validStatuses.includes(status.toLowerCase())) {
      throw new ValidationError(
        `Order status must be one of: ${validStatuses.join(', ')}`,
        'status'
      );
    }
    return status.toLowerCase();
  },

  // Items array validation
  items: (items) => {
    if (!items) {
      throw new ValidationError('Items are required', 'items');
    }
    if (!Array.isArray(items)) {
      throw new ValidationError('Items must be an array', 'items');
    }
    if (items.length === 0) {
      throw new ValidationError('Items array cannot be empty', 'items');
    }
    
    return items.map((item, index) => {
      if (!item.name) {
        throw new ValidationError(`Item ${index + 1}: name is required`, 'items');
      }
      if (!item.price || isNaN(parseFloat(item.price))) {
        throw new ValidationError(`Item ${index + 1}: valid price is required`, 'items');
      }
      if (!item.quantity || isNaN(parseInt(item.quantity)) || parseInt(item.quantity) < 1) {
        throw new ValidationError(`Item ${index + 1}: valid quantity is required`, 'items');
      }
      
      return {
        name: item.name.trim(),
        price: parseFloat(item.price),
        quantity: parseInt(item.quantity)
      };
    });
  },

  // UUID validation
  uuid: (id, fieldName = 'id') => {
    if (!id) {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }
    if (typeof id !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`, fieldName);
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError(`Invalid ${fieldName} format`, fieldName);
    }
    return id;
  }
};

// Validation middleware factory
const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      const validatedData = {};
      
      for (const [field, validator] of Object.entries(schema)) {
        const value = req.body[field];
        if (typeof validator === 'function') {
          validatedData[field] = validator(value);
        } else if (typeof validator === 'object' && validator.validate) {
          validatedData[field] = validator.validate(value);
        }
      }
      
      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(CONSTANTS.HTTP_STATUS.BAD_REQUEST).json({
          error: 'Validation error',
          message: error.message,
          field: error.field
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validators,
  validateRequest,
  ValidationError
};