module.exports = {
  'GET:/hello': async ({ jsonResponse }) => {
    return jsonResponse(200, {
      success: true,
      message: 'Hello from the CybAcad backend!',
      timestamp: new Date().toISOString(),
    });
  },
};
