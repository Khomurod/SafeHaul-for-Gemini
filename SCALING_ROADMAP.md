# SafeHaul Scaling Roadmap: Enterprise Compliance & Automation

This roadmap outlines the strategic path to scaling SafeHaul from an Applicant Tracking System (ATS) to a full-scale Compliance & Automation Platform competitive with DriverReach and Tenstreet.

**Developer Instructions:** Mark tasks as completed by changing `[ ]` to `[x]`.

---

## 🚀 Phase 0: Enterprise UX & Document Standardization (High Priority)
*Goal: Overhaul the Driver Application (Frontend), PDF Engine (Backend), and Admin Viewer to meet Fortune 500 compliance standards. The look and feel must be "Serious, Modern, and Professional."*

### 1. The "Executive" PDF Overhaul
- [ ] **Design System Configuration (`src/shared/utils/pdf/pdfStyles.js`)**
    - Define a centralized `PDF_THEME` object.
    - Set color palette: Navy (Primary), Slate (Secondary), Blue (Accents).
    - Define typography hierarchy (Section Headers vs. Labels vs. Values).
- [ ] **PDF Layout Helpers (`src/shared/utils/pdf/pdfHelpers.js`)**
    - Implement `drawSectionCard`: Reusable function for colored headers and bordered boxes.
    - Implement `drawGridRow`: Logic to auto-align two data points side-by-side.
    - Implement `drawBooleanBadge`: Render "YES/NO" as visual badges.
- [ ] **Section Renderers (`src/shared/utils/pdf/pdfSections.js`)**
    - Create specific render functions for: Header, Identity, License, Employment (iterative cards), Safety (tables), and Signature.
- [ ] **Main Generator Assembly (`src/shared/utils/pdfGenerator.js`)**
    - Refactor `generateApplicationPDF` to assemble sections sequentially.
    - Ensure legal text (FCRA, PSP, Electronic Consent) is rendered on separate pages.
    - Add footer: "Page X of Y | Digitally Sealed".

### 2. The "Focus-Mode" Driver App UI
- [ ] **UI Component Upgrades**
    - Update `InputField.jsx`: Increase height (`p-4`), use bold uppercase labels, add focus states.
    - Update `RadioGroup.jsx`: Convert to "Selectable Cards" for mobile ease.
- [ ] **Data Handling Logic**
    - Create `useApplicationSubmit.js` hook for secure Firestore submission.
    - Update `form-options.js` to centralize dropdown options (License Classes, Yes/No).
- [ ] **Step-by-Step Refactoring**
    - **Step 1 (Contact):** Implement "Card Grouping" layout.
    - **Step 2 (Qualifications):** Group questions; add conditional logic for "Drug Test History."
    - **Step 3 (License):** Stack inputs vertically; add endorsement checkboxes.
    - **Step 4 & 5 (Violations/Accidents):** Implement `DynamicRow` with custom "Sub-Card" renderers.
    - **Step 6 (Employment):** Create highlighted "Verification Contact" block (`bg-blue-50`).
    - **Step 7 (HOS):** Replace HTML table with responsive "Smart Grid" (auto-calculates hours).
    - **Step 8 (Review):** Replace text list with "Edit Cards" containing jump links.
    - **Step 9 (Consent):** Build "Signing Ceremony" with Accordions for legal text and `SignatureCanvas`.

### 3. The "Digital Dossier" Admin View
- [ ] **Viewer Components (`src/features/company-admin/components/application/view-components/`)**
    - Create `DataRow.jsx`: Strict "Label (30%) | Value (70%)" layout with copy-to-clipboard.
    - Create `SectionCard.jsx`: Styled container with anchor ID support.
    - Create `TimelineView.jsx`: Visualize Employment History as a vertical timeline.
    - Create `RiskGrid.jsx`: Visualize Safety data (Green Shield vs. Red Table).
- [ ] **Application Detail View (`ApplicationDetailView.jsx`)**
    - Implement Sticky Header (Approve/Reject actions).
    - Implement Sticky Sidebar Navigation.
    - Assemble view using new components.
