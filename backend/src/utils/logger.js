const winston = require('winston');
const path = require('path');

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

// Set colors for winston
winston.addColors(logColors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack } = info;
    
    // Include stack trace for errors
    if (stack) {
      return `${timestamp} [${level}]: ${message}\n${stack}`;
    }
    
    return `${timestamp} [${level}]: ${message}`;
  })
);

// Define file format (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, '../../logs');
require('fs').mkdirSync(logDir, { recursive: true });

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat
  }),

  // Error log file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),

  // Combined log file
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Add access log file for production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  format: fileFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      format: fileFormat
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      format: fileFormat
    })
  ],
  exitOnError: false
});

// Helper functions for structured logging
logger.logRequest = (req, res, responseTime) => {
  const { method, url, ip, headers } = req;
  const { statusCode } = res;
  const userAgent = headers['user-agent'] || '';
  const contentLength = res.get('content-length') || 0;

  logger.http('HTTP Request', {
    method,
    url,
    statusCode,
    responseTime: `${responseTime}ms`,
    contentLength,
    ip,
    userAgent,
    timestamp: new Date().toISOString()
  });
};

logger.logTransaction = (transactionData, action = 'created') => {
  logger.info('Transaction Event', {
    action,
    transactionId: transactionData.id,
    fromAddress: transactionData.fromAddress,
    toAddress: transactionData.toAddress,
    amount: transactionData.amount,
    currency: transactionData.currency,
    status: transactionData.status,
    timestamp: new Date().toISOString()
  });
};

logger.logUserAction = (userId, action, details = {}) => {
  logger.info('User Action', {
    userId,
    action,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.logSecurityEvent = (event, details = {}) => {
  logger.warn('Security Event', {
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

logger.logBlockchainEvent = (event, data = {}) => {
  logger.info('Blockchain Event', {
    event,
    data,
    timestamp: new Date().toISOString()
  });
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });
};

logger.logPaymentEvent = (paymentData, event = 'processed') => {
  logger.info('Payment Event', {
    event,
    paymentRequestId: paymentData.id,
    amount: paymentData.amount,
    currency: paymentData.currency,
    status: paymentData.status,
    merchant: paymentData.merchant,
    timestamp: new Date().toISOString()
  });
};

logger.logPerformance = (operation, duration, details = {}) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString()
  });
};

// Development helper to log with colors in console
if (process.env.NODE_ENV !== 'production') {
  logger.debug('Logger initialized in development mode');
  logger.debug(`Log level set to: ${logger.level}`);
  logger.debug(`Logs directory: ${logDir}`);
}

module.exports = logger;