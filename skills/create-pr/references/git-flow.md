# Git flow — the journey to a release

Distilled from **Git Flow - The Journey to a Release**
(https://rightship.atlassian.net/wiki/spaces/DEV/pages/2444591121) and its duplicate
**Git and Process flow** (https://rightship.atlassian.net/wiki/spaces/DEV/pages/2808086675).
The GitHub org is `RightShip-Tech`.

> **⚠️ Update (2026-09-07): squad branches are retired.** Both Confluence pages above are stale
> (last modified Oct 2024 / Sep 2024) and still describe the squad-branch model below — a search
> for a newer replacement doc turned up nothing, so this isn't documented anywhere yet. What's
> confirmed directly from the user: subtask branches still PR into their story branch, unchanged;
> stories now merge **into the current release branch** instead of into a squad branch. What's
> **not confirmed** — don't assume either answer, ask instead:
> - Whether the review requirement for story → release is still "no review, direct merge" (as
>   story → squad was) or now requires a reviewed PR.
> - Whether branch names still carry a squad-like segment (`type/<squad>/<JIRA>`) or have dropped
>   it (`type/<JIRA>`).
>
> The rest of this file (below) is the **original, now-partly-superseded** model — kept for the
> parts that are still accurate (subtask flow, hotfix flow, release → master) and as context for
> what changed. The base-branch table in `SKILL.md` reflects the update above.

## Key branches (original model — squad branches retired, see update above)

- **master** — stable, production-ready code.
- **release/release-X.Y.Z** — staging / testing / production-prep (e.g. `release/release-1.80.0`).
- ~~**squad1 … squad4** — squad-specific development branches.~~ Retired.
- **story/ET-X** — a specific story/feature (e.g. `story/squad2/ET2-242-should-have-description` under the
  old naming — whether the squad segment survives is unconfirmed).
- **subtask/ET-X** — a sub-task of a story (e.g. `subtask/squad2/ET2-998`) — unchanged, still PRs into its story.
- **fix/ET-X** — a bug-fix branch (e.g. `fix/squad2/ET2-555`).

## Environments

Squad (Squad1–4) → Staging → Preproduction → Production. (Unconfirmed whether the Squad1–4
*environments* changed along with the git branches — only the branch topology was confirmed
retired, not necessarily the environments themselves.)

## Standard flow (and where PRs happen)

1. **Story creation**
   - Branch **story/ET-X**. (Previously from `<squad>`; source branch now unconfirmed — likely the
     current release branch, but ask.)
   - Create **subtask/ET-X** branches from the story for each subtask — **unchanged**.
   - **PR each subtask → its story branch. Review required.** — **unchanged, confirmed**.
   - When all subtasks are done, **merge story → the current release branch** (replaces the old
     story → squad merge). **Review requirement unconfirmed — ask, don't assume "no review" carried over.**
   - Any bug found during development: create **fix/ET-X** and PR into the current release branch.
     Review required (carried over from the old fix → squad/release rows, both of which required review).
2. **Release preparation**
   - Previously: branch **release/release-X.Y.Z** from `<squad>`; deploy to **Staging**. With squad
     branches gone, it's unconfirmed whether release branches are still cut this way, or whether the
     release branch now also absorbs the role squad used to play as the continuous dev-integration
     branch. Ask before assuming either.
   - Further bug fixes go via **fix/** branches merged into the release branch (PR + review) — likely
     unchanged, since this never depended on squad.
   - Scrum master updates the release document.
3. **Final deployment** (devops)
   - Deploy release → Production, merge **release → master**, delete the release branch — unchanged.
   - Previously: merge **master → every squad** branch. With squad branches retired, this step's
     replacement (if any) is unconfirmed.

## Hotfix flow

1. Branch a **release branch** from **master** (e.g. `release/release-1.80.1`). Bugs needing hotfixes
   are branched from **master** and **merged via PR (with review) into the release branch**.
2. Deploy to **Preproduction** for QA; scrum master updates the release document.
3. After approval, devops deploy to Production, merge **release → master**, delete the release branch.
   (Previously also "then merge master → every squad" — unconfirmed whether any replacement step
   exists now that squad branches are retired.)

## Base-branch table — the reasoning

This is why each row of the table in `SKILL.md` reads the way it does:

- **subtask → story (PR, review).** Subtasks are integrated into their story via reviewed PRs. The
  branch name (`subtask/squad2/ET2-998`) does **not** encode the story it belongs to
  (`story/squad2/ET2-242-...`), so the base must be asked for or chosen from the list of
  `story/*` branches — never guessed. **Confirmed unchanged** by squad branches retiring.
- **story → the current release branch.** Squad branches are retired (confirmed 2026-09), so the old
  "story → squad, direct merge, no review" row no longer applies as written. Stories now merge into
  the current release branch instead — but whether that merge is still review-free or now goes
  through a reviewed PR is **not documented anywhere and not yet confirmed**. Treat this the same way
  the skill already treats a genuinely ambiguous base: recommend the current release branch, but
  explicitly ask whether a PR/review is expected before treating it as a no-review direct merge.
- **fix → the current release branch.** With squad gone, `fix/` branches no longer have a squad target
  to choose between — they go into the current release branch. Still a reviewed PR (this was already
  true for both of the old fix rows, so this part carries over with confidence).
- **hotfix → release branch.** Hotfixes branch from `master` and are PR'd (with review) into the
  release branch cut for the hotfix. Confirm the exact `release/release-x.y.z`. Unaffected by the
  squad-branch retirement.
- **release → master** is a devops step at final deployment, not a routine developer PR. Unaffected.
- **develop, master, bau-bugs** are integration/long-lived branches, not PR *sources* for a developer's
  change — clarify intent before doing anything if the user is on one of these. **`squad*` branches are
  retired** — if one still exists, treat it the same way (not a PR source), but flag to the user that
  it's a leftover from the old model rather than assuming it plays its old role.
