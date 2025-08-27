'use strict';

/**
 * Main Lambda handler for API Gateway.
 * Routes incoming requests based on path.
 */
module.exports.api = async (event) => {
  const path = event.rawPath || event.path;
  const method = event.requestContext?.http?.method || event.httpMethod;
  const cleanPath = path.split('?')[0].replace(/\/+$/, '');

  console.log(`Incoming request: ${method} ${cleanPath}`);

  switch (cleanPath) {
    case '/hello':
      return module.exports.helloHandler(event);
    case '/healthcheck':
      return module.exports.healthcheckHandler(event);
    case '/courses':
      return module.exports.coursesHandler(event);
    default:
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Not Found' }),
      };
  }
};

/**
 * Simple hello endpoint.
 */
module.exports.helloHandler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hello from CybAcad!',
      timestamp: new Date().toISOString(),
    }),
  };
};

/**
 * Healthcheck endpoint.
 */
module.exports.healthcheckHandler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'ok', service: 'cybacad-backend' }),
  };
};

/**
 * Courses endpoint (stub).
 */
module.exports.coursesHandler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      courses: [
        { id: 'web_dev_fundamentals', title: 'Web Development Fundamentals' },
        { id: 'digital_forensics_intro', title: 'Introduction to Digital Forensics' },
      ],
    }),
  };
};

