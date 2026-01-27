const functions = require("firebase-functions");
const { admin, db } = require("./firebaseAdmin");

/**
 * templates.js
 * All CRUD operations for message templates have been refactored
 * to use the direct Firestore SDK on the frontend for performance
 * and cost efficiency.
 */
