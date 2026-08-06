
# Codex Setup in the Work Workspace

1. Connect the company GitHub organization from the work ChatGPT workspace.
2. Grant access only to the Land Master repository initially.
3. Configure Codex to use feature branches and pull requests.
4. Keep direct pushes to `main` disabled.
5. Use this verification command:

```bash
npm run validate && npm run build:pages
```

6. Do not provide production credentials or unrestricted deployment permissions.
7. Require Codex to read root and nested `AGENTS.md` files.

Suggested first task:

```text
Review the Proforma Manager baseline without changing behavior. Read all applicable AGENTS.md and module documentation, inspect inferred dependencies, run validation, and open a documentation-only pull request describing the frontend/backend contract and a regression checklist.
```
