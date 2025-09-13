const CONSTANTS = require('../config/constants');

class ResponseHelper {
  static success(res, data, message = 'Success', statusCode = CONSTANTS.HTTP_STATUS.OK) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static created(res, data, message = 'Created successfully') {
    return this.success(res, data, message, CONSTANTS.HTTP_STATUS.CREATED);
  }

  static error(res, message, statusCode = CONSTANTS.HTTP_STATUS.INTERNAL_SERVER_ERROR, details = null) {
    const response = {
      success: false,
      error: true,
      message,
      timestamp: new Date().toISOString()
    };

    if (details) {
      response.details = details;
    }

    return res.status(statusCode).json(response);
  }

  static badRequest(res, message, details = null) {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.BAD_REQUEST, details);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.UNAUTHORIZED);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.FORBIDDEN);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.NOT_FOUND);
  }

  static conflict(res, message = 'Resource already exists') {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.CONFLICT);
  }

  static serviceUnavailable(res, message = 'Service unavailable') {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.SERVICE_UNAVAILABLE);
  }

  static gatewayTimeout(res, message = 'Gateway timeout') {
    return this.error(res, message, CONSTANTS.HTTP_STATUS.GATEWAY_TIMEOUT);
  }

  static paginated(res, data, pagination, message = 'Data retrieved successfully') {
    return res.status(CONSTANTS.HTTP_STATUS.OK).json({
      success: true,
      message,
      data,
      pagination: {
        page: pagination.page || 1,
        limit: pagination.limit || 10,
        total: pagination.total || 0,
        totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10))
      },
      timestamp: new Date().toISOString()
    });
  }

  static healthCheck(res, serviceName, additionalData = {}) {
    return res.status(CONSTANTS.HTTP_STATUS.OK).json({
      status: 'healthy',
      service: serviceName,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...additionalData
    });
  }
}

module.exports = ResponseHelper;