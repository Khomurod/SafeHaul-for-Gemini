# Remediation Plan: Bulletproof the Campaigns Module

## 1. Critical Fixes (Must Do First)

### A. Migrate Constants & Fix Dependencies
The new `Campaigns` module depends on `campaignConstants.js` which is currently trapped in the legacy folder.
1.  **Create Directory**: `src/features/campaigns/constants/`
2.  **Move File**: Copy `src/features/company-admin/views/campaigns/constants/campaignConstants.js` to the new location.
3.  **Update Imports**:
    *   `src/features/campaigns/components/AudienceBuilder.jsx`
    *   `src/features/mission-control/campaign-builder/nodes/AudienceNode.jsx` (if applicable)
    *   Change import path from `@features/company-admin/...` to `@features/campaigns/constants/campaignConstants`.

### B. Add Security Rules for Drafts
The new "Draft-Based" architecture writes to `campaign_drafts` subcollection, but Firestore rules block this by default.
1.  **Update `firestore.rules`**:
    *   Add a match block for `campaign_drafts/{draftId}` inside the `companies/{companyId}` block.
    *   Allow `read, write` for `isCompanyTeam(companyId)`.

## 2. Cleanup Tasks (Once Criticals are Done)

### A. Delete Legacy Code
Once dependencies are moved, the old directory is dead weight.
1.  **Delete**: `src/features/company-admin/views/campaigns/`
    *   Ensure no other files link to it (we already grepped this).

## 3. Verification Steps
1.  **Build Check**: Ensure the app compiles without "Module Not Found" errors.
2.  **Permission Check**: Verify a Company Admin can save a draft (requires the new rule).
3.  **Launch Check**: Verify `LaunchPad` payload matches `initBulkSession` expectations.

## 4. Why This Makes It "Bulletproof"
*   **Decoupling**: The new module becomes self-contained, removing fragility.
*   **Security**: Explicit rules prevent unauthorized access to drafts.
*   **Maintainability**: Removing zombie code prevents future confusion.
