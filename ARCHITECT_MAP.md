# SafeHaul Core Architecture & Sync Map

## 1. Interaction Patterns
SafeHaul uses three distinct patterns to talk to the backend:

### A. Real-time Listening (Firestore SDK)
- **Used for**: Dashboards, Leads, and Applications.
- **How it works**: The Frontend uses `onSnapshot` inside custom hooks (like `useCompanyDashboard`). 
- **The Secret**: Security rules (`firestore.rules`) act as the "invisible gatekeeper," ensuring recruiters only see their own company's data.

### B. Heavy Processing (Callable Functions)
- **Used for**: `distributeDailyLeads`, `createPortalUser`, `moveApplication`.
- **How it works**: The Frontend triggers these via `httpsCallable`. The Backend runs the complex logic (e.g., shuffling leads) and returns a success/fail message.

### C. Automated Triggers (Cloud Triggers)
- **Used for**: `sealDocument`, `onApplicationSubmitted`.
- **How it works**: The Frontend simply writes a document to Firestore (e.g., setting status to `pending_seal`). The Backend "sees" this change automatically and starts the PDF generation process.

## 2. Key Data Models
To keep the system in sync, the Frontend expects specific fields:
- **Companies**: Must have `planType` ('free'/'paid') to determine lead limits.
- **Leads**: Must have `unavailableUntil` (timestamp) to manage the shuffle logic.
- **Signing Requests**: Must have a `fields` array containing `xPosition`, `yPosition`, etc., as percentages.