class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

// 400 Bad Request
class BadRequestError extends ErrorResponse {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

// 401 Unauthorized
class UnauthorizedError extends ErrorResponse {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

// 403 Forbidden
class ForbiddenError extends ErrorResponse {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// 404 Not Found
class NotFoundError extends ErrorResponse {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

// 409 Conflict
class ConflictError extends ErrorResponse {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

// 422 Unprocessable Entity
class ValidationError extends ErrorResponse {
  constructor(message = 'Validation Error', errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

// 429 Too Many Requests
class RateLimitError extends ErrorResponse {
  constructor(message = 'Too many requests, please try again later') {
    super(message, 429);
  }
}

// 500 Internal Server Error
class InternalServerError extends ErrorResponse {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

// 503 Service Unavailable
class ServiceUnavailableError extends ErrorResponse {
  constructor(message = 'Service Unavailable') {
    super(message, 503);
  }
}

module.exports = {
  ErrorResponse,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError
};