- [ ] **Dashboard Integration (`CompanyAdminDashboard.jsx`)**
    - Track `selectedApplicationId` state.
    - Add `onClick` handler to "Direct Applications" list to open Detail View without navigation.

---

## 🚨 Phase 1: The "Compliance Engine" (Critical)
*Goal: Automate DOT audit readiness and document verification to increase product value for Paid plans.*

### 1. Automated Verification of Employment (VOE)
- [ ] **Create `sendVOERequest` Cloud Function**
    - Generate a PDF form using `pdfGenerator.js` pre-filled with driver history.
    - Attach the driver's digital signature (captured in `Step9_Consent`).
    - Auto-email the "Request for Information" to the previous employers listed in `Step6_Employment`.
- [ ] **Build "External Verification Portal"**
    - Create a secure, public-facing page where past employers can click "Verify Dates" and sign digitally without needing a login.

### 2. Smart DQ File Management (Driver Qualification)
- [ ] **Schema Standardization**
    - Update `Step3_License.jsx` to ensure `expirationDate` is saved as a Firestore Timestamp (not just a string).
    - Add `medCardExpirationDate` field to the driver profile.
- [ ] **Expiry Monitor (Scheduled Job)**
    - Create a daily Cloud Function (similar to `runLeadDistribution`) that scans all active drivers.
    - Identify CDLs and Medical Cards expiring within 30, 60, and 90 days.
- [ ] **Automated Expiry Alerts**
    - **Driver:** Auto-email: *"Your CDL expires in 30 days. Click here to upload your new one."*
    - **Recruiter:** Add a "Compliance Alert" notification in the dashboard.
- [ ] **Dashboard UI Update**
    - In `UnifiedDriverList` and `DriverProfile`, conditionally render rows in **Red** (Expired) or **Yellow** (Expiring Soon).

---

## 🤖 Phase 2: Marketing Automation (The "Ghost" Killer)
*Goal: Increase lead conversion rates by 300% via instant, automated first-touch.*

### 3. "Speed to Lead" Auto-SMS
- [ ] **Twilio Integration**
    - Set up Twilio API keys in Firebase Functions config.
- [ ] **Triggered SMS Logic**
    - Hook into the `assignLeadTransaction` function (in `leadLogic.js`).
    - **Action:** Immediately send SMS to driver: *"Hey [FirstName], thanks for applying to [CompanyName]! When is a good time to chat?"*
- [ ] **2-Way Chat Interface**
    - Build a "Messages" tab in the Recruiter Workspace to view and reply to SMS responses directly.

### 4. Drip Campaigns (Nurture)
- [ ] **Automated Nurture Workflow**
    - If a recruiter marks a lead as "No Answer" or "Not Interested", automatically move the lead to a `nurture_pool`.
    - Trigger a 4-week email sequence (1 educational email/week).
- [ ] **Re-Engagement Trigger**
    - If a driver clicks a link in a nurture email, automatically restore them to "New Lead" status and notify the recruiter.

---

## 🔗 Phase 3: Integrations (The "Ecosystem")
*Goal: Connect with industry-standard external systems for background checks.*

### 5. Background Checks (MVR & PSP)
- [ ] **Provider Integration (e.g., SambaSafety or Asurint)**
    - Create a backend service to proxy requests to the background check API.
- [ ] **"Order MVR" Feature**
    - Add an "Order Report" button to `DriverProfile`.
    - On completion, automatically fetch the PDF report and save it to the `DocumentsManager` tab.

### 6. FMCSA Clearinghouse
- [ ] **Consent Form Update**
    - Add a specific "Clearinghouse Limited Query Consent" step to the application wizard.
- [ ] **Query Automation**
    - (MVP) Generate the formatted text string required for the FMCSA portal.
    - (Scale) Implement direct API integration to run queries automatically upon hiring.

---
*Roadmap generated by Gemini for SafeHaul Architecture.*
