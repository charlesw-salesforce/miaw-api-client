/**
 * Error type constants used throughout the client
 */
export const ErrorType = {
  INVALID_REQUEST_ERROR: 'invalid_request_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  PERMISSION_ERROR: 'permission_error',
  NOT_FOUND_ERROR: 'not_found_error',
  CONFLICT_ERROR: 'conflict_error',
  RATE_LIMIT_ERROR: 'rate_limit_error',
  API_ERROR: 'api_error',
  TIMEOUT_ERROR: 'timeout_error',
  UNKNOWN_ERROR: 'unknown_error',
};

/**
 * Creates an error object with status and details.
 * @param {number} status - The HTTP status code
 * @param {string} operation - The operation name
 * @param {*} [details] - Additional error details
 * @returns {Error}
 */
export function createError(status, operation, details) {
  const error = new Error(`Error in ${operation}: ${status}`);
  error.statusCode = status;
  error.operation = operation;
  error.details = details;
  return error;
}

/**
 * A no-operation logger that doesn't log anything
 * @implements {Logger}
 */
export class NoopLogger {
  log() {}
  error() {}
  warn() {}
  info() {}
  debug() {}
}
