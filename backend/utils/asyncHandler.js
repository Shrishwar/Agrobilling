/**
 * Wraps an async function to handle errors and pass them to Express's error handling middleware
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  // Resolve the Promise returned by the async function
  // If it rejects, pass the error to Express's error handling middleware
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
