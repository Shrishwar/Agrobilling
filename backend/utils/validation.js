const { validationResult } = require('express-validator');
const { ValidationError } = require('./errorResponse');

/**
 * Validates the request using express-validator and throws a ValidationError if there are any errors
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 * @throws {ValidationError} If there are validation errors
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));
    
    throw new ValidationError('Validation failed', errorMessages);
  }
  
  next();
};

// Common validation rules
const commonRules = {
  email: {
    isEmail: true,
    errorMessage: 'Please provide a valid email address',
    normalizeEmail: true,
  },
  password: {
    isLength: {
      options: { min: 6 },
      errorMessage: 'Password must be at least 6 characters long',
    },
  },
  phone: {
    matches: {
      options: [/^[6-9]\d{9}$/],
      errorMessage: 'Please provide a valid 10-digit phone number',
    },
  },
  pincode: {
    matches: {
      options: [/^[1-9][0-9]{5}$/],
      errorMessage: 'Please provide a valid 6-digit pincode',
    },
  },
  gstin: {
    matches: {
      options: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/],
      errorMessage: 'Please provide a valid GSTIN',
    },
  },
};

// Validation middleware for common operations
const validate = (validations) => {
  return [
    ...validations,
    (req, res, next) => {
      const errors = validationResult(req);
      if (errors.isEmpty()) {
        return next();
      }
      
      const errorMessages = errors.array().map(error => ({
        field: error.param,
        message: error.msg,
        value: error.value,
      }));
      
      next(new ValidationError('Validation failed', errorMessages));
    },
  ];
};

// Helper to validate MongoDB ObjectId
const isValidObjectId = (value) => {
  const ObjectId = require('mongoose').Types.ObjectId;
  return ObjectId.isValid(value) && (new ObjectId(value)).toString() === value;
};

// Custom validators
const customValidators = {
  isArray: (value) => {
    if (!Array.isArray(value)) {
      throw new Error('Must be an array');
    }
    return true;
  },
  isObject: (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Must be an object');
    }
    return true;
  },
  isString: (value) => {
    if (typeof value !== 'string') {
      throw new Error('Must be a string');
    }
    return true;
  },
  isNumber: (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Must be a number');
    }
    return true;
  },
  isBoolean: (value) => {
    if (typeof value !== 'boolean') {
      throw new Error('Must be a boolean');
    }
    return true;
  },
  isDate: (value) => {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('Must be a valid date');
    }
    return true;
  },
};

module.exports = {
  validateRequest,
  commonRules,
  validate,
  isValidObjectId,
  customValidators,
};
