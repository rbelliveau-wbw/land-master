# Subdivision Milestone Gantt — Zoho Creator Widget (v2)

A Zoho Creator widget for viewing and editing subdivision milestones in a Gantt-style timeline.

## What's new in v2

- **Navy color scheme** matched to the existing Creator app UI (`#1e3a6e` primary)
- **Teal unsaved-edit state** replaces amber — complements the navy palette and reads clearly
- **56px row height** with larger 32px bars and wider drag handles for easier interaction
- **Compact zoom is now the default** (6px/day); Week zoom also available. Day view removed.
- **Linked row indicator** — linked rows now show a left-border bracket (blue vertical line) instead of dashed arrows on the timeline, which were easy to misread
- **Today marker** — three-layer indicator: column tint, 2px red line, and "TODAY" pill label
- **Duration in row labels** — shows "14 days" instead of redundant date range (dates still shown inside the bar)
- **Unscheduled chips** are now interactive with a `+` button and hover state
- **DM Sans** typeface (loaded from Google Fonts)
- **Dependency lines** changed from primary blue to neutral gray so they read as infrastructure, not data

## What it does

- Loads all records from `All_Subdivisions` into a compact subdivision dropdown
- Loads `All_Milestones` and filters milestones by the selected `Subdivision1` lookup
- Displays `Milestone_Name`, `Start_Date`, and `End_Date` in a horizontal Gantt layout
- Sorts milestones top-to-bottom by the milestone `Sequence` field
- Allows dragging a milestone bar to move the whole date range
- Allows stretching the left or right edge of a bar to update `Start_Date` or `End_Date`
- Chain/link button links rows so moving one adjusts the next (bidirectional)
- Treats `Dry Utilities` and `Punch List` as a synchronized pair
- Saves edits back to the `Milestones` form through the `All_Milestones` report

## Creator schema used

### Reports
- `All_Subdivisions`
- `All_Milestones`

### Milestone fields
- `Milestone_Name`, `Start_Date`, `End_Date`, `Subdivision1`
- `Milestone_ID`, `Project_ID`, `Push_Update`
- `Sequence` (optional — falls back to Start Date sort)

## Install

1. In Zoho Creator, go to **Settings → Widgets**
2. Upload this ZIP
3. Place the widget on the target page
4. Optionally pass `?subdivisionId=<ID>` to auto-select a subdivision

## Optional URL parameters

- `subdivisionId` / `SubdivisionID` / `recordId` / `recLinkID` / `ID` / `id`

## Debugging

Append `?debug=1` to show raw Creator API response details.

## Package contents

```
subdivision-milestone-gantt-v2.zip
├── app/
│   └── widget.html
├── plugin-manifest.json
└── README.md
```
