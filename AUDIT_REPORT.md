# SafeHaul Deep Audit Report

**Date:** February 28, 2025
**Auditor:** Jules (AI Software Engineer)
**Scope:** Backend (Functions, Rules), Infrastructure, and Core Logic.

---

## 🚨 1. Critical Security Risks
*These issues pose an immediate threat to data integrity or unauthorized access and should be fixed immediately.*

### 1.1. Authorization Bypass in SMS Config
*   **File:** `functions/integrations/index.js` -> `saveIntegrationConfig`
*   **Severity:** **CRITICAL**
*   **Issue:** The function `saveIntegrationConfig` verifies that a user is authenticated (`request.auth`) but **does not verify** if the user is an Admin of the target `companyId`.
*   **Impact:** Any logged-in user (even a driver or a user from another company) can overwrite the SMS credentials of any company if they guess the `companyId`.

### 1.2. Hardcoded "God Mode" Backdoor
*   **File:** `functions/bulkActions.js` -> `assertCompanyAdmin`
*   **Severity:** **HIGH**
*   **Issue:** A specific User ID (`5921L1GIU7Z7O5dq22DuMZ0dzMY2`) is hardcoded to bypass all permission checks.
*   **Impact:** If this user account is compromised, the attacker has full access. Hardcoded credentials are a security anti-pattern.

### 1.3. Unprotected Public Writes (DoS Risk)
*   **File:** `src/firestore.rules`
*   **Severity:** **MEDIUM**
*   **Issue:** `match /companies/{companyId}/applications/{applicationId}` allows `create` if `isValidGuestApplication`. This check only requires `applicantId` to be a string.
*   **Impact:** An attacker can flood the database with fake applications, driving up costs and potentially denying service.
*   **Recommendation:** Implement Firebase App Check or a more robust challenge (CAPTCHA token verification).

### 1.4. Inconsistent Super Admin Definition
*   **File:** `src/firestore.rules` vs `src/storage.rules`
*   **Severity:** **LOW**
*   **Issue:**
    *   Firestore Rules whitelist `holmurod96@gmail.com`.
    *   Storage Rules whitelist any email ending in `@safehaul.io`.
*   **Impact:** Confusion in access rights. A `@safehaul.io` admin might be able to access files but not database records, or vice versa.

---

## 💥 2. Crash & Scalability Risks
*These issues will likely cause the application to crash or time out as data volume grows.*

### 2.1. Out-Of-Memory (OOM) in Stats Rebuild
*   **File:** `functions/leadDistribution.js` -> `rebuildLeadStats`
*   **Severity:** **HIGH**
*   **Issue:** `const leadsSnap = await db.collection("leads").get();` loads **every single lead** in the database into memory.
*   **Impact:** As the leads collection grows (e.g., >10k docs), this function will crash with an "Out of Memory" error.
*   **Recommendation:** Use Firestore `stream()` or paginated queries.

### 2.2. Timeout in Compliance Monitor
*   **File:** `functions/complianceMonitor.js` -> `checkExpiringDocuments`
*   **Severity:** **HIGH**
*   **Issue:** The function iterates through all expiring documents and sends emails **sequentially** (`await sendDynamicEmail`).
*   **Impact:** If 50 documents expire on the same day, and SMTP takes 2s per email, the function runs for 100s, exceeding the default 60s timeout.
*   **Recommendation:** Use `Promise.all` (with concurrency limit) or queue emails via Cloud Tasks.

### 2.3. OOM in PDF Sealing
*   **File:** `functions/digitalSealing.js` -> `sealDocument`
*   **Severity:** **MEDIUM**
*   **Issue:** `fs.readFileSync(tempPdfPath)` reads the entire PDF into memory. High-resolution PDFs can be 50MB+, potentially crashing the 512MB instance if concurrent requests occur.
*   **Recommendation:** Stream the file where possible or increase function memory.

---

## ⚙️ 3. Logic & Architecture Findings

### 3.1. Race Condition in "Shadow Profiles"
*   **File:** `functions/driverSync.js` -> `processDriverData`
*   **Issue:** The function checks if a driver exists (Query) and then creates one (Write) without a transaction or lock.
*   **Impact:** If a driver submits two applications rapidly, two duplicate profiles may be created.

### 3.2. N+1 Reads in Membership Sync
*   **File:** `functions/hrAdmin.js` -> `onMembershipWrite`
*   **Issue:** When a user joins a team, the function fetches *all* members of that team to update the company cache.
*   **Impact:** For a company with 1,000 members, adding 1 user triggers 1,000+ reads. This is expensive and slow.

### 3.3. Incomplete Cleanup Script
*   **File:** `functions/leadLogic.js` -> `cleanupOrphanedLeadRefs`
*   **Issue:** `maxCompanies = 10` is a default limit. The script stops after 10 companies, leaving the rest of the system dirty.

### 3.4. Hardcoded Timezone
*   **File:** `functions/statsAggregator.js`
*   **Issue:** Timezone is hardcoded to `'America/Chicago'`.
*   **Impact:** International clients will see incorrect daily stats boundaries.

---

## 🧪 4. Test Coverage
*   **Status:** **CRITICAL GAP**
*   **Findings:**
    *   Tests exist only for `bulkActions.js` and `email` helpers.
    *   **NO TESTS** for the core "Dealer" logic (`leadDistribution.js`).
    *   **NO TESTS** for security rules.
    *   **NO TESTS** for driver sync.

---

## 📋 Recommendations Plan

### Phase 1: Fix Critical Security (Immediate)
1.  **Secure `saveIntegrationConfig`:** Add strict `isCompanyAdmin` check.
2.  **Remove Backdoor:** Delete the hardcoded User ID check.
3.  **App Check:** Enable App Check enforcement for public writes.

### Phase 2: Fix Crash Risks
1.  **Refactor `rebuildLeadStats`:** Use streaming/pagination.
2.  **Refactor `checkExpiringDocuments`:** Use parallel email sending or Cloud Tasks.
3.  **Refactor `onMembershipWrite`:** Optimize caching strategy (increment count instead of full list?).

### Phase 3: Architecture & Testing
1.  **Write Integration Tests:** Create a test suite for the Dealer Logic.
2.  **Transactions:** Wrap `processDriverData` in a transaction.
3.  **Config:** Move Timezone to Company Settings.
