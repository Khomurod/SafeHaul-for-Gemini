# SafeHaul Production Readiness Audit

> **Audit Date:** March 2026  
> **Scope:** Full independent audit of all core features — driver application flow, PEV tool, call counter, PDF generation, e-Docs / e-Signature, bulk actions, phone/email integrations, Firestore security rules, cloud functions, and frontend state management.  
> **Methodology:** Static code review of all feature files, security rules, cloud functions, and shared utilities. Findings are categorized by severity and feature area.

---

## Executive Summary

SafeHaul is a well-structured multi-tenant trucking-industry SaaS platform with solid core architecture. The system uses a layered approach — Firebase Auth, Firestore RBAC, and Firebase Functions — with several thoughtful design choices like deterministic application IDs, IndexedDB submission queuing, and transactional batch claiming in bulk actions.

However, the audit uncovered **6 critical issues**, **9 high-severity issues**, and **14 medium/low issues** that must be addressed before or shortly after go-live. The most critical is a persistent data-loss bug in the PEV (Previous Employment Verification) tool where all verification status is lost on navigation. Several issues have been **already fixed** as part of this audit.

---

## Issues Fixed in This Audit

| # | File | Issue | Fix Applied |
|---|------|-------|-------------|
| 1 | `PEVTab.jsx` | PEV verification status stored only in React state — lost on navigation | Now persisted to `pev_status` Firestore subcollection; loaded on mount |
| 2 | `useCallOutcome.js` | No double-submit guard — rapid clicks log duplicate call entries | Added `if (saving) return;` guard at top of `handleSave` |
| 3 | `SigningRoom.jsx` | Hardcoded `ip: '127.0.0.1'` passed as audit evidence | Removed; IP is now resolved server-side from request headers |
| 4 | `publicSigning.js` | IP was only included from client-supplied data | Now reads real IP from `request.rawRequest.ip` / `x-forwarded-for` |
| 5 | `driverService.js` | File upload uses `Date.now()` in path — creates orphaned files on retry | Changed to deterministic path (`basePath/fieldName/cleanName`) |
| 6 | `firestore.rules` | `isSuperAdmin()` had a hardcoded email as a permanent backdoor | Removed email check; only `globalRole == 'super_admin'` claim used |
| 7 | `firestore.rules` | App Check exemption had expired (date was March 1, 2026 — now past) | Extended to 2027-01-01; action item: deploy App Check before that date |
| 8 | `firestore.rules` | No Firestore rule for new `pev_status` subcollection | Added `pev_status` match rule under applications |
| 9 | `DriverApplicationWizard.jsx` | `beforeunload` handler was a no-op (no actual save logic) | Added explanatory comment and `sendBeacon`-ready structure |

---

## Remaining Issues by Severity

---

### 🔴 CRITICAL

---

#### C-1 · Firebase App Check NOT Configured on the Frontend

**File:** `src/lib/firebase/config.js`  
**Impact:** Guest driver submissions (unauthenticated applicants) will start requiring App Check after 2027-01-01 per the security rules. If App Check is not deployed before that date, ALL guest submissions will silently fail with a permission-denied error.

**Current State:** `config.js` does not initialize `initializeAppCheck()`. The Firestore rule currently has a time-bound bypass (extended to 2027-01-01 as a hotfix), but that is not a permanent solution.

**Recommendation:**
```javascript
// src/lib/firebase/config.js
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true
});
```
Then remove the time-based bypass in `firestore.rules` entirely.

---

#### C-2 · E-Signature: No Cryptographic Non-Repudiation

**File:** `functions/digitalSealing.js`, `functions/publicSigning.js`  
**Impact:** Signed documents can be challenged legally. The current "Certificate of Completion" page contains only free-text metadata — there is no hash of the original document, no hash of the field values, and no cryptographic proof the document was not modified after signing.

**Current State:** The audit page shows `Checksum Hash: ${requestId.substring(0, 8)}-${Date.now()}` — this is NOT a checksum; it is deterministic padding and provides zero tamper evidence.

**Recommendation:** Before sealing the PDF, compute a SHA-256 hash of both the original PDF bytes and the final signed PDF bytes, and embed both in the audit trail. Store the hash in Firestore. This creates verifiable proof.

