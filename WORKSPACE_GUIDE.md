# Studio work tracker

## Start using the app

1. Open the private Site and sign in with ChatGPT. The first owner sign-in initializes the workspace admin. Do this before expanding the Site audience.
2. Add channels and their optional Google Drive folder links.
3. Set each month's targets by channel and work type: graphic design, video editing, UI/UX design.
4. Add teammates using their exact ChatGPT sign-in email and role. This creates an allowlist entry, not an email invitation. Enable the appropriate Site audience separately before sharing the URL. Never expose the raw Worker; the Sites dispatcher provides trusted identity headers.
5. Create tasks with a channel, assignee, type, brief and due date.
6. Submit a completed task using its Google Drive link and completion date. It appears in Calendar and Gallery while in review.
7. Managers or admins approve or request changes. Approved items become visible to the scheduling team. Copy a handoff, then record the scheduled publishing date.

## Access model

- Admin: channels, targets, team membership and all task actions.
- Manager: all tasks, assignments, reviews and scheduling.
- Creator: only tasks assigned to themselves; can create their own tasks and submit work.
- Scheduling team: only approved/scheduled tasks; can mark approved tasks scheduled.

Permissions are checked server-side. Membership invitations bind to stable user IDs on first successful sign-in. The initial owner cannot be removed or demoted. Task updates use version checks to prevent overwriting concurrent changes. Removing a member requires reassigning existing tasks first.

## Data and limitations

Structured records persist in Cloudflare D1. Files remain in Google Drive. This app does not upload files, automatically scan folders, alter Drive permissions, send messages, or publish to social networks. File thumbnails and embedded previews depend on Google Drive access and browser permissions; the direct Drive link remains available. Folder and Google Docs links are accepted but do not provide image thumbnails.

The calendar is based on completion dates, not scheduled publishing dates. Completed totals include submitted, approved and scheduled work, excluding changes requested. Creator statistics include only their own visible tasks; targets are channel-wide. Dates are stored as date-only strings; server validation of future completion dates uses Asia/Kolkata.

## Development and verification

- Install: `npm run install:ci`
- Generate schema changes: `npm run db:generate`
- Build: `npm run build`
- Type check: `node node_modules/typescript/bin/tsc --noEmit`
- Local integration verification: `node scripts/verify-workflow.mjs`, with the built Worker running on 127.0.0.1:8787 and local D1 migrations applied. This intentionally creates clearly labelled QA records in the local database only. It must never run against production.

Verified 34 integration assertions covering authentication, all roles, assignment ownership, invalid links, review and revision, approval, scheduling, concurrent update rejection and saved-state readback. Browser checks cover channel creation, task creation, submission, calendar placement, gallery, responsive page width and the read-only WebMCP tool's valid/invalid inputs.
