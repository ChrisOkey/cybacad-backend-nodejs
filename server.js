'use strict';

module.exports.handler = async (event) => {
  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Hello from the CybAcad backend!',
        input: event,
      },
      null,
      2
    ),
  };
};