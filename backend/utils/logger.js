const winston = require('winston');
const path = require('path');
const { format } = winston;
const { combine, timestamp, printf, colorize, align, json } = format;

const logDir = 'logs';
const errorFile = path.join(logDir, 'error.log');
const combinedFile = path.join(logDir, 'combined.log');

// Create log directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Define different formats for different environments
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  logFormat
);

const prodFormat = combine(
  timestamp(),
  format.errors({ stack: true }),
  json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', 
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new winston.transports.File({ 
      filename: errorFile, 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: combinedFile,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ],
  exitOnError: false
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      logFormat
    )
  }));
}

// Create a stream object with a 'write' function that will be used by `morgan`
logger.stream = {
  write: function(message) {
    logger.info(message.trim());
  },
};

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Consider whether to exit the process or not
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider whether to exit the process or not
  // process.exit(1);
});

module.exports = logger;
