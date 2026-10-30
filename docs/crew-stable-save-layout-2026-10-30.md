# Stable Save Layout — 1.8.1

The inline employee save added a full-width Saving Assignment row above the
groups. Acknowledged saves then triggered employee/crew refresh rows, and ordinary
milestone saves added a schedule status row. These transient messages changed the
available report height and moved the page during editing.

Routine employee, crew and staffing pending/refresh statuses, plus the schedule's
ordinary connecting/loading/saving/success announcements, now sit outside layout
flow with accessible live text retained. Existing disabled/busy controls, inline
cell state, success feedback and anchored drag feedback continue to describe the
actual operation. Actual errors, setup/permission notices, unknown-save review
actions and required progress/recovery dialogs remain visible.

Changed implementation: crew-manager.css and the versioned widget entry. No save
handler, native payload, acknowledgement, permission or duplicate-send rule changes.
The existing Employees staffing, Crew/Crew_Assignment and Milestones field/function/
Custom API contracts are reused. No Creator deployment or promotion is required.

Verification uses actual isolated employee and milestone saves, sampling report
geometry through pending, success and follow-up refresh, plus the existing full
repository validation and Pages build before publication. Production verification
is read-only; no real staffing or schedule values are changed to demonstrate this.

The isolated employee save issued one native update. Its pending and refresh
samples retained the employee panel at 179.84375px and crew detail at 217.84375px.
The milestone save issued one apply request; pending and confirmed status both
retained the date grid at 234.921875px with the same 421.140625px height. Temporary
status text remained accessible in an absolutely positioned 1px clipped element.

Full repository validation and the 34-path Pages build passed for 1.8.1.

Rollback: map Production crew-locations to 1.8.0. Retain all Creator components,
saved employee/crew/milestone values, timecards, mappings and audit history.
