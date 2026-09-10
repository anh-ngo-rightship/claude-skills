---
name: sonar-triage
description: >-
  Triage SonarQube-equivalent code issues locally, with no SonarQube server or token needed —
  runs ESLint's own ruleset (already wired into RightShip-Tech CI) plus eslint-plugin-sonarjs
  (a public-npm, offline port of a large chunk of SonarQube's actual JS/TS rules) against a
  target project. Classifies every finding by category (security/bug-risk/code-smell/convention),
  complexity, auto-fix safety, and whether the correct fix needs product/business judgment an
  LLM can't infer from the code alone — then flags which findings need a human decision. Report
  + classify only for this POC: it never auto-fixes or edits the target project. Personal skill,
  built as a proof-of-concept for an internal "AI initiative" demo. Trigger for asks like "triage
  this repo for Sonar-style issues", "run sonar-triage on <project>", "what would SonarQube flag
  here", or "classify these lint issues by auto-fix safety".
---

# sonar-triage

Triage SonarQube-style code issues against a target project with no SonarQube server, token, or
network dependency — using ESLint's existing ruleset plus `eslint-plugin-sonarjs` as a local,
offline stand-in for SonarQube's JS/TS rule engine. Every finding gets classified and routed to
one of four buckets (escalate for security review, flag for human review, auto-fix with a
spot-check, or auto-fix) so a human can see at a glance which findings actually need their
attention. **This POC only reports and classifies — it never executes an auto-fix or edits the
target project in any way**, regardless of which bucket a finding lands in.

## Why this approach

No SonarQube server/token is available for this POC. The validated substitute:
`eslint-plugin-sonarjs` is a no-auth, public-npm port of a large chunk of SonarQube's real JS/TS
rule set, and it runs entirely offline through ESLint's flat config — layered on top of whatever
ESLint config the target repo already runs in its own CI (e.g. `global__eslint.yml` in
RightShip-Tech repos). This was validated end-to-end against `common-ng/ui`: the repo's existing
config alone found 94 findings across 13 rules; adding the sonarjs overlay found 568 findings
across 45 distinct rules (plus, separately, 2 pre-existing parser errors in test files, unrelated
to sonarjs, surfaced as flag-for-review items). Real, varied results from a genuinely offline
pipeline.

**Known catalog gap:** with the current hand-curated `CATALOG` data, the `auto-fix-with-spot-check`
bucket is mathematically unreachable — every catalog entry marked `autoFixSafety: "safe"` is also
`complexity: trivial` or `low` (which routes straight to plain `auto-fix`), and no
`category: "security"` entry is marked `safe`. In practice a triage run may show 0 findings in
that bucket even on a large codebase — that's expected given today's `CATALOG`, not a bug. If a
run's summary should ever show all four buckets populated, that requires a deliberate decision to
either add a new `CATALOG` entry that's genuinely `safe`+`medium/high` (or `safe`+`security`), or
revisit `decide()` — see `references/classification-rubric.md`. Don't silently reclassify an
existing entry just to populate the bucket.

**Out of scope for this POC:** `api/` (the .NET side of these repos). The natural extension
there is `SonarAnalyzer.CSharp` — a Roslyn analyzer NuGet package that, like this overlay, runs
fully offline/serverless at build time. Not built here; mention it if the user asks about .NET
coverage.

## Non-negotiable safety rule

**Never install anything into the target project's own `node_modules`, and never touch its
`package.json` or lockfile.** Testing this once installed `eslint-plugin-sonarjs` directly into a
target repo's `node_modules` with `npm install --no-save` and it silently corrupted the existing
bun-managed dependency tree (deleted `eslint` entirely), even though `package.json` itself was
untouched — npm's dependency resolution mutated the physical `node_modules` tree regardless of
`--no-save`. `scripts/run-triage.mjs` avoids this by installing `eslint-plugin-sonarjs` **once**,
into its own isolated cache at `~/.claude/skills/sonar-triage/.cache/` (with its own minimal
`package.json`), reused across every future run and target. It then writes an ephemeral flat-config
overlay file inside that same cache dir that imports the target's own `eslint.config.js` by
absolute path and layers `eslint-plugin-sonarjs` on top, and runs the lint using the **target's
own installed ESLint binary** with `cwd` set to the target. If you are ever asked to modify this
script, preserve this isolation — it is the one thing that went wrong before.

## Workflow

### 1. Get the target path

If the user didn't already give a target project path, ask for one. It must:
- Be a local path to a project (not the RightShip repo root necessarily — e.g. for `common-ng`
  the target is `common-ng/ui`, not `common-ng` itself).
- Contain `eslint.config.js` (the script also checks one level into common subdirs like `ui/`,
  `app/`, `src/`, mirroring how the org's `global__eslint.yml` CI workflow finds it, but confirm
  with the user if you're not sure which directory is the real target).
- Have `node_modules` already installed (the script checks for
  `node_modules/.bin/eslint`) — if missing, tell the user to run `bun install` or `npm install`
  in the target first; don't run that install for them without asking, since it's their repo's
  dependency tree.

### 2. Run the triage script

```
node ~/.claude/skills/sonar-triage/scripts/run-triage.mjs --target <path> [--file <relative-path>] [--out <file>]
```

- `--target` — required, the project path from step 1.
- `--file` — optional, path to a single file relative to the resolved target directory (e.g.
  `src/components/comp-data-grid/query-filter.ts`) to lint just that file instead of the whole
  project. Same overlay config and classification logic, just scoped to one file — useful when a
  user wants a concrete example on the single worst-offending file rather than a full-repo dump.
  To find a good candidate file for this, run the whole-project pass first and pick a file with
  both a high finding count and rule variety (not just one repeated trivial rule) from its
  report — that makes a much better example than the raw highest-count file, which is often a
  constants file tripped by one mechanical rule dozens of times.
- `--out` — optional, defaults to `./sonar-triage-report.md` **resolved relative to the directory
  you invoke this command from**, not inside the target repo. Don't write report files into a
  repo this skill is merely analyzing. Pick an explicit `--out` (e.g. into the scratchpad
  directory) when you don't want it landing in your own cwd.

The script prints a plain-text summary to stdout (total findings, counts by recommended action,
by category, and by source) regardless of report size, and writes the full Markdown report to
`--out`. The first run for a given machine installs `eslint-plugin-sonarjs` into the isolated
cache (one-time, a few seconds); later runs reuse it.

If the script exits with an error about a missing `eslint.config.js` or missing ESLint binary,
relay that message directly — it already explains what to fix. Never attempt to work around a
missing `node_modules` by installing into the target yourself.

### 3. Present the results — without reading the whole report into context

The report can easily run to hundreds of rows (568 findings in the validated `common-ng/ui` run).
**Don't `Read` the entire report file** — that dumps a huge table into context for no benefit.
Instead:
- Lead with the **summary counts already printed to stdout** (total, by recommended action, by
  category, by source) — that alone answers "how bad is it" and "how automatable is it."
- Then read (with the `Read` tool's `offset`/`limit`, or grep for the section headers) just the
  `## Escalate — security review` and `## Flag for human review` sections of the report — these
  are the highest-priority, human-attention items and are what the user most needs to see first.
  Show that table (or a representative slice of it if it's still very long) directly in your
  reply.
- For `## Auto-fix with spot-check` and `## Auto-fix`, report only the counts — don't dump those
  tables; point the user to the report file for the full list.
- **Explicitly tell the user this run did not modify any code** — it only read the target's
  config/binary to lint it, and wrote the report to `--out`. No auto-fix was executed against any
  bucket, including the ones classified `auto-fix`/`auto-fix-with-spot-check` — this POC is
  report + classify only.
- Give the user the report's file path so they can open the full thing themselves.

### 4. Extending the catalog

`scripts/rule-catalog.mjs` holds the hand-curated `CATALOG` and the `classifyFallback()`/`decide()`
logic. See `references/classification-rubric.md` before adding or changing entries — it explains
the four classification axes (`category`, `complexity`, `autoFixSafety`, `domainJudgment`) and
why `domainJudgment` is deliberately independent of the other three, with worked examples from the
real `common-ng` run.
