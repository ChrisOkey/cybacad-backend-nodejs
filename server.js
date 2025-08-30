'use strict';

/**
 * The main handler for API Gateway.
 * This function acts as a router, directing incoming requests
 * to the correct handler function based on the request path.
 *
 * @param {object} event - The incoming API Gateway event object.
 * @returns {object} The response object with statusCode, headers, and body.
 */
module.exports.api = async (event) => {
  // Use event.rawPath for a consistent path in httpApi integrations.
  const path = event.rawPath;

  // Check the path of the incoming request
  if (path === '/default/hello') {
    return module.exports.helloHandler(event);
  }
  
  // If the path doesn't match any known endpoints, return a 404 Not Found error.
  return {
    statusCode: 404,
    body: JSON.stringify({ message: "Not Found" }),
  };
};

/**
 * The "hello world" endpoint handler
 * This function returns a simple JSON response to confirm the backend is working.
 *
 * @param {object} event - The incoming API Gateway event object.
 * @returns {object} The response object for the client.
 */
module.exports.helloHandler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Hello from the CybAcad backend!',
        timestamp: new Date().toISOString(),
      },
      null, 2
    ),
  };
};