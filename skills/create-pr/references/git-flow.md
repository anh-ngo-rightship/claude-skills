# Git flow — the journey to a release

Distilled from **Git Flow - The Journey to a Release**
(https://rightship.atlassian.net/wiki/spaces/DEV/pages/2444591121) and its duplicate
**Git and Process flow** (https://rightship.atlassian.net/wiki/spaces/DEV/pages/2808086675).
The GitHub org is `RightShip-Tech`.

## Key branches

- **master** — stable, production-ready code.
- **release/release-X.Y.Z** — staging / testing / production-prep (e.g. `release/release-1.80.0`).
- **squad1 … squad4** — squad-specific development branches.
- **story/<squad>/ET-X** — a specific story/feature (e.g. `story/squad2/ET2-242-should-have-description`).
- **subtask/<squad>/ET-X** — a sub-task of a story (e.g. `subtask/squad2/ET2-998`).
- **fix/<squad>/ET-X** — a bug-fix branch (e.g. `fix/squad2/ET2-555`).

## Environments

Squad (Squad1–4) → Staging → Preproduction → Production.

## Standard flow (and where PRs happen)

1. **Story creation**
   - Branch **story/<squad>/ET-X** from **<squad>**.
   - Create **subtask/<squad>/ET-X** branches from the story for each subtask.
   - **PR each subtask → its story branch. Review required.**
   - When all subtasks are done, **merge story → <squad> directly. No review, no PR.**
   - Any bug found during development: create **fix/<squad>/ET-X** and **PR → <squad>. Review required.**
2. **Release preparation**
   - Branch **release/release-X.Y.Z** from **<squad>**; deploy to **Staging**.
   - Further bug fixes go via **fix/** branches **merged into the release branch** (PR + review).
   - Scrum master updates the release document.
3. **Final deployment** (devops)
   - Deploy release → Production, merge **release → master**, delete the release branch.
   - Merge **master → every squad** branch (verify for conflicts) and redeploy each squad env.

## Hotfix flow

1. Branch a **release branch** from **master** (e.g. `release/release-1.80.1`). Bugs needing hotfixes
   are branched from **master** and **merged via PR (with review) into the release branch**.
2. Deploy to **Preproduction** for QA; scrum master updates the release document.
3. After approval, devops deploy to Production, merge **release → master**, delete the release branch,
   then merge **master → every squad**.

## Base-branch table — the reasoning

This is why each row of the table in `SKILL.md` reads the way it does:

- **subtask → story (PR, review).** Subtasks are integrated into their story via reviewed PRs. The
  branch name (`subtask/squad2/ET2-998`) does **not** encode the story it belongs to
  (`story/squad2/ET2-242-...`), so the base must be asked for or chosen from the list of
  `story/<squad>/*` branches — never guessed.
- **story → squad (direct merge, NOT a PR).** The guide explicitly merges a completed story into its
  squad branch without review. Opening a PR here contradicts the documented process, so the skill
  should say so and only proceed if the user overrides.
- **fix → squad (dev) OR fix → release (release prep).** Same `fix/` branch, two possible bases
  depending on where the cycle is. Both are reviewed PRs. Confirm which base applies.
- **hotfix → release branch.** Hotfixes branch from `master` and are PR'd (with review) into the
  release branch cut for the hotfix. Confirm the exact `release/release-x.y.z`.
- **release → master** is a devops step at final deployment, not a routine developer PR.
- **squad*, develop, master, bau-bugs** are integration/long-lived branches, not PR *sources* for a
  developer's change. If the user is on one of these, clarify intent before doing anything.
