# PR conventions, merge caveats, and the wider GIT space

## PR title / Jira linking

**Primary path.** RightShip branches carry the Jira key (`ET3-6112`), and the team's commit/PR titles
lead with it: e.g. `ET3-6112 Fix show incompatible time-range popup`. With the key in the branch and
title, the GitHub ↔ Jira integration links the PR to the issue automatically. This is the normal case —
no manual linking step.

**Workaround (exception).** From **Guidelines for Associating a PR with a Jira Issue After Its Creation
Through GIT** (https://rightship.atlassian.net/wiki/spaces/DEV/pages/2546008192): when an urgent fix is
made *before* a Jira issue exists, the PR won't auto-link. The author (their responsibility) links it
after the fact by editing the PR title to reference the issue, e.g.:

```
Fixed: #https://rightship.atlassian.net/browse/PX-18415
```

Use this only when there is no Jira key to put in the title in the first place — it is the documented
recovery path, not the default format.

## Merge-time caveats (for when the PR later gets merged)

- **Resolving Simple Conflicts on a Pull Request** (https://rightship.atlassian.net/wiki/spaces/DEV/pages/2524905500):
  only resolve conflicts in the GitHub UI for trivial changes (e.g. text). **Anything code-related must
  be compiled/tested locally**, not conflict-resolved in the browser.
- **Merging Branches on GitHub** (https://rightship.atlassian.net/wiki/spaces/DEV/pages/2526216195):
  when merging branches that have **multiple linked Jira items**, GitHub can leave the message field
  empty and fail to link the Jira items. A **Chrome extension** is required to work around this — see
  the page's video.

## Genesis submodule case

From **Guide: Updating the Genesis Submodule in Your Parent Repository**
(https://rightship.atlassian.net/wiki/spaces/DEV/pages/2505277487). Relevant when a parent repo (e.g.
RightShipQi) consumes the **Genesis** submodule and you changed Genesis:
- Inside Genesis, branch from the current HEAD with a **feature-descriptive** name (e.g.
  `token-authentication`) — **do not** use parent Jira numbers (avoids unwanted status changes) and do
  **not** commit directly to `rightship/develop|master|release|bau-release`.
- After pushing the Genesis branch you **don't** PR/merge it on its own; instead the parent repo shows a
  submodule pointer (commit SHA) change — **commit that and open the PR in the parent repo**. The
  reviewer reviews by looking up the new SHA.

## The full GIT Confluence tree (for reference)

Parent: **GIT** (https://rightship.atlassian.net/wiki/spaces/DEV/pages/2507636800) — empty landing page.

- Git Flow - The Journey to a Release — 2444591121  *(branch model + flow; see git-flow.md)*
  - Git and Process flow — 2808086675  *(duplicate of the above)*
- Implementing Branch Name Standardization through Git Hooks — 2500493324  *(see branch-naming.md)*
- Guide: Updating the Genesis Submodule — 2505277487  *(submodule case, above)*
- Introduction to GitHub for Git Migration — 2523955241  *(intro prose, no procedure)*
  - GitHub Migration Training — 2525102219  *(index of how-to videos)*
    - How to Clone the QiPortal Repo from GitHub — 2525102170  *(video only)*
    - How to Create a Pull Request on GitHub — 2525233553  *(video only; no text steps)*
    - How to Review, Accept and Merge a Pull Request — 2524905491  *(video only)*
    - Resolving Simple Conflicts on a Pull Request — 2524905500  *(caveat, above)*
    - Merging Branches on GitHub — 2526216195  *(multi-Jira caveat, above)*
    - Detecting Dependency Vulnerabilities via Dependabot — 2529001508  *(empty)*
    - GitHub Copilot for Visual Studio — 2529492993  *(IDE shortcuts, not PR-related)*
    - GitHub Copilot for Visual Studio Code — 2529755137  *(IDE shortcuts, not PR-related)*
- Guidelines for Associating a PR with a Jira Issue — 2546008192  *(title workaround, above)*
- How to Manually Trigger the Qi Release for Staging (GitHub Actions) — 3030712395  *(release trigger; not PR creation)*

Note: the how-to pages under "GitHub Migration Training" are screen-recorded walkthroughs with little
or no body text — the procedural substance lives in the flow, naming, and Jira-linking pages above.
