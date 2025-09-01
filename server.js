'use strict';

/**
 * Main Lambda handler for API Gateway HTTP API.
 * Works with ANY /{proxy+} route and $default stage.
 *
 * @param {object} event - The API Gateway event object.
 * @returns {object} - HTTP response.
 */
module.exports.api = async (event) => {
  // rawPath contains the full path after the domain (including stage name if present)
  const path = event.rawPath || '';
  console.log('Incoming request path:', path);

  // Route: /hello (works regardless of stage name)
  if (path.endsWith('/hello')) {
    return module.exports.helloHandler(event);
  }

  // Default: return 404 for unknown routes
  return {
    statusCode: 404,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Not Found' }),
  };
};

/**
 * "Hello" endpoint handler.
 * Returns a simple JSON message with a timestamp.
 *
 * @param {object} event - The API Gateway event object.
 * @returns {object} - HTTP response.
 */
module.exports.helloHandler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      {
        message: 'Hello from the CybAcad backend!',
        timestamp: new Date().toISOString(),
        path: event.rawPath
      },
      null,
      2
    ),
  };
};