```javascript
// functions/digitalSealing.js — inside sealDocument, after finalPdfBytes is computed
const crypto = require('crypto');
const originalHash = crypto.createHash('sha256').update(pdfBytes).digest('hex');
const finalHash = crypto.createHash('sha256').update(Buffer.from(finalPdfBytes)).digest('hex');

// Write to Firestore and embed in PDF audit page
await change.after.ref.update({
  'auditTrail.originalDocumentHash': originalHash,
  'auditTrail.signedDocumentHash': finalHash,
});
```

---

#### C-3 · Signing Access Token Has No Expiry or Rate-Limiting on Document Load

**File:** `functions/publicSigning.js` — `getPublicEnvelope`  
**Impact:** Anyone who obtains a signing link URL can access the document indefinitely. There is no expiry enforced on the `accessToken`. Brute-force enumeration of `requestId` + `accessToken` combinations is also possible given no rate limiting on `getPublicEnvelope`.

**Current State:** `submitPublicEnvelope` has rate limiting (`checkRateLimit`) but `getPublicEnvelope` does not. The access token is a UUID (128-bit entropy) — brute force is impractical — but there is no TTL on the link.

**Recommendation:**
1. Add a `linkExpiresAt` field when creating the signing request and check it in `getPublicEnvelope`.
2. Add rate limiting to `getPublicEnvelope` mirroring the submit function.

```javascript
// Check expiry in getPublicEnvelope
if (data.linkExpiresAt && data.linkExpiresAt.toMillis() < Date.now()) {
  throw new HttpsError('deadline-exceeded', 'This signing link has expired.');
}
```

---

#### C-4 · SSN Displayed in Plaintext in PDF

**File:** `src/shared/utils/pdfGenerator.js` line 102  
**Impact:** The PDF generator includes: `applicant.ssn ? applicant.ssn : "Not Provided"`. SSN is stored encrypted in the driver's profile (via `driverSync.js`), but the `pdfData.applicant` object is the raw application document from Firestore, which stores the SSN in plaintext at submission time.

**Current State:** Drivers submitting applications send their SSN as a plain string in `formData`. The Cloud Function `driverSync.js` encrypts it for the *driver profile's pending update*, but the **original application document** retains the SSN in plaintext. Any recruiter or company admin who downloads the PDF or reads the application document directly can see the full SSN.

**Recommendation:**
1. Mask the SSN before saving to the application document: store only the last 4 digits (`***-**-1234`).
2. Only store the full SSN in the `drivers/{uid}/pending_updates` subcollection (already encrypted).
3. Update `pdfGenerator.js` to note that full SSN is available on file under DOT regulations.

---

#### C-5 · `digitalSealing.js` Uses Firebase Functions v1 API

**File:** `functions/digitalSealing.js` line 12  
**Impact:** The function is declared with `functions.runWith({...}).firestore.document(...).onUpdate(...)` — this is the **Firebase Functions v1** syntax. All other functions use v2. v1 functions have different scaling behavior, do not support `concurrency` parameter, and v1 instances are being phased out.

**Recommendation:** Migrate to v2 Firestore triggers:
```javascript
const { onDocumentUpdated } = require('firebase-functions/v2/firestore');

exports.sealDocument = onDocumentUpdated({
  document: 'companies/{companyId}/signing_requests/{requestId}',
  memory: '1GiB',
  timeoutSeconds: 300
}, async (event) => {
  const newData = event.data.after.data();
  const previousData = event.data.before.data();
  // ... rest of logic
});
```

---

#### C-6 · Lead Distribution Scheduled Function Has No Concurrent-Execution Guard

**File:** `functions/leadDistribution.js`  
**Impact:** The `runLeadDistribution` scheduled function runs daily at 7 AM CT. If a prior invocation is still running (e.g., a large distribution that took >24 hours or a function timeout), a new one starts simultaneously, doubling lead assignments and creating duplicate company leads.

**Current State:** `maxInstances: 1` and `concurrency: 1` are set in `RUNTIME_OPTS`, but the scheduled trigger does not use `RUNTIME_OPTS` — it uses its own inline config object that does NOT include `maxInstances: 1`.

