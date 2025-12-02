/**
 * Console Filter - Suppress CSP Warnings from Third-Party Sites
 * Add this to your app to filter out harmless CSP warnings
 * 
 * Usage: Add this script before other scripts in your HTML pages
 */

(function() {
  'use strict';

  // Store original console methods
  const originalError = console.error;
  const originalWarn = console.warn;

  // List of error patterns to filter out
  const filterPatterns = [
    /frame-ancestors/i,
    /Content Security Policy/i,
    /CSP violation/i,
    /blocked by CSP/i,
    /non-passive event listener.*touchstart/i,
    /Violation.*non-passive/i,
  ];

  // Filter function
  function shouldFilter(message) {
    if (typeof message !== 'string') return false;
    return filterPatterns.some(pattern => pattern.test(message));
  }

  // Override console.error
  console.error = function(...args) {
    // Check if any argument matches filter patterns
    const shouldSkip = args.some(arg => {
      const message = typeof arg === 'string' ? arg : JSON.stringify(arg);
      return shouldFilter(message);
    });

    // Only log if not filtered
    if (!shouldSkip) {
      originalError.apply(console, args);
    }
  };

  // Override console.warn
  console.warn = function(...args) {
    // Check if any argument matches filter patterns
    const shouldSkip = args.some(arg => {
      const message = typeof arg === 'string' ? arg : JSON.stringify(arg);
      return shouldFilter(message);
    });

    // Only log if not filtered
    if (!shouldSkip) {
      originalWarn.apply(console, args);
    }
  };

  console.log('✅ Console filter activated - CSP warnings will be suppressed');
})();

