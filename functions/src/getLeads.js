const functions = require("firebase-functions");
const admin = require("firebase-admin");

exports.getLeads = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const { companyId, page, limit, sortBy, sortOrder, filters, search, tab } = data;

  let query = admin.firestore().collection('companies').doc(companyId).collection(tab === 'applications' ? 'applications' : 'leads');

  // Handle tabs
  if (tab === 'find_driver') {
    query = query.where("isPlatformLead", "==", true);
  } else if (tab === 'company_leads') {
    query = query.where("isPlatformLead", "==", false);
  } else if (tab === 'my_leads' && context.auth) {
    query = query.where("assignedTo", "==", context.auth.uid);
  }

  // Apply filters
  if (filters) {
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        if (key === 'driverType') {
          query = query.where(key, "array-contains", filters[key]);
        } else {
          query = query.where(key, "==", filters[key]);
        }
      }
    });
  }

  // Apply search
  if (search) {
    const term = search.trim();
    const isPhone = /^[0-9+() -]{7,}$/.test(term);
    const isEmail = term.includes('@');

    if (isEmail) {
      query = query.where("email", "==", term.toLowerCase());
    } else if (isPhone) {
      query = query.where("phone", "==", term);
    } else {
      const termFixed = term.charAt(0).toUpperCase() + term.slice(1);
      query = query.where("lastName", ">=", termFixed).where("lastName", "<=", termFixed + '\uf8ff');
    }
  }


  // Apply sorting
  if (sortBy) {
    query = query.orderBy(sortBy, sortOrder || "asc");
  }

  // Get total count for pagination
  const totalSnapshot = await query.get();
  const total = totalSnapshot.size;

  // Apply pagination
  if (page && limit) {
    query = query.limit(limit).offset((page - 1) * limit);
  }

  const snapshot = await query.get();
  const leads = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    leads,
    total,
    page,
    limit,
  };
});
