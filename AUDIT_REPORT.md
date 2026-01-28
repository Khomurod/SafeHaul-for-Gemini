# Codebase Audit Report V2

## 1. Bulk Actions Analysis (Deep Dive)

The "Bulk Actions" feature (Campaigns) is currently non-functional due to a combination of architectural fragility, infrastructure mismatches, and database query limitations. Below is the detailed breakdown.

### Why it is "Not Working at All"

1.  **Fragile "Daisy-Chain" Architecture**:
    *   **The Issue**: The worker function (`processBulkBatch` in `functions/bulkActions.js`) processes **one lead at a time** and then recursively schedules the *next* execution.
    *   **The Failure Mode**: If a single execution fails (e.g., timeout, network blip, API error) or if the Cloud Task creation fails, the chain breaks. The campaign stops immediately and permanently, leaving the session stuck in an "active" state with no progress.
2.  **Infrastructure Hardcoding**:
    *   **The Issue**: The code hardcodes `PROJECT_ID = 'truckerapp-system'` and `QUEUE_NAME = 'bulk-actions-queue'`.
    *   **The Failure Mode**: Unless your Google Cloud project is exactly named `truckerapp-system` and you have manually created a Cloud Task queue named `bulk-actions-queue`, every attempt to schedule the next step triggers a 404/403 error. The campaign dies instantly after the first (or zero) attempts.
3.  **Database Query Crash (The "Select All" Bug)**:
    *   **The Issue**: The frontend `TargetingWizard.jsx` allows selecting all statuses. The backend uses `.where('status', 'in', filters.status)`.
    *   **The Failure Mode**: Firestore strictly limits `in` queries to **10 items**. If a user selects "All Statuses" (which likely exceeds 10), the `initBulkSession` function crashes with an `INVALID_ARGUMENT` error before the campaign even starts.
4.  **Silent Failures**:
    *   The `enqueueWorker` function does not throw a blocking error back to the UI if the Task creation fails (it's often "fire and forget" or caught loosely). The UI receives a "Success" response because the *Session Document* was created, giving the illusion of a launch, while the backend is actually dead on arrival.

---

### Redesign Proposal: The "Dispatcher-Worker" Pattern

To bring this feature up to industry standards (robustness, scalability, observability), I recommend a complete architectural refactor.

#### 1. Architecture: Decoupled Batch Processing
Instead of a fragile recursive chain, use a **Fan-Out** pattern.

*   **Phase 1: Initialization (The Dispatcher)**
    *   Frontend calls `initBulkSession`.
    *   Backend validates filters and executes the query to get *all* target IDs.
    *   **Improvement**: Split the list of IDs into **Batches** (e.g., chunks of 50).
    *   Backend writes these batches as `Task` documents in a subcollection: `companies/{id}/bulk_sessions/{sid}/tasks/{taskId}`.
    *   Backend enqueues one Cloud Task per *Batch* (not per user).

*   **Phase 2: Execution (The Worker)**
    *   The Worker processes a batch of 50 leads in parallel (using `Promise.all` with a concurrency limit).
    *   **Resilience**: If the worker fails, Cloud Tasks automatically retries the *entire batch*.
    *   **Idempotency**: Before sending an SMS, the worker checks a `completed_ids` map or subcollection to ensure no double-sending during retries.
    *   **Progress**: The worker updates the main Session document *once* per batch (reducing database write costs by 50x).

#### 2. Infrastructure: Dynamic Configuration
*   Remove `PROJECT_ID` hardcoding. Use `process.env.GCLOUD_PROJECT` (automatically provided by Firebase).
*   Add a check in `initBulkSession`: `if (!queueExists) throw Error`.

#### 3. Frontend UX Improvements
*   **Pre-Flight Validation**: Before the "Launch" step, run a "Dry Run" query to verify the audience count and ensure it doesn't crash Firestore limits.
*   **Real-Time Status**: Show "Initializing..." vs "Sending..." states.
*   **Resumable Sessions**: Add a "Resume" button that identifies leads without a corresponding `Attempt` log and re-queues them.

---

## 2. Architecture & Configuration Findings

*   **Firebase Version Mixing**: The codebase mixes `firebase-functions/v1` and `v2`. This increases build size and complexity. **Solution**: Standardize on v2 for better concurrency and timeout controls.
*   **Hardcoded Buckets**: `storageBucket: "truckerapp-system..."` is hardcoded. **Solution**: Use `admin.storage().bucket()` (no arguments) to use the default project bucket dynamically.
*   **Hardcoded Admin Email**: `firestore.rules` contains `holmurod96@gmail.com`. **Solution**: Remove hardcoded emails. Use Custom Claims (`token.roles.globalRole == 'super_admin'`) exclusively.

## 3. Backend Logic & Potential Bugs

*   **Shadow Profile Complexity (`driverSync.js`)**:
    *   The logic attempts to merge "Shadow Profiles" (leads without accounts) with Auth users. This is brittle.
    *   **Solution**: Treat "Leads" and "Users" as distinct entities until the user explicitly claims their profile via an "Invitation Code" flow.
*   **Guest Upload Security (`storageSecure.js`)**:
    *   `getSignedUploadUrl` allows public uploads without strict validation of the *target* entity (e.g., does the `applicationId` exist?).
    *   **Solution**: Require a valid `applicationId` or `leadId` in the payload and verify its existence before generating a signed URL.

## 4. Frontend Observations

*   **PDF Worker**: Hardcoded path `/pdf.worker.min.mjs` assumes the file is always at the root. If the app is deployed to a subdirectory, this will break. **Solution**: Use a relative path or import the worker blob directly.
*   **Role Logic**: The `DataContext` correctly handles RBAC, but the `LoginScreen` redirection logic is complex and might fail if a user has multiple conflicting roles. **Solution**: Introduce a dedicated "Portal Selector" screen for users with multiple roles (Driver vs. Admin).

## 5. Security Summary

*   **Encryption**: Secrets are correctly encrypted in `functions/integrations/index.js`.
*   **RBAC**: Firestore rules are generally robust, implementing "Company Isolation" correctly.
*   **Vulnerability**: The recursive worker in `bulkActions.js` is a denial-of-service risk (self-inflicted) if it loops uncontrollably, though the current "daisy-chain" implementation is more likely to die than loop forever.
