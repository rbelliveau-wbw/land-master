
# Start Here: Move Land Master to the Work ChatGPT/Codex Environment

## 1. Create the repository

Create a **private** company-owned repository, recommended name:

```text
WBDevelopment/land-master
```

Upload the contents of this package. Confirm these files are visible at the repository root:

```text
AGENTS.md
README.md
widgets/
creator/
knowledge/
manifests/
releases/
scripts/
.github/
```

Do not create the repository under a personal GitHub account.

## 2. Protect the repository

Protect `main` with:

- pull requests required
- at least one human approval
- required `CI` status check
- no force pushes
- no direct Codex pushes to `main`

Create GitHub environments:

- `widget-development`
- `widget-stage`
- `widget-production`
- `github-pages`

Require a human reviewer for `widget-production`.

## 3. Enable GitHub Pages

In **Settings → Pages**, select **GitHub Actions** as the source. The included workflow builds a static site containing only widget releases.

The default GitHub Pages URLs will resemble:

```text
https://<organization>.github.io/land-master/dev/proforma-manager/
https://<organization>.github.io/land-master/stage/proforma-manager/
https://<organization>.github.io/land-master/prod/proforma-manager/
```

A custom domain such as `widgets.wbdevelopment.com` can be added later.

## 4. Register only Development first

In Creator Development:

1. Open Application Settings → Widgets.
2. Create a widget using **External** hosting.
3. Paste the Development URL ending in `/dev/<widget>/`.
4. Add the external widget to the corresponding Development page.
5. Test Creator SDK initialization, loading, saving, Custom APIs, popups, and permissions.

Do not replace Stage or Production until the Proforma pilot is fully tested.

## 5. Connect Codex from the work workspace

Authorize only this repository. Give Codex permission to create feature branches and pull requests, but not to push directly to `main` or deploy production.

Codex should run:

```bash
npm run validate
npm run build:pages
```

The root and module-specific `AGENTS.md` files contain the permanent instructions that replace reliance on personal ChatGPT memory.

## 6. Create the work ChatGPT Project

Create a Project named **Land Master Engineering** in the work workspace. Point it to this repository and use the instructions in `knowledge/migration/work-chatgpt-project-instructions.md`.

Do not upload duplicate source copies into the Project unless necessary. GitHub is the source of truth.

## 7. Pilot with Proforma

The first milestone is:

> The unchanged Proforma widget loads from the Development GitHub Pages URL, all existing behavior works, Codex can make a branch-based change, and rollback works.

After that, migrate Budget, then Land Master, then the smaller widgets.
