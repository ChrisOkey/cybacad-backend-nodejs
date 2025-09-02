const db = require('../firestore');

module.exports = {
  'POST:/labs': async ({ body, jsonResponse }) => {
    try {
      if (!body || typeof body !== 'object' || !body.name) {
        return jsonResponse(400, { success: false, error: 'Missing required field: name' });
      }

      const newLab = {
        name: body.name,
        status: body.status || 'active',
        createdAt: new Date().toISOString(),
      };

      const docRef = await db.collection('labs').add(newLab);

      return jsonResponse(201, {
        success: true,
        message: 'Lab created successfully',
        lab: { id: docRef.id, ...newLab },
      });
    } catch (err) {
      console.error('Error creating lab:', err);
      return jsonResponse(500, { success: false, error: 'Failed to create lab' });
    }
  },

  'GET:/labs': async ({ query, jsonResponse }) => {
    try {
      let labsRef = db.collection('labs');
      if (query.status) {
        labsRef = labsRef.where('status', '==', query.status);
      }
      const snapshot = await labsRef.get();
      const labs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return jsonResponse(200, { success: true, labs });
    } catch (err) {
      console.error('Error listing labs:', err);
      return jsonResponse(500, { success: false, error: 'Failed to fetch labs' });
    }
  },

  'GET:/labs/{id}': async ({ params, jsonResponse }) => {
    try {
      const doc = await db.collection('labs').doc(params.id).get();
      if (!doc.exists) {
        return jsonResponse(404, { success: false, error: 'Lab not found' });
      }
      return jsonResponse(200, { success: true, lab: { id: doc.id, ...doc.data() } });
    } catch (err) {
      console.error('Error fetching lab:', err);
      return jsonResponse(500, { success: false, error: 'Failed to fetch lab' });
    }
  },
};