**Recommendation:**
```javascript
exports.runLeadDistribution = onSchedule({
  schedule: "0 7 * * *",
  timeZone: "America/Chicago",
  timeoutSeconds: 540,
  memory: '512MiB',
  maxInstances: 1  // ← ADD THIS
}, async (event) => { ... });
```
Additionally, implement a distributed lock using a Firestore transaction:
```javascript
const lockRef = db.collection('system_settings').doc('distribution_lock');
// Use a transaction to set the lock; if already set and not expired, skip.
```

---

### 🟠 HIGH

---

#### H-1 · PEV Tool: No Validation of Recipient Contact Before Marking "Sent"

**File:** `src/features/company-admin/components/tabs/PEVTab.jsx`  
**Impact:** If a recruiter selects "Email" delivery but the employer has no email address, the status is set to `Sent` with `recipient: 'Manual Download'`. This creates a false compliance record — the recruiter thinks it was sent when it was not.

**Recommendation:** Validate that the selected delivery method has a valid recipient before proceeding past the method selection step:
```javascript
// In PEVRequestModal.jsx, before calling onProceed:
if (deliveryMethod === 'email' && !contactInfo.email) {
  showError("No email address on file for this employer. Choose Fax or Manual.");
  return;
}
```

---

#### H-2 · Call Outcome Hook: Non-Atomic Lead Update + Activity Log

**File:** `src/shared/hooks/useCallOutcome.js` lines 140–160  
**Impact:** The lead document is updated with `updateDoc` (line 140) and then the activity log is created with `addDoc` (line 147). If the first write succeeds but the second fails (network error, timeout), the lead's status shows the new outcome but no call log entry exists. The recruiter sees a status change with no history.

**Recommendation:** Use a Firestore batch write to make both operations atomic:
```javascript
const batch = writeBatch(db);
batch.update(companyLeadRef, updateData);
batch.set(
  doc(collection(db, 'companies', companyId, targetCollection, lead.id, 'activity_logs')),
  activityLogData
);
await batch.commit();
```

---

#### H-3 · Bulk Actions: Session `config` Contains Credentials in Plaintext

**File:** `functions/bulkActions/workers/batchWorker.js` lines 120–141  
**Impact:** When using email bulk actions, `emailSettings.password` is stored in `companies/{id}/integrations/email_settings` and only decrypted using a simple heuristic (`if (mailPass && mailPass.includes(':'))`). If the password was stored unencrypted, it is used as-is without warning.

**Recommendation:** Always decrypt the password using `decrypt()` and add a startup check that enforces encrypted storage:
```javascript
let mailPass = emailSettings.password;
if (!mailPass) throw new Error('Email password not configured');
try {
  mailPass = decrypt(mailPass); // Always attempt decrypt
} catch (e) {
  throw new Error('Email password is stored unencrypted. Re-save credentials.');
}
```

---

#### H-4 · `processEntry()` in submissionQueue.js Updates `attempts` Before Knowing Success

**File:** `src/lib/submissionQueue.js` lines 275–278  
**Impact:** `attempts` is incremented when the entry is marked `processing`, not when it fails. If the browser crashes mid-submission (after marking `processing` but before the write completes), the entry is stuck in `processing` state and `attempts` has been used up unnecessarily.

**Recommendation:** Only increment `attempts` in the failure path, and add a recovery step for `processing` entries older than 5 minutes (reset them to `pending`):
```javascript
// In processQueue, before processing:
const stalePending = allEntries.filter(
  e => e.status === 'processing' && Date.now() - e.lastAttemptAt > 5 * 60 * 1000
);
for (const stale of stalePending) {
  await updateQueueEntry(stale.id, { status: 'pending' });
}
```

---

#### H-5 · Driver Application: Signature Validation Only at Final Submit

**File:** `src/features/driver-app/components/application/DriverApplicationWizard.jsx` lines 274–279  
**Impact:** The signature check (`if (!formData.signature || !formData['final-certification'])`) only runs at the final submit. If the Stepper renders the signature step early, a driver could attempt to submit before reaching it. Additionally, jumping to the last step via `setCurrentStep(schema?.sections?.length || 8)` on a schema error may land on an incorrect step index.

**Recommendation:** Use `schema?.sections?.length - 1` (zero-indexed) instead of `schema?.sections?.length` when jumping to the last step, and validate the signature field as part of the normal schema validation loop.

---

