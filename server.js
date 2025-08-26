'use strict';

// The main handler for API Gateway
// This function acts as a router, directing requests to the correct handler function
module.exports.api = async (event) => {
  // Check the path of the incoming request
  if (event.path === '/hello') {
    // If the path is '/hello', call our helloHandler
    return module.exports.helloHandler(event);
  }
  
  // If the path doesn't match any known endpoints, return a 404 Not Found error
  return {
    statusCode: 404,
    body: JSON.stringify({ message: "Not Found" }),
  };
};

// The "hello world" endpoint handler
// This function returns a simple JSON response
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