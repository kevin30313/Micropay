const logger = require('../utils/logger');
const CONSTANTS = require('../config/constants');

class AppError extends Error {
  constructor(message, statusCode = CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, CONSTANTS.HTTP_STATUS.BAD_REQUEST);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, CONSTANTS.HTTP_STATUS.CONFLICT);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, CONSTANTS.HTTP_STATUS.BAD_REQUEST);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', CONSTANTS.HTTP_STATUS.UNAUTHORIZED);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', CONSTANTS.HTTP_STATUS.UNAUTHORIZED);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: 'error',
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);

    res.status(CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Something went wrong!',
      timestamp: new Date().toISOString()
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  // Log error
  logger.error('Global error handler:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

// Async error handler wrapper
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled Promise Rejection:', err);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync
};