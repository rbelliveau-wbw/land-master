# Milestones & Tasks and Construction board pencil — October 23, 2026

User-authorized frontend release: Land Master 8.17.3 and Contract Management
1.62.36, Development and Production. Stage mappings stay unchanged.

## Behavior and implementation

- Subdivision View/Edit uses one Milestones & Tasks tab. The approved Summary
  first layout shows CP Release and Construction Start Goal/Estimate pairs,
  Final Acceptance Due, then the complete existing read-only milestone list.
- Construction board cards open the existing request editor only through a tiny
  pencil. Card bodies retain drag/drop. Existing permissions, locks, busy and
  post-drag guards, native save routes and Legal board behavior are preserved.
- Existing date formatting, related-table renderer, milestone filtering/sorting,
  request editor, tab/overlay motion and board FLIP implementation are reused.
  The new composition helper and pencil adapter only assemble these existing
  behaviors; they do not introduce another data or save path.

## Affected surfaces and contracts

Source files: widgets/land-master/src/app/widget.html;
widgets/contract-management/src/app/widget.html and construction-board.css.
Configuration, immutable releases, environment mappings, focused regression
scripts, design guides and module notes accompany those changes.

Read-only Subdivision fields: CP_Release_Goal, CP_Release_Estimate,
Construction_Start_Goal, Construction_Start_Estimate,
Final_Acceptance_Due_Date. Existing Milestones fields: Milestone_Name,
Subdivision1, Start_Date, End_Date, Sequence. IDs remain strings.

Frontend functions: descriptor, tabHTML, subdivisionMilestonesTasksHTML,
boardCard, bDragStart, constructionBoardEdit. Existing constructionEditOpen,
request save adapter and drag/drop writes are reused without contract changes.
No Creator form/schema, report, Deluge function, daily workflow, Projects write,
Custom API or permission change is introduced. No Creator deployment is required.

## Regression coverage

Actual Land panel and save functions check merged-tab ordering, exact five-field
mapping, linked native lookup shapes, all milestone rows, sorting, escaping,
missing dates, record switching, lazy loading and unchanged ordinary Details
saves. Source dates and milestones are never serialized as editable fields.
Actual Contracts functions check the pencil target, keyboard semantics,
non-draggable control, existing modal routing, zero writes on opening, body
click absence, edit permission, busy/post-drag guards and preserved Legal clicks.
The existing native acknowledgement status/priority drag suite remains required.
Required release checks: npm run validate and npm run build:pages. Desktop
Production inspection verifies the combined tab and pencil-only opening without
saving or dragging business records.

## Rollback

Map Land Master to 8.17.2 and/or Contract Management to 1.62.35 in the affected
hosted environment, then redeploy Pages. Earlier immutable assets remain
available. No Creator data rollback or workflow change is required.
