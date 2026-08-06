
# System Overview

Land Master is a Zoho Creator application with browser-based widgets, Creator forms/reports/pages, Deluge functions and workflows, Creator Custom APIs, Zoho Writer, Zoho Analytics, Zoho Projects, Great Plains data, and HCSS HeavyJob integrations.

## Responsibility split

### GitHub and external widget hosting

- widget HTML, CSS, and JavaScript
- Codex instructions and knowledge
- immutable widget releases
- validation and deployment workflows
- reference copies of Deluge source

### Zoho Creator

- forms and data
- reports and pages
- permissions
- Deluge execution
- workflows and schedules
- Custom API definitions
- connections
- production backend deployments

A frontend-only widget change can be promoted through external hosting without publishing the Creator application. Backend changes still follow Creator Development → Stage → Production.
