---
name: create-pr
description: >-
  Create a GitHub pull request for a RightShip-Tech repository, faithfully following the
  RightShip DEV "GIT" Confluence guide — the git-flow branch model, the approved branch-name
  formats, and Jira-linked PR titles. Use this whenever the user wants to open, create, raise,
  "put up", or "PR" a branch in a local clone of any RightShip-Tech repo (fleet-focus-app, qiportal,
  platform, common-ui, due-diligence-app, my-vessels-app, list-and-alerts-app, rs-inspection-app,
  psc-riskiq-app, angular-host-app, common-ng, etc.). Trigger it even for terse asks like
  "PR this", "raise a PR", "open a pull request for my branch", "create a PR into squad3",
  or "put my subtask up for review" — anything that means turning the current branch into a
  pull request. The skill works out the correct base branch from the git-flow model (confirming
  with the user instead of guessing), checks the branch name against the standard formats,
  builds a Jira-referenced title from the branch, and hands off to a browser-confirmed PR creation —
  via `gh pr create --web` when the CLI is available and can open a browser, or a prefilled GitHub
  compare URL (handed back as a clickable link) when it can't — so the user always reviews and
  clicks Create themselves.
---

# Create a RightShip pull request

Turn the current branch into a GitHub pull request the way the RightShip DEV team documents it,
so the PR lands on the right base branch, is named so Jira links it, and doesn't skip a step the
team relies on.

**Source of truth** — the RightShip DEV "GIT" space. Everything here is distilled from those
pages; the raw detail and links live in `references/`. When something is ambiguous, the
Confluence guide wins:
- Git Flow — The Journey to a Release: https://rightship.atlassian.net/wiki/spaces/DEV/pages/2444591121
- Branch Name Standardization: https://rightship.atlassian.net/wiki/spaces/DEV/pages/2500493324
- Associating a PR with a Jira Issue: https://rightship.atlassian.net/wiki/spaces/DEV/pages/2546008192

## The two things that make a PR correct here

Most of this workflow is mechanical. Two decisions are not, and getting them wrong is what makes
a PR wrong on this team — so the skill **confirms** them rather than assuming:

