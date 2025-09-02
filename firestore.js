// firestore.js
const admin = require('firebase-admin');

// Initialise the Firebase Admin SDK only once, even if this file is imported multiple times
if (!admin.apps.length) {
  try {
    // Expect FIREBASE_CONFIG to be a JSON string of your service account key
    const serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('✅ Firestore initialised successfully');
  } catch (err) {
    console.error('❌ Failed to initialise Firestore:', err);
    throw new Error(
      'Firestore initialisation failed. Check that FIREBASE_CONFIG env var is set and contains valid JSON.'
    );
  }
}

// Export the Firestore instance so it can be used in your routes
module.exports = admin.firestore();
