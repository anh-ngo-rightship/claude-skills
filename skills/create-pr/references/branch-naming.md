# Branch-name standardization

From **Implementing Branch Name Standardization through Git Hooks**
(https://rightship.atlassian.net/wiki/spaces/DEV/pages/2500493324).

A **pre-push git hook** verifies the branch name before a push is allowed, to keep naming consistent.
The page provides a downloadable hook to place at `<repo-root>/.git/hooks/pre-push` in each repo
— the exact path is OS-dependent (e.g. `C:\Git\qiportal\.git\hooks\pre-push` on Windows,
`~/Git/qiportal/.git/hooks/pre-push` on macOS/Linux/WSL).

## Approved branch-name formats

- `bau-bugs`
- `develop`
- `feature/*/*`
- `hotfix/*`
- `master`
- `release/*`
- `squad*`
- `story/*/*`
- `fix/*`
- `subtask/*/*`
- `task/*/*`
- `merge/*` — **only** for merge conflicts
- `dummy/*/*` — **only** for new members during onboarding

## Notes / gotchas

- The doc lists `fix/*`, but the git-flow examples use `fix/squad2/ET2-555` (i.e. `fix/<squad>/<JIRA>`).
  The doc is internally inconsistent and the exact regex isn't published, so treat these formats as
  **advisory**: warn on an obvious mismatch, but let the real pre-push hook be the authority. If the
  push is rejected, show the hook's message verbatim.
- Pre-push hooks may or may not be installed depending on the repo/machine — check before assuming
  enforcement happens automatically. Without one, a bad name may only be caught server-side (branch
  protection) or not at all locally. Don't rely on a local hook existing.
- The `<squad>` and `<JIRA>` segments in practice look like `squad3` and `ET3-6112`. **Squad branches
  themselves are retired (confirmed 2026-09, see `git-flow.md`)** — but whether the `<squad>` segment
  in branch *names* (`type/<squad>/<JIRA>`) is still used, or has been dropped in favor of
  `type/<JIRA>`, is undocumented and unconfirmed. Ask rather than assume either format when creating
  a new branch.

## Short description suffix

When the skill is proposing a **new** branch name (not just checking an existing one), append a short
kebab-case description after the Jira key: `type/<squad>/<JIRA>-<short-description>`, e.g.
`fix/squad3/ET3-7104-analytics-export-disabled-when-no-data`. This mirrors the `story` example in
`git-flow.md` (`story/squad2/ET2-242-should-have-description`) and makes the branch self-explanatory
in `git branch`/PR lists without opening the ticket.

- Derive the description from the Jira summary or the change itself — a few hyphenated words, no
  articles, lowercase.
- This is a **naming convention this skill enforces when creating branches**, not a hard rule found
  verbatim in Confluence — the actual repo history is inconsistent (e.g. `fix/squad3/ET3-7136` and
  `fix/squad3/ET3-6952` both merged with no description suffix). Don't rename an **existing** branch
  someone is already working on just to add a suffix; only apply this when the skill itself is
  generating a fresh branch name.
