# Codebase Audit Report

## 1. Critical Environment & Dependency Issues
*   **Missing Dependencies**: The root `package.json` lists `vitest` and `eslint`, but running `npm test` and `npm run lint` fails with "command not found" or "module not found". This suggests `node_modules` is missing or the environment is not set up correctly.
*   **Implication**: Automated testing and linting are currently impossible without environment repair.

## 2. Architecture & Configuration
*   **Firebase Functions Version Mixing**:
    *   `functions/index.js` uses **v1** (`require('firebase-functions/v1')`).
    *   `functions/driverSync.js`, `companyAdmin.js`, etc., use **v2** (`require('firebase-functions/v2/...')`).
    *   **Risk**: While supported, mixing generations increases bundle size, cold start times, and maintenance complexity. Recommendation: Standardize on v2.
*   **Hardcoded Configuration**:
    *   `functions/firebaseAdmin.js`: `storageBucket: "truckerapp-system.firebasestorage.app"` is hardcoded.
    *   `functions/bulkActions.js`, `notifySigner.js`, `leadLogic.js`: `PROJECT_ID` defaults to `'truckerapp-system'`.
    *   **Risk**: Deploying to a staging or different production environment will require code changes. Recommendation: Use `process.env` variables exclusively.
*   **Hardcoded Admin Email**:
    *   `src/firestore.rules` and `src/storage.rules` hardcode `holmurod96@gmail.com` as a super admin fallback.
    *   **Risk**: Security vulnerability if this email is compromised or the developer leaves. Recommendation: Rely solely on Custom Claims (`super_admin` role).

## 3. Backend Logic & Potential Bugs
*   **Shadow Profile Logic (`functions/driverSync.js`)**:
    *   The logic to create "Shadow Profiles" (drivers without Auth accounts) by checking for existing emails/phones is complex.
    *   It writes to a `pending_updates` subcollection to avoid overwriting master profiles. This is a good "Phase 2" fix, but requires a corresponding frontend UI to review/approve these updates. If that UI is missing, updates will be lost in limbo.
*   **Guest Upload Security (`functions/storageSecure.js`)**:
    *   `getSignedUploadUrl` is an `onCall` function but explicitly ignores authentication context (`context.auth`).
    *   It relies on file extension validation (`ALLOWED_MIME_TYPES`).
    *   **Risk**: While intended for guests, this is an open endpoint. Recommendation: Implement rate limiting or a token-based access system (e.g., verifying a valid `applicationId` exists before allowing upload).
*   **Zombie Code**:
    *   `functions/index.js` contains numerous comments about "REMOVED" functions (e.g., `getCompanyProfile`).
    *   **Risk**: Confusing for new developers. Recommendation: Remove commented-out code and rely on git history.

## 4. Frontend Observations
*   **PDF Worker Path**: `src/main.jsx` hardcodes `pdfjs.GlobalWorkerOptions.workerSrc = /pdf.worker.min.mjs`. I verified this file exists in `public/`, so this works, but relative paths can be fragile if base URL changes.
*   **State Management**: `src/context/DataContext.jsx` has complex role switching logic. It handles `isSuperAdmin` correctly via claims.

## 5. Security Summary
*   **Integrations**: `functions/integrations/index.js` correctly uses encryption for secrets (`encrypt`/`decrypt`).
*   **RBAC**: Role-Based Access Control is implemented in Firestore rules (`isCompanyAdmin`, `isSuperAdmin`) and mirrored in backend functions.
*   **Vulnerability**: The hardcoded admin email in rules is the most significant specific security smell.
