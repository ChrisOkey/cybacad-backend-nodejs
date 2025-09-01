module.exports = {
  // Create a lab (JSON body)
  'POST:/labs': async ({ body, jsonResponse }) => {
    // Placeholder: validate shape minimally
    if (!body || typeof body !== 'object' || !body.name) {
      return jsonResponse(400, { success: false, error: 'Missing required field: name' });
    }
    // TODO: insert into database (e.g., Firestore) and return created resource
    return jsonResponse(201, {
      success: true,
      message: 'Lab created successfully (placeholder)',
      lab: {
        id: 'lab_demo_id',
        name: body.name,
        createdAt: new Date().toISOString(),
      },
    });
  },

  // List labs (supports query params like ?status=active&page=1)
  'GET:/labs': async ({ query, jsonResponse }) => {
    // TODO: fetch from database with filters from query
    return jsonResponse(200, {
      success: true,
      labs: [
        { id: 'lab_1', name: 'Intro Lab', status: 'active' },
        { id: 'lab_2', name: 'Advanced Lab', status: 'draft' },
      ],
      query,
    });
  },

  // Get lab by id using path param: /labs/{id}
  'GET:/labs/{id}': async ({ params, jsonResponse }) => {
    const { id } = params;
    // TODO: fetch from database
    return jsonResponse(200, {
      success: true,
      lab: { id, name: `Lab ${id}`, status: 'active' },
    });
  },
};