1. **The base branch.** In the git-flow model the base is not always inferable from the branch
   name (a `subtask/` branch doesn't record which `story/` branch it belongs to), and one common
   transition — `story/*` → `squad*` — is deliberately **not a PR at all**. Recommend a base from
   the table below, then confirm it with the user before creating anything.
2. **Whether a PR is even the right move.** If the current branch isn't a PR *source* in the model
   (e.g. you're sitting on `squad3`, `develop`, or `master`), stop and ask what they actually want
   instead of opening a PR from it.

## Workflow

**rtk proxy note:** if the user has the `rtk` CLI proxy configured (see their global `RTK.md`),
every `git`/`gh` command below should be run through it (`rtk git status`, `rtk gh pr create …`) —
it cuts token-heavy output (diffs, logs, PR views) by up to 90% with no change in what the command
does. If a Claude Code hook is already rewriting bare `git`/`gh` commands to `rtk git`/`rtk gh`
transparently, typing the bare command is equally fine; the explicit `rtk` prefix below just keeps
this skill self-contained if no such hook is active. Never prefix the bundled Python script
(`scripts/build_compare_url.py`) with `rtk` — it's a local script, not a git/gh call.

### 1. Establish context
Run these in the repo the user is working in (default: current directory):
- `rtk git remote -v` → confirm it's a `github.com/RightShip-Tech/<repo>` remote, and capture `<owner>/<repo>`.
- `rtk git branch --show-current` → the head branch (the PR source).
- `rtk git status` → is the work committed? Is anything uncommitted that belongs in this PR?
- `rtk git log --oneline -8` → see the title convention this repo actually uses (RightShip commits read
  like `ET3-6112 Fix show incompatible time-range popup` — the Jira key leads).

Parse the branch name into **type / squad / Jira-key** where it fits the pattern
`type/squad/JIRA-...` (e.g. `story/squad3/ET3-6112-...` → type `story`, squad `squad3`, key `ET3-6112`).

### 2. Check the branch name against the standard
Compare the branch name to the approved formats (see `references/branch-naming.md`). These are the
names the team's pre-push hook is meant to allow. If the current name doesn't match, **warn** the
user and explain which format fits their intent — but don't hard-block or auto-rename. Renaming a
branch someone is mid-work on is disruptive, and the real enforcement is the push itself: if a hook
is installed it will reject a bad name far more authoritatively than a regex reimplemented here.

**When the skill itself proposes a new branch** (e.g. the current branch isn't a valid PR source and
a fresh `type/<squad>/<JIRA>` branch needs to be cut), append a short kebab-case description after the
Jira key — `type/<squad>/<JIRA>-<short-description>`, e.g. `fix/squad3/ET3-7104-analytics-export-disabled`.
See "Short description suffix" in `references/branch-naming.md`. This only applies to branches the
skill creates; don't rename an existing branch just to add one.

### 3. Decide the base branch (recommend, then confirm)
Use this table to recommend a base, then **confirm with the user** before proceeding. Reasoning for
each row is in `references/git-flow.md`.

> **⚠️ Squad branches are retired (confirmed 2026-09)** — the table below reflects that. Two things
> about the replacement flow are still genuinely undocumented: whether `story → release` is still a
> no-review direct merge, and whether branch names still carry a squad-like segment. Don't assume
> either answer — surface it as an open question the same way an ambiguous base normally gets asked.

| Current branch (PR source) | Recommended base | Review needed? | Must confirm because… |
|---|---|---|---|
| `subtask/<JIRA>` (or `subtask/<squad>/<JIRA>`) | its parent `story/<story-JIRA>` | **Yes** | the branch name doesn't say *which* story — ask, or list `story/*` branches to pick from. Unchanged by the squad retirement. |
| `story/<JIRA>` (or `story/<squad>/<JIRA>`) | the current `release/release-x.y.z` branch | **Unconfirmed** | squad branches are retired, so this no longer merges into `<squad>` — but whether it's still a no-review direct merge or now needs a reviewed PR isn't documented anywhere. Ask explicitly; don't default to either the old "no review" behavior or a new assumption. |
| `fix/<JIRA>` (or `fix/<squad>/<JIRA>`) | the current `release/release-x.y.z` branch | **Yes** | squad is no longer a target, so this always goes to the current release branch now — confirm which one |
| `hotfix/*` | the current `release/release-x.y.z` hotfix branch | **Yes** | confirm the exact release branch; hotfixes branch from `master` |
| `feature/*/*`, `task/*/*` | usually the current release branch or the owning story | **Yes** | context-dependent — confirm |
| `release/*` | `master` | (devops) | release→master is a devops step, not a normal dev PR — confirm intent |
| `squad*` (if one still exists), `develop`, `master`, `bau-bugs` | — | — | **not a PR source** in this model — stop and clarify what they want. A `squad*` branch is a leftover from the retired model; don't assume it still plays its old role. |

If you cannot confidently map the branch to a row, that's the signal to **ask**, not to guess.

### 4. Make sure the branch is pushed
A PR needs the head branch on the remote.
- If there are uncommitted changes that belong in this PR, **ask before committing** — never commit
  on the user's behalf without a clear go-ahead. Follow the repo's `JIRA-KEY summary` commit style.
- Push with upstream tracking if needed: `rtk git push -u origin <head>`.
- If a pre-push hook rejects the branch name, surface its message verbatim — that hook is the
  authority on naming, not this skill.

### 5. Build the title and body
**Title — primary path:** lead with the Jira key from the branch, then a short summary, matching the
repo's existing style: `ET3-6112 Fix incompatible time-range popup on fleet map`. Because the Jira key
is in the branch and the title, GitHub's Jira integration links the PR automatically — no manual step.

**Title — fallback only:** if there is genuinely no Jira key (an urgent fix made before a ticket
existed), use the documented workaround `Fixed: #https://rightship.atlassian.net/browse/<KEY>`
and note that the author is expected to back-link it (see `references/pr-conventions.md`). Treat this
as the exception, not the default.

**Body — structure:** always the same two required parts, nothing more by default:
```markdown
## Summary
- <what changed, as a bullet a reviewer can scan in a few seconds>
- <why, if it's not already obvious from the ticket>

Jira: https://rightship.atlassian.net/browse/<KEY>
```
Bullet points, not prose paragraphs — a reviewer should get the gist without reading a paragraph.
Write each bullet as **one continuous line**, however long — don't manually hard-wrap it onto a
second, indented line at some fixed column. GitHub's PR body (and the compare-form textarea) both
soft-wrap to the actual viewport width, so a manual line break shows up as a short, ragged early
line instead of using the space available — it looks like the text is fighting the layout instead
of filling it. This applies to every section below too, not just Summary.

Only add further sections when the change actually has something concrete to say there — an empty
`## Testing` or `## Known tradeoffs` header that just says "N/A" is worse than not having it, since
it trains reviewers to skim past headers instead of reading them. Reach for one of these when it's
genuinely true of the change:
- `## Not included` — part of the ticket's stated scope is deliberately left undone (e.g. a sibling
  issue turned out to need no code fix, or was descoped) — say so explicitly, so it doesn't look like
  an oversight.
- `## Known tradeoff` — a design/implementation choice knowingly leaves a rough edge (e.g. a
  lightweight fix that doesn't cover every input method) — name the tradeoff and why it was accepted.
- Anything else the specific change calls for (e.g. `## Testing` when there are non-obvious manual
  verification steps a reviewer should redo). There's no fixed list here — the fixed part of the
  template is just `## Summary` + the Jira link.

### 6. Create the PR
The PR is never submitted directly via API — the user always confirms creation in the browser on
GitHub's own prefilled form. This applies whether or not `gh` is installed, and whether or not a
browser is actually launchable from the machine running the command.

- **Check for gh:** `rtk gh --version`. If present and authenticated (`rtk gh auth status`), try
  `--web` so `gh` opens the browser to a prefilled "Open a pull request" page instead of creating
  it via the API:
  ```
  rtk gh pr create --repo <owner>/<repo> --base <base> --head <head> --title "<title>" --body "<body>" --web
  ```
  Nothing is created until the user reviews the form and clicks **Create pull request** themselves.
- **`--web` fails to open a browser:** in a headless/WSL/container environment there may be no
  browser opener at all — the giveaway is an error like
  `exec: "xdg-open,x-www-browser,www-browser,wslview" executable file not found in $PATH`. This is
  not a PR-creation failure, just a missing local browser — fall straight through to the compare-URL
  path below instead of treating it as blocked.
- **No gh, or `--web` couldn't open a browser:** build a prefilled compare URL and give it to the
  user to open. URL-encoding the title/body by hand is error-prone, so use the bundled script:
  ```
  python "<skill-dir>/scripts/build_compare_url.py" \
    --owner RightShip-Tech --repo <repo> --base <base> --head <head> \
    --title "<title>" --body "<body>"
  ```
  It prints `https://github.com/<owner>/<repo>/compare/<base>...<head>?expand=1&title=…&body=…` —
  functionally the same browser-confirm step `--web` gives you, just without `gh`/a local browser.

  **Always hand this URL back as a rendered markdown link, never inside a code fence:**
  `[Open PR compare form for <JIRA-KEY> →](<url>)`. Chat clients auto-linkify a bare URL or a
  markdown link, but they render triple-backtick code blocks as inert monospace text — pasting the
  URL inside one silently defeats the entire point of "give the user something to click." Do not
  truncate or paraphrase the URL when presenting it (e.g. `&body=...`) — the query string carries
  the actual PR body, so a shortened link opens the compare form with an empty body.

**Security:** never fall back to a personal access token / raw API call to force PR creation, and
never use plain `gh pr create` (without `--web`) to create the PR directly — the browser confirmation
is the point, not an implementation detail to skip when `gh` is available.

### 7. Dry-run by default
The first time through, **show the plan and stop** — repo, head, recommended base (and that it's
confirmed), title, body, and the exact `gh` command or compare URL — without pushing or opening
anything. Let the user approve. Only then push (step 4) and open the browser confirmation (step 6).
This matters because a push is outward-facing and awkward to undo, the base branch was a judgement
call worth a second look, and — even with approval to proceed — the PR itself still isn't created
until the user clicks **Create pull request** in the browser (step 6). Don't treat "approved the plan"
as license to submit the PR yourself; the browser step is the final gate, not a formality.

## Reference material
Read these when you need the detail behind a step:
- `references/git-flow.md` — full branch model, environments, the release and hotfix flows, and the
  reasoning behind each row of the base-branch table.
- `references/branch-naming.md` — the approved branch-name formats and the pre-push hook.
- `references/pr-conventions.md` — PR title / Jira-linking rules (primary vs. workaround), merge-time
  caveats (simple conflicts only; multi-Jira linking needs a Chrome extension), the Genesis submodule
  case, and links to every page in the GIT space.
