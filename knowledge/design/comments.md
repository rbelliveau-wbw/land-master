# Comments

This is the shared design contract for Legal, Budget and Pro Forma conversation
surfaces. The existing `PFComments` component and `comments.css` are the source
reference. Keep one conversation experience across main-list actions and
record/editor entry points while preserving each module's parent and permission
contract. This guide states the required behavior, not a claim that every
legacy adapter already implements every guard.

## Appearance and entry

Pair the speech-bubble action with the attachment paperclip. Use the same
pale-blue square, rounded corners, stationary hover treatment and lower-right
count badge described in [Attachments](attachments.md). A recent-comment state
may use the existing teal treatment and orange dot; include a text/accessible
cue so color is not its only signal. Keep the badge and focus outline unclipped.

The main-list action opens a named conversation modal for that exact record,
with a blue header, visible record name and centered SVG Close. Preserve the
underlying filters, selection and scroll. Keep a bounded scrolling message
area above the composer; adapt spacing and controls to narrow screens.

Use the existing compact message cards: author initials, restrained author
color/tint, author name and timestamp, date separators, and readable wrapped
message text. Keep Reply, Edit and Delete reachable by keyboard and touch.
Group consecutive messages only under the existing grouping rules. Retain the
Edited marker and deleted-message placeholder rather than rewriting history.

## Loading, identity and drafts

Count persisted, non-deleted comments under the exact parent ID using a
complete read. Loading and unavailable are distinct from verified zero. Keep
the recent activity window on its existing module rule. Refresh badges after
verified changes. Older loads cannot publish into a different record or reopen
a closed modal; background refresh cannot erase a new composer or edit draft.
Patch the visible badge, title, accessible label and recent-activity state
together on the mounted button, preserving the button and any open draft.

Use the persisted comment author under the module's existing `User` /
`Added_User` contract. Prefer an authoritative User Access full name from an
exact unique username/email match; preserve actual stored identity when a full
name is unavailable. Never substitute the current actor or last modifier for
a historical author. Display-name resolution cannot grant edit/delete rights.
Respect app timezone when interpreting Creator timestamps without an offset.

Keep the draft per parent record, preserve it across close/reopen and failed
saves, and retain the newest edit while older requests finish. The composer
uses the existing formatting toolbar, Markdown preview, visible **Post** and
Ctrl/⌘+Enter shortcut. Escape/close follow the host's safe-close rules. Apply
the existing validated content/byte limit; escape rendered text and allow only
safe supported link schemes. Do not replace user text with a success label.

## Permissions and write feedback

Keep each module's posting rules and the component's existing author-only
24-hour edit/delete window. The host and callable action must enforce them;
hidden controls alone do not establish authorization. Reply inserts a quote
into the composer. Inline Edit retains Save/Cancel; Delete uses the widget's
confirmation and existing soft-delete behavior. No native browser dialogs.

Disable duplicate Post/keyboard submissions and conflicting actions during a
write. Show concise live status in the mounted thread. Clear a draft and update
counts only after the intended persisted result is confirmed. Unknown create
outcomes retain the draft and block another Post through close/reopen or a
second shortcut; offer read-only recheck only with a known safe record identity.
Never blindly create the same comment again after a lost response.

Name the dialog, trap focus, make the background inert, restore focus to the
originating action, and retain visible keyboard focus. Label the composer,
toolbar and icon buttons, announce status politely, keep message actions
available without hover, and respect reduced motion. When a confirmation
temporarily replaces the conversation, cancellation returns to that same
record and retained draft.

## Source references

- [Component](../../widgets/proforma-manager/src/app/comments.js): `PFComments`,
  conversation rendering, formatting, drafts and message actions.
- [Shared styling](../../widgets/proforma-manager/src/app/comments.css):
  thread, modal, composer and activity-button family.
- Host adapters in [Pro Forma](../../widgets/proforma-manager/src/app/widget.html),
  [Budget](../../widgets/budget-manager/src/app/widget.html) and
  [Legal](../../widgets/contract-management/src/app/widget.html) supply the
  parent scope, data calls, permissions and badges.

Before release, check keyboard Post, formatting/preview, long content, date and
author, count/loading/error states, read-only/expired edits, close/reopen drafts,
pending/unknown writes, record-switch races and focus return.
