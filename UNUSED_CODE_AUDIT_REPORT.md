# Unused Code Audit Report

This report details the findings of an audit to identify unused code in the application.

## 1. Executive Summary

The audit revealed a few unused files, functions, and a pattern of re-declaring constants. While not critical, addressing these findings will improve code maintainability and reduce the overall size of the codebase.

## 2. Findings and Recommendations

### 2.1. Unused Files and Components

*   **File:** `src/features/applications/components/ApplicationsView.jsx`
    *   **Finding:** This component is exported from `src/features/applications/index.js`, but is not imported or used anywhere in the application.
    *   **Recommendation:** Remove the `ApplicationsView.jsx` file and its export from `index.js`.

### 2.2. Unused Cloud Functions

*   **Function:** `checkDocumentExpirations` in `functions/customJobs.js`
    *   **Finding:** This function is defined but its export is commented out in `functions/index.js`, making it unused.
    *   **Recommendation:** Remove the `checkDocumentExpirations` function and its related helper function `buildExpirationEmailHtml`, or re-enable the export in `index.js` if the functionality is desired.

*   **Function:** `generateDailyAnalytics` in `functions/leadLogic.js`
    *   **Finding:** This function is defined and exported, but the `aggregateAnalytics` scheduled function that calls it is commented out in `functions/index.js`, making `generateDailyAnalytics` effectively unused.
    *   **Recommendation:** Remove the `generateDailyAnalytics` function, or re-enable the `aggregateAnalytics` scheduled function in `index.js` if the functionality is desired.

### 2.3. Unused Code Within Files

*   **Pattern:** Re-declaration of constants
    *   **Finding:** The `EXPERIENCE_OPTIONS` constant is re-declared in `src/features/company-admin/components/application/steps/StepExperience.jsx` and `src/shared/components/modals/CallOutcomeModalUI.jsx`, even though it is exported from `src/config/form-options.js`.
    *   **Recommendation:** Remove the local re-declarations and import the constant from `src/config/form-options.js` in all files where it is used. This will improve code maintainability and reduce duplication.

## 3. Conclusion

The codebase is generally clean and well-maintained. The unused code identified in this report is minor and can be easily addressed. By removing the unused code and refactoring the constant declarations, the codebase can be made more efficient and easier to maintain.