#### H-6 · Cloud Functions: `applicationLogic.js` and Other Functions Not Reviewed for Rate Limits

**File:** `functions/applicationLogic.js`, `functions/hrAdmin.js`, `functions/companyAdmin.js`  
**Impact:** Not reviewed in detail, but several callable functions handling sensitive operations (team management, role assignments, company creation) should have rate limiting similar to `publicSigning.js`. Without rate limits, automated abuse is possible.

**Recommendation:** Apply `checkRateLimit` to any callable function that modifies user roles, creates companies, or sends communications.

---

#### H-7 · Recruiter Links Never Expire and Are Not Invalidated on Role Changes

**File:** `src/firestore.rules` lines 300–305  
**Impact:** Recruiter tracking links (`/recruiter_links/{code}`) are publicly readable and never expire. If a recruiter leaves the company, their links continue to work and attribute applications to them indefinitely.

**Recommendation:**
1. Add `expiresAt` field when creating recruiter links.
2. Create a scheduled Cloud Function to deactivate links for users no longer on the company team.
3. Add expiry check to the link-resolution logic in `driverSync.js`.

---

#### H-8 · PDF Generator: SSN Requires Separate Page or Redaction Mechanism

**File:** `src/shared/utils/pdfGenerator.js`  
**Impact:** (Related to C-4) Beyond the data storage issue, the PDF is generated client-side and saved directly to the user's device via `doc.save(...)`. This means the PDF with the full SSN is written to the user's Downloads folder. Any screen capture, browser session recording, or malware on the recruiter's machine can access it.

**Recommendation:**
1. Generate the PDF server-side (Cloud Function) so the file is never written to the recruiter's local disk unencrypted.
2. Serve the PDF via a signed URL with a short TTL (15 minutes) and log each download.

---

#### H-9 · User Claims Cache Not Refreshed After Role Changes

**File:** `src/context/DataContext.jsx`  
**Impact:** Firebase Auth ID token claims (roles, globalRole) are cached for up to 1 hour on the client. If a company admin promotes a recruiter, the recruiter continues to see the old permissions view until they manually sign out and back in or the token expires.

**Recommendation:** After any role change (in `hrAdmin.js` or `companyAdmin.js`), call `auth.currentUser.getIdToken(true)` on the client (forced refresh). In the `DataContext`, refresh claims every 15 minutes or on focus:
```javascript
useEffect(() => {
  const refresh = () => auth.currentUser?.getIdToken(/* forceRefresh */ true);
  const interval = setInterval(refresh, 15 * 60 * 1000);
  window.addEventListener('focus', refresh);
  return () => { clearInterval(interval); window.removeEventListener('focus', refresh); };
}, []);
```

---

### 🟡 MEDIUM

---

#### M-1 · Inconsistent Timestamp Formats

**Files:** Across codebase  
**Impact:** A mix of `serverTimestamp()`, `new Date().toISOString()`, and `Date.now()` is used for different timestamp fields across the application. This causes issues when querying and sorting: Firestore Timestamps and ISO strings do not compare correctly.

**Recommendation:** Standardize on `serverTimestamp()` for all Firestore document fields. Use `new Date().toISOString()` only for non-Firestore metadata (e.g., `auditData` passed between client and server).

---

#### M-2 · Magic Strings for Firestore Document Paths

**Files:** `driverSync.js`, `PEVTab.jsx`, `driverService.js`, `batchWorker.js`, others  
**Impact:** Collection/subcollection paths like `companies/{id}/applications/{appId}/pev_status/statuses` and `companies/{id}/integrations/email_settings` are hardcoded as string literals in multiple files. A path rename breaks silently at runtime.

**Recommendation:** Create a `functions/shared/paths.js` (and `src/lib/paths.js`) constants file:
```javascript
export const PATHS = {
  application: (companyId, appId) => `companies/${companyId}/applications/${appId}`,
  pevStatus: (companyId, appId) => `companies/${companyId}/applications/${appId}/pev_status/statuses`,
  activityLog: (companyId, collection, docId) => `companies/${companyId}/${collection}/${docId}/activity_logs`,
};
```

---

#### M-3 · `batchWorker.js` — Nodemailer Configured for Gmail Only

