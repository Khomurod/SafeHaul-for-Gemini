# SafeHaul Core Architecture & Sync Map

## 1. Interaction Patterns
SafeHaul uses three distinct patterns to talk to the backend:

### A. Real-time Listening (Firestore SDK)
- **Used for**: Dashboards, Leads, and Applications.
- **How it works**: The Frontend uses `onSnapshot` inside custom hooks (like `useCompanyDashboard`). 
- **The Secret**: Security rules (`firestore.rules`) act as the "invisible gatekeeper," ensuring recruiters only see their own company's data.

### B. Heavy Processing (Callable Functions)
- **Used for**: `distributeDailyLeads`, `createPortalUser`, `moveApplication`, `sendVOERequest` (New).
- **How it works**: The Frontend triggers these via `httpsCallable`. The Backend runs the complex logic and returns a success/fail message.

### C. Automated Triggers & Schedules
- **Triggers**: 
    - `onApplicationSubmitted`: Finalizes the app and prepares PDF data.
    - `sealDocument`: Generates PDF (Deprecated, handled on-fly).
- **Scheduled Jobs**: 
    - `checkDriverExpirations`: Runs daily to flag expiring CDLs/MedCards.
    - `distributeDailyLeadsScheduled`: Runs daily to shuffle leads.

## 2. Key Data Models & Schemas

### A. Application Schema (Compliance Critical)
The Application object (`companies/{id}/applications/{appId}`) is the single source of truth.
* **Identity**: `suffix` and `otherName` (Aliases) are mandatory.
* **Signature**: Must be stored as `TEXT_SIGNATURE:John Doe` for typed signatures.
* **Dates**: `cdlExpiration`, `medCardExpiration`, `twicExpiration`, and `dob` **MUST** be stored as Firestore `Timestamp` objects (not strings) to enable the Compliance Monitor.
* **Employment**: The `employers` array MUST now include `email`, `contactPerson`, and `phone` to power the VOE engine.

### B. Verification Requests Schema
A dedicated collection (`verification_requests/{requestId}`) manages external VOE access.
* **Security**: Accessible publicly ONLY via `requestId`.
* **Fields**: `applicationId`, `recipientEmail`, `employerName`, `status` ('Pending'/'Completed'), `verifiedStartDate`, `verifiedEndDate`, `signatureName`.

## 3. The "Dealer" Distribution Engine (CRITICAL)
**DO NOT MODIFY THE LOGIC BELOW WITHOUT UNDERSTANDING THE "GHOST LEAD" PROTECTION.**

The Lead Distribution system (`functions/leadLogic.js`) uses a **"Dealer Architecture"**.

### A. The "Dealer" Logic
1.  **Iterative Dealing**: Iterates through companies one by one.
2.  **Transactional Assignment**: Checks `doc.exists` and `unavailableUntil` to prevent race conditions.
3.  **Pre-Flight Validation**: The Frontend acts as the primary firewall.

### B. Strict Quota Rules
1.  **Plan Type**: `Paid` (200 Leads) vs `Free` (50 Leads).
2.  **Overrides**: `dailyLeadQuota` overrides Plan limits ONLY if higher.

## 4. Frontend View Sync Strategy (The "Mirror Law")
To prevent liability, the Admin Dashboard must mirror 100% of the input fields collected in the Driver App.

### Critical Path Mapping
| Driver Input Component | Admin Render Component | Data Points |
| :--- | :--- | :--- |
| `Step1_Contact.jsx` | `PersonalInfoSection.jsx` | Suffix, Aliases |
| `Step3_License.jsx` | `SupplementalSection.jsx` | TWIC, Expiration (Alerts Enabled) |
| `Step4_Violations.jsx` | `SupplementalSection.jsx` | **Red Flags:** Revoked, Suspended |
| `Step7_General.jsx` | `SupplementalSection.jsx` | **HOS Table:** 7-Day Log |
| `Step6_Employment.jsx` | `SupplementalSection.jsx` | **VOE:** "Verify" Button, Email Logic |

## 5. Compliance Engine
Automated systems protecting carrier liability.

### A. Expiry Monitor
* **Function**: `checkDriverExpirations` (Daily).
* **Logic**: Scans all drivers. If `cdlExpiration` < 30 days, adds `complianceAlerts`.
* **Feed Mechanism**: `DQFileTab.jsx` performs a "Dual Write" -> when a user uploads a new CDL/Med Card, it automatically updates the `expirationDate` on the Driver Profile to keep the monitor accurate.

### B. Verification of Employment (VOE)
* **Flow**: Recruiter clicks "Verify" ➝ `sendVOERequest` (Cloud Function) ➝ Email sent to Employer ➝ Employer opens Public Portal ➝ Signs ➝ Database Updated.
* **Smart Logic**: The system auto-detects employer emails from the driver's application.
