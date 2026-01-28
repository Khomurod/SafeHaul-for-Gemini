# Codebase Cleanup Recommendation

## 1. Directory to Delete
The directory `src/features/company-admin/views/campaigns` is now **largely redundant** following the migration to `src/features/campaigns`.

**Recommended Action:** Delete the folder `src/features/company-admin/views/campaigns` **AFTER** migrating the constants.

## 2. Dependencies to Migrate First
My dependency check revealed that the new code **still relies on constants from the old directory**.

*   **File:** `src/features/campaigns/components/AudienceBuilder.jsx`
*   **Import:** `import { APPLICATION_STATUSES } from '@features/company-admin/views/campaigns/constants/campaignConstants';`

**Critical Step:**
Before deleting the folder, you must:
1.  Move `src/features/company-admin/views/campaigns/constants` to `src/features/campaigns/constants`.
2.  Update the import paths in `AudienceBuilder.jsx` and `AudienceNode.jsx` to point to the new location.

## 3. Legacy Hooks
The hooks `useCampaignTargeting.js` and `useCampaignExecution.js` in the old directory are **no longer used** by the new `CampaignEditor` architecture (which uses `AudienceBuilder` internal state and `LaunchPad` logic). They can be safely deleted once the directory is removed.

## 4. Final Verification
After moving constants and updating imports, run `grep` again to ensure no files reference `@features/company-admin/views/campaigns`.