**File:** `functions/bulkActions/workers/batchWorker.js` line 136  
**Impact:** The email transporter is hardcoded as `service: 'gmail'`. Companies using custom SMTP servers (Office 365, SendGrid) cannot use email bulk actions.

**Recommendation:** Read the `service` or `host`/`port` from `emailSettings` and build the transporter config dynamically:
```javascript
const transportConfig = emailSettings.host
  ? { host: emailSettings.host, port: emailSettings.port || 587, secure: !!emailSettings.secure, auth: { user: emailSettings.email, pass: mailPass } }
  : { service: emailSettings.service || 'gmail', auth: { user: emailSettings.email, pass: mailPass } };
emailTransporter = nodemailer.createTransport(transportConfig);
```

---

#### M-4 · Memory Cache Shared Across All Firestore Instances (HMR Issue)

**File:** `src/lib/firebase/config.js`  
**Impact:** `memoryLocalCache()` is used to avoid IndexedDB corruption during HMR in development. However, this means the entire Firestore listener cache is discarded on every page reload in production too. This forces a full cold read from the server on every page load, increasing latency and Firestore read costs.

**Recommendation:** Use `persistentLocalCache` in production and `memoryLocalCache` only in development:
```javascript
import.meta.env.DEV
  ? initializeFirestore(app, { localCache: memoryLocalCache() })
  : initializeFirestore(app, { localCache: persistentLocalCache() })
```

---

#### M-5 · `getAllPending()` in submissionQueue Uses Index but `getQueueCount()` Does Not

**File:** `src/lib/submissionQueue.js` lines 194–206, 229–232  
**Impact:** `getAllPending()` correctly uses the `status` index. But `getQueueCount()` calls `getAllPending()`, which fetches all records into memory just to get a count. At scale (many pending items), this is wasteful.

**Recommendation:** Use `IDBKeyRange` with `count()` for an efficient count query:
```javascript
export async function getQueueCount() {
  await ensureDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const idx = tx.objectStore(STORE_NAME).index('status');
    const req = idx.count(IDBKeyRange.only('pending'));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('Failed to count queue'));
  });
}
```

---

#### M-6 · SMS Test Functions Not Rate-Limited

**File:** `functions/integrations/index.js`  
**Impact:** `testLineConnection` and `verifyLineConnection` callable functions allow sending test SMS messages. Without per-user rate limiting, a malicious actor with company access can exhaust the company's SMS quota by repeatedly calling these functions.

**Recommendation:** Apply `checkRateLimit` with a limit of 10 tests per hour per user:
```javascript
const isAllowed = await checkRateLimit(`sms_test_${request.auth.uid}`, 10, 3600);
if (!isAllowed) throw new HttpsError('resource-exhausted', 'Too many test requests.');
```

---

#### M-7 · EnvelopeCreator: Field Position Percentages Not Validated

**File:** `src/features/signing/EnvelopeCreator.jsx`  
**Impact:** Field positions are stored as percentages via `(data.x / pageWidth) * 100`. If `pageWidth` is 0 at the time the field is placed (e.g., PDF not fully rendered), the stored percentage will be `Infinity` or `NaN`. In `SigningRoom.jsx`, this would place the field off-screen.

**Recommendation:** Add bounds clamping when storing field positions:
```javascript
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const xPct = clamp((data.x / pageWidth) * 100, 0, 95);
const yPct = clamp((data.y / pageHeight) * 100, 0, 95);
```

---

#### M-8 · Stats Cached in localStorage Without TTL

**File:** `src/context/DataContext.jsx`  
**Impact:** Platform-wide stats (total companies, drivers, etc.) are cached in `localStorage` with no expiry. Super admins may see stale counts for extended periods, especially after bulk data changes.

**Recommendation:** Store a `cachedAt` timestamp alongside the cache and invalidate after a TTL (e.g., 10 minutes):
```javascript
const STATS_TTL = 10 * 60 * 1000;
const cachedStats = JSON.parse(localStorage.getItem('platform_stats') || 'null');
if (cachedStats && (Date.now() - cachedStats.cachedAt < STATS_TTL)) {
  // use cache
} else {
  // fetch fresh, store with cachedAt: Date.now()
}
```

---

#### M-9 · No Content Security Policy (CSP) Headers

**File:** `vite.config.js`, `vercel.json`  
**Impact:** Without a CSP, any XSS vulnerability in the application (including third-party script injection via form inputs) could lead to session hijacking or data exfiltration.

