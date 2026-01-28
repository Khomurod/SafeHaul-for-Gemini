# UI Redesign Proposal: Bulk Actions (Engagement Engine)

## 1. Executive Summary

The current "Bulk Actions" UI is buried within the Settings menu and uses a linear "Wizard" flow (`Targeting` -> `Message` -> `Review`). While functional for simple tasks, this structure is rigid, lacks visibility into ongoing campaigns, and feels like a configuration task rather than a core operational tool.

**Recommendation:** Elevate "Bulk Actions" from a Settings tab to a primary **"Campaigns" Module**. Adopting a "Dashboard-First" approach (similar to Mailchimp, HubSpot, or Braze) will improve usability, safety, and perceived value.

---

## 2. Core Architectural Shifts

| Feature | Current State (Wizard) | Proposed State (Campaign Manager) |
| :--- | :--- | :--- |
| **Navigation** | Buried in `Settings > Bulk Actions` | Top-level **"Campaigns"** Sidebar Item |
| **Creation Flow** | Linear (Step 1 -> 2 -> 3). Hard to go back. | **Non-Linear Editor**. Jump between Audience, Content, and Settings. |
| **State Management** | Transient (Lost on refresh if not launched) | **Draft-Based**. Auto-saves work-in-progress. |
| **Visibility** | History list is hidden/secondary. | **Unified Dashboard**. See Active, Drafts, and Completed at a glance. |
| **Safety** | "Launch" button is scary. | **"Test Flight"**. Mandatory dry-run and test message steps. |

---

## 3. Detailed UI Components

### A. The Campaign Hub (Dashboard)
*   **KPI Cards**: Top-level metrics (e.g., "Outreach this Month", "Response Rate", "Active Sequences").
*   **Data Grid**: A searchable, sortable list of campaigns.
    *   **Columns**: Name, Status (Draft, Scheduled, Sending, Completed), Audience Size, Delivered %, Reply %.
    *   **Actions**: Duplicate, Edit, Pause, Archive.
*   **Quick Actions**: "New SMS Campaign", "New Email Blast", "View Templates".

### B. The Campaign Builder (The Editor)
Instead of a wizard, use a **Single-Page Application (SPA)** layout with a persistent sidebar checklist.

#### 1. Header
*   Editable Campaign Name (e.g., "Nov 2023 Reactivation").
*   Status Badge (Draft).
*   **Save & Exit** / **Launch** buttons.

#### 2. Left Sidebar: The Checklist
A vertical list of sections. As the user completes them, they turn green.
*   ✅ **Audience** (Who?)
*   ⬜ **Channel & Config** (How?)
*   ⬜ **Content** (What?)
*   ⬜ **Schedule** (When?)

#### 3. Main Stage: The Configurator
Dynamically changes based on the selected Sidebar item.

*   **Audience View**:
    *   **Segment Builder**: Visual "Include/Exclude" logic.
        *   *Example*: `[Include] Status is 'New Lead'` **AND** `[Exclude] Last Contacted < 7 days ago`.
    *   **Live Estimator**: A speedometer chart showing "Estimated Recipients: 1,240" updating in real-time.
    *   **Sample List**: "Preview first 5 recipients" table to verify targeting.

*   **Content View (The Composer)**:
    *   **Split Screen**: Editor on the Left, **Live Device Preview** on the Right.
    *   **SMS Preview**: Render a realistic iPhone/Android message bubble. Show character count and "Segments" usage (e.g., "1 Message = 1 Credit" vs "2 Segments").
    *   **Email Preview**: Render a simplified inbox view.
    *   **Variable Picker**: Clickable chips for `{{firstName}}`, `{{companyName}}` that insert into the cursor position.
    *   **Magic Templates**: Sidebar drawer to drag-and-drop saved templates.

### C. The Safety Suite (Pre-Launch)
Before the "Launch" button becomes active, the user must pass the Safety Suite.

1.  **Test Message**: "Send test to [My Number]".
2.  **Compliance Check**: Automated scan for forbidden words (SHAFT compliance) or excessive links.
3.  **Cost Estimate**: "This campaign will cost approx. 500 credits."

---

## 4. Visual workflow (Conceptual)

```
[ Dashboard ]
   |
   +--- [ Create New ]
   |      |
   |      +--- 1. Select Type (SMS / Email / Drip)
   |      +--- 2. Enter Name
   |
   +--- [ Campaign Editor ]
          |
          +--- [ Left: Checklist ]
          |      1. Audience (Segment Builder + Live Count)
          |      2. Content (Editor + Phone Mockup Preview)
          |      3. Settings (Throttling speed, Sender ID)
          |
          +--- [ Right: Action Bar ]
                 [ Send Test ] [ Save Draft ] [ Review & Launch ]
```

## 5. Technical Implementation Steps (Frontend)

1.  **Move Directory**: Relocate `features/company-admin/views/campaigns` to a top-level `features/campaigns`.
2.  **Create Entity**: Introduce a `Campaign` Firestore document that exists *before* execution (Draft state). Currently, `initBulkSession` creates the doc *at launch*. We need a `createDraft` function.
3.  **Refactor Hooks**:
    *   `useCampaignDraft`: Auto-save form state to Firestore `drafts` collection.
    *   `useSegmentEstimator`: Debounced calls to backend to get audience counts without fetching all data.
4.  **Component Library**:
    *   `DeviceMockup`: A reusable CSS component for Phone/Browser frames.
    *   `LogicBuilder`: A UI for building complex "AND/OR" queries visually.

## 6. Why This Fixes "Not Working" Perception
Even with the backend fixed, the old UI felt "broken" because:
*   Users had no confidence in what would happen next (Black Box).
*   If a crash happened, data was lost (No Drafts).
*   Targeting was abstract (No Visual Logic).

This redesign builds **Trust** and **Control**, converting a technical utility into a powerful business driver.
