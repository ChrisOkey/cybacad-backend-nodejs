const db = require('../firestore');

module.exports = {
  // CREATE
  'POST:/labs': async ({ body, jsonResponse }) => {
    console.log('➡️ POST /labs handler started');
    console.log('📦 Incoming body:', body);

    try {
      if (!body || typeof body !== 'object' || !body.name) {
        console.warn('⚠️ Validation failed: Missing required field "name"');
        return jsonResponse(400, { success: false, error: 'Missing required field: name' });
      }

      const newLab = {
        name: body.name,
        status: body.status || 'active',
        createdAt: new Date().toISOString(),
      };
      console.log('🛠 Prepared newLab object:', newLab);

      console.log('📝 Attempting to write newLab to Firestore...');
      const docRef = await db.collection('labs').add(newLab);
      console.log(`✅ Firestore write complete. New doc ID: ${docRef.id}`);

      return jsonResponse(201, {
        success: true,
        message: 'Lab created successfully',
        lab: { id: docRef.id, ...newLab },
      });
    } catch (err) {
      console.error('❌ Error creating lab:', err);
      return jsonResponse(500, { success: false, error: 'Failed to create lab' });
    }
  },

  // READ ALL
  'GET:/labs': async ({ query, jsonResponse }) => {
    console.log('➡️ GET /labs handler started');
    console.log('🔍 Query params:', query);

    try {
      let labsRef = db.collection('labs');
      if (query.status) {
        console.log(`📌 Filtering labs by status: ${query.status}`);
        labsRef = labsRef.where('status', '==', query.status);
      }

      console.log('📥 Fetching labs from Firestore...');
      const snapshot = await labsRef.get();
      console.log(`✅ Retrieved ${snapshot.size} labs from Firestore`);

      const labs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return jsonResponse(200, { success: true, labs });
    } catch (err) {
      console.error('❌ Error listing labs:', err);
      return jsonResponse(500, { success: false, error: 'Failed to fetch labs' });
    }
  },

  // READ ONE
  'GET:/labs/{id}': async ({ params, jsonResponse }) => {
    console.log('➡️ GET /labs/{id} handler started');
    console.log('🔍 Requested lab ID:', params.id);

    try {
      const doc = await db.collection('labs').doc(params.id).get();
      if (!doc.exists) {
        console.warn(`⚠️ Lab with ID ${params.id} not found`);
        return jsonResponse(404, { success: false, error: 'Lab not found' });
      }

      console.log(`✅ Lab with ID ${params.id} retrieved successfully`);
      return jsonResponse(200, { success: true, lab: { id: doc.id, ...doc.data() } });
    } catch (err) {
      console.error(`❌ Error fetching lab with ID ${params.id}:`, err);
      return jsonResponse(500, { success: false, error: 'Failed to fetch lab' });
    }
  },

  // UPDATE
  'PATCH:/labs/{id}': async ({ params, body, jsonResponse }) => {
    console.log('➡️ PATCH /labs/{id} handler started');
    console.log('🔍 Requested lab ID:', params.id);
    console.log('📦 Incoming update body:', body);

    try {
      if (!body || typeof body !== 'object') {
        console.warn('⚠️ Invalid update body');
        return jsonResponse(400, { success: false, error: 'Invalid update body' });
      }

      const docRef = db.collection('labs').doc(params.id);
      const doc = await docRef.get();
      if (!doc.exists) {
        console.warn(`⚠️ Lab with ID ${params.id} not found`);
        return jsonResponse(404, { success: false, error: 'Lab not found' });
      }

      await docRef.update(body);
      console.log(`✅ Lab with ID ${params.id} updated successfully`);

      const updatedDoc = await docRef.get();
      return jsonResponse(200, { success: true, lab: { id: updatedDoc.id, ...updatedDoc.data() } });
    } catch (err) {
      console.error(`❌ Error updating lab with ID ${params.id}:`, err);
      return jsonResponse(500, { success: false, error: 'Failed to update lab' });
    }
  },

  // DELETE
  'DELETE:/labs/{id}': async ({ params, jsonResponse }) => {
    console.log('➡️ DELETE /labs/{id} handler started');
    console.log('🔍 Requested lab ID:', params.id);

    try {
      const docRef = db.collection('labs').doc(params.id);
      const doc = await docRef.get();
      if (!doc.exists) {
        console.warn(`⚠️ Lab with ID ${params.id} not found`);
        return jsonResponse(404, { success: false, error: 'Lab not found' });
      }

      await docRef.delete();
      console.log(`✅ Lab with ID ${params.id} deleted successfully`);

      return jsonResponse(200, { success: true, message: 'Lab deleted successfully' });
    } catch (err) {
      console.error(`❌ Error deleting lab with ID ${params.id}:`, err);
      return jsonResponse(500, { success: false, error: 'Failed to delete lab' });
    }
  },
};
