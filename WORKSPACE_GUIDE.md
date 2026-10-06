# Studio work tracker

Run locally with `npm run dev -- --hostname 127.0.0.1`. Do not publish without an explicit request.

Managers manage their assigned members, create goal types, assign monthly targets, and review submissions. Creators see their own goals, monthly progress, submissions, and feedback. Admins manage managers and team transfers.

The Daily tasks page lets creators enter each morning's plan, start work, pause it, and resume later. Starting another task pauses the active one. It records work date, task name, assigned monthly goal as the category, due date, priority, estimated hours, and notes. When work is finished, Mark completed stops the timer and moves the task into the ready-to-submit list in its matching monthly goal card. The creator submits its output from that card or the daily task. Submission finalizes actual hours from active intervals, marks the task submitted, and credits the monthly goal. Review revisions reopen the task in a paused state; after additional work is timed and marked complete, the task returns to its goal card for resubmission. Managers can view their assigned members' daily plans; admins can view all teams.

Submit completed work using an assigned goal, title, optional Google Drive file or folder link, completion date, and quantity. Submitted and approved work counts toward the assigned goal month. Changes requested pause credit until resubmission. File uploads and external storage connections are not available.

Existing records remain in the local database. Saved submission links are available in the dashboard and manager reviews. Link sharing permissions are managed in Google Drive. The old workspace API is retired.

Validation: `node node_modules/typescript/bin/tsc --noEmit` and `npm run build`.