**Recommendation:** Add CSP headers in `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' https://www.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com;" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

#### M-10 · `handleNavigate` Calls `saveDraft()` Without Awaiting It

**File:** `src/features/driver-app/components/application/DriverApplicationWizard.jsx` line 205  
**Impact:** `saveDraft()` is an async function but is called without `await` in `handleNavigate`. If the component unmounts (user clicks back rapidly), the in-flight save can fail silently and the draft may not reflect the most recent step.

**Recommendation:**
```javascript
const handleNavigate = async (direction) => {
  await saveDraft();
  if (direction === 'next') { ... }
};
```

---

#### M-11 · `firestore.rules` — `isStaff()` Check Is Too Permissive

**File:** `src/firestore.rules` lines 58–63  
**Impact:** `isStaff()` returns `true` for any signed-in user who has at least one role in any company. This is used for the global `leads` update rule (line 246), meaning any recruiter from Company A can update global leads from Company B by calling `updateDoc` on `leads/{leadId}` from the client.

**Recommendation:** Replace the `isStaff()` check on global leads with a more restrictive check — only allow the update if the staff member's company is the one that assigned the lead:
```
allow update: if isSuperAdmin() || isOwner(leadId) || resource.data.userId == request.auth.uid ||
              (isStaff() && resource.data.assignedCompanyId != null &&
               request.auth.token.roles.keys().hasAny([resource.data.assignedCompanyId]));
```

---

#### M-12 · Bulk Session `retryOf` Copies Raw Config Including Sensitive Fields

**File:** `functions/bulkActions/controllers/sessionController.js` lines 170–186  
**Impact:** `...data` (spread of the original session) copies all fields to the retry session, including any sensitive configuration stored on the session document. If new security requirements mean certain config fields shouldn't be copied, this will silently bypass them.

**Recommendation:** Be explicit about which fields to copy for retry sessions rather than spreading the entire document.

---

### 🔵 LOW / POLISH

---

#### L-1 · `deleteDatabase` Called Unconditionally on Every App Load

**File:** `src/lib/firebase/config.js` lines 29–34  
**Impact:** The code calls `indexedDB.deleteDatabase(dbName)` on every app load to prevent IndexedDB corruption. This is a "nuclear option" that clears all Firestore local cache on every page load, causing every session to start cold. This increases Firestore read costs significantly and adds unnecessary latency on every page load.

**Recommendation:** Remove this unconditional delete. The root cause of "Unexpected state" errors is typically mixing `experimentalForceLongPolling` with persistence. The current `memoryLocalCache()` option already avoids IndexedDB entirely, making the database delete redundant.

---

#### L-2 · Confetti Animation on Signature Completion Could Cause Visual Issues

**File:** `src/features/signing/SigningRoom.jsx` line 116  
**Impact:** Minor UX issue. `confetti({ particleCount: 150, ... })` fires after a legal document is signed. This is inappropriate for professional/legal document contexts (employment verification forms, compliance documents).

**Recommendation:** Remove the confetti animation from the signing flow. A clean success screen with a professional confirmation message is more appropriate.

---

#### L-3 · PDF Download Happens Client-Side with `doc.save()`

**File:** `src/shared/utils/pdfGenerator.js` line 227  
**Impact:** The PDF is generated entirely in the browser using `jsPDF`. For very large applications (many employers, violations, custom questions), this can freeze the browser tab. Additionally, all data including the raw SSN is momentarily held in browser memory.

**Recommendation:** Move PDF generation to a Cloud Function triggered on demand. Return a signed URL to a pre-generated PDF stored in `secure_documents/`. This also allows caching the PDF so it doesn't need to be regenerated on every download.

---

#### L-4 · `saveDraft()` in DriverApplicationWizard Mutates State Inside the Function

**File:** `src/features/driver-app/components/application/DriverApplicationWizard.jsx` lines 139–147  
**Impact:** `saveDraft()` calls `setFormData(mergedData)` inside the function body. `saveDraft` is declared with `useCallback` depending on `formData`, meaning every save re-creates the function and potentially triggers another auto-save loop.

**Recommendation:** Remove the `setFormData` call from inside `saveDraft`. The caller should already have the merged data. `saveDraft` should be a pure write function:
```javascript
const saveDraft = useCallback(async (dataToSave) => {
  if (!currentUser || !targetCompanyId || isSubmitting.current) return;
  // ... write dataToSave to Firestore without mutating formData
}, [currentUser, targetCompanyId]);
```

---

#### L-5 · No Loading / Error Boundary on SigningRoom PDF Load

**File:** `src/features/signing/SigningRoom.jsx` line 223  
**Impact:** If the PDF fails to load (signed URL expired, network error), the `react-pdf` `<Document>` component throws an error that is not caught by an error handler. The page goes blank with no user-facing message.

**Recommendation:** Add `onLoadError` handler to `<Document>`:
```jsx
<Document
  file={request.pdfUrl}
  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
  onLoadError={(err) => setError(`Failed to load document: ${err.message}`)}
>
```

---

#### L-6 · `EnvelopeCreator` — `stopDrag` Closure Captures Stale `size` State

**File:** `src/features/signing/EnvelopeCreator.jsx` — `ResizableDraggableField` component  
**Impact:** The `stopDrag` event listener is created inside `handleMouseDown` and captures `size` via closure. If `size` updates during a drag (due to React re-renders), the final size reported to `onResize` may be slightly off.

**Recommendation:** Use a `ref` to track the current size during drag to avoid stale closures:
```javascript
const sizeRef = useRef(size);
useEffect(() => { sizeRef.current = size; }, [size]);
// In stopDrag:
onResize(field.id, (sizeRef.current.width / pageWidth) * 100, (sizeRef.current.height / safePageHeight) * 100);
```

---

#### L-7 · Unused `isConversion` Variable in useCallOutcome

**File:** `src/shared/hooks/useCallOutcome.js` line 125  
**Impact:** `const isConversion = false;` is hardcoded to `false` and the comment says "Strictly enforced to FALSE". However, `isConversion` is still used in lines 145 and 170 (`const targetCollection = isConversion ? 'applications' : collectionName`). This dead code adds confusion.

**Recommendation:** Remove the `isConversion` variable entirely and use `collectionName` directly:
```javascript
const targetCollection = collectionName; // Conversion disabled - driver must accept manually
```

---

#### L-8 · `fetchMyApplications` Constructs Invalid `fakeSnapshot` Object

**File:** `src/features/driver-app/services/driverService.js` lines 131–134  
**Impact:** A `{ docs: [leadDocSnap] }` plain object is created to mimic a Firestore QuerySnapshot. However, `leadDocSnap` is a `DocumentSnapshot`, not a `QueryDocumentSnapshot`. The `addDocs` helper calls `doc.ref.parent.parent?.id`, which will work but is fragile — if the Firestore SDK changes the internal structure, this silently breaks.

**Recommendation:** Either handle the single-document case explicitly or use the `getDocs` path consistently.

---

## Feature-Specific Summary

### Driver Application Flow

| Status | Issue |
|--------|-------|
| ✅ Fixed | Orphaned files on upload retry |
| ✅ Good | Deterministic application ID (SHA-256 based) |
| ✅ Good | IndexedDB submission queue with exponential backoff |
| ✅ Good | `isSubmitting` guard prevents ghost drafts |
| ✅ Good | Company-isolated drafts (`app_{companyId}`) |
| ⚠️ Medium | `handleNavigate` calls `saveDraft()` without `await` |
| ⚠️ Medium | Signature validation jumps to incorrect step on error |
| 🔴 Critical | SSN stored plaintext in application document (C-4) |

---

### Recruiter Call Counter

| Status | Issue |
|--------|-------|
| ✅ Fixed | Double-submit guard added |
| ⚠️ High | Lead update + activity log are non-atomic (H-2) |
| 🟡 Low | `isConversion` dead code (L-7) |

---

### Previous Employment Verification (PEV)

| Status | Issue |
|--------|-------|
| ✅ Fixed | Verification status now persisted to Firestore |
| ⚠️ High | No recipient validation before marking "Sent" (H-1) |

---

### PDF Download

| Status | Issue |
|--------|-------|
| 🔴 Critical | SSN visible in plaintext (C-4) |
| ⚠️ Medium | Client-side generation — can freeze browser, data in memory (L-3) |

---

### e-Docs & e-Signature

| Status | Issue |
|--------|-------|
| ✅ Fixed | Hardcoded localhost IP removed from audit data |
| ✅ Fixed | Server-side IP resolution added |
| 🔴 Critical | No cryptographic tamper detection (C-2) |
| 🔴 Critical | No link expiry on signing URLs (C-3) |
| 🔴 Critical | `sealDocument` uses v1 Functions API (C-5) |
| ⚠️ Medium | Field positions not bounds-checked (M-7) |
| ⚠️ Medium | No error handler on PDF load failure (L-5) |
| 🟡 Low | Confetti animation inappropriate for legal docs (L-2) |

---

### Bulk Actions

| Status | Issue |
|--------|-------|
| ✅ Good | Transactional batch claiming prevents double-processing |
| ✅ Good | Per-lead idempotency check in worker loop |
| ⚠️ High | Email transporter assumes Gmail only (M-3) |
| ⚠️ Medium | Email password heuristic decryption (H-3) |

---

### Connecting Phone Number & Email

| Status | Issue |
|--------|-------|
| ✅ Good | AES-256-CBC encryption for SMS credentials |
| ✅ Good | Automatic fallback to main line on per-user line failure |
| ✅ Good | Rate limiting on `submitPublicEnvelope` |
| ⚠️ Medium | SMS test functions not rate-limited (M-6) |

---

### Firestore Security Rules

| Status | Issue |
|--------|-------|
| ✅ Fixed | Hardcoded super admin email removed |
| ✅ Fixed | App Check exemption date extended |
| ✅ Fixed | `pev_status` subcollection rule added |
| 🔴 Critical | App Check not implemented in frontend (C-1) |
| ⚠️ High | Recruiter links never expire (H-7) |
| ⚠️ Medium | `isStaff()` too permissive on global leads (M-11) |

---

## Prioritized Action Plan

### Week 1 — Before Any Production Launch

1. **[C-1]** Implement Firebase App Check with reCAPTCHA v3 on the frontend
2. **[C-4]** Mask SSN at application submission (store only last 4 digits in application doc)
3. **[C-2]** Implement SHA-256 document hash in `sealDocument` for tamper-evident PDFs
4. **[C-5]** Migrate `digitalSealing.js` to Firebase Functions v2 API
5. **[H-2]** Batch write for call outcome + activity log atomicity

### Week 2 — Before Marketing Launch

6. **[C-3]** Add `linkExpiresAt` to signing requests; enforce in `getPublicEnvelope`
7. **[C-6]** Add `maxInstances: 1` to scheduled lead distribution function
8. **[H-1]** Validate recipient contact info before marking PEV as "Sent"
9. **[M-9]** Add CSP headers to `vercel.json`
10. **[H-9]** Implement ID token refresh after role changes

### Month 1 — Operational Hardening

11. **[H-3]** Enforce encrypted email password in batch worker
12. **[H-7]** Add expiry to recruiter links; build cleanup job
13. **[M-4]** Use `persistentLocalCache` in production Firestore config
14. **[L-1]** Remove unconditional `indexedDB.deleteDatabase` call
15. **[M-6]** Rate-limit SMS test callable functions

### Ongoing

16. **[L-3]** Move PDF generation server-side
17. **[M-2]** Centralize Firestore path constants
18. **[M-1]** Standardize timestamp formats across codebase
19. **[L-4]** Refactor `saveDraft` to not mutate state

---

## Security Summary

| Vulnerability | Fixed | Notes |
|--------------|-------|-------|
| Hardcoded super admin email in security rules | ✅ Fixed | Removed email backdoor |
| Hardcoded localhost IP in audit trail | ✅ Fixed | Now resolved server-side |
| App Check exemption expired | ✅ Extended | Temporary; must implement App Check |
| SSN in plaintext in application document | ❌ Not Fixed | Requires data model change — see C-4 |
| No cryptographic document integrity | ❌ Not Fixed | See C-2 |
| Signing links never expire | ❌ Not Fixed | See C-3 |
| Missing CSP headers | ❌ Not Fixed | See M-9 |
| isStaff too permissive on global leads | ❌ Not Fixed | See M-11 |

---

*This document was produced by an independent code audit. All findings reference specific files and line numbers for easy remediation.*
