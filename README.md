# claude-skills

Personal [Claude Code](https://claude.com/product/claude-code) skills, generalized so anyone on the team can use them.

## Install

```bash
npx skills@latest add anh-ngo-rightship/claude-skills --skill <skill-name> -a claude-code
```

## Skills

- **[create-pr](./skills/create-pr/SKILL.md)** — opens a GitHub pull request for a RightShip-Tech repo, following the RightShip DEV "GIT" Confluence guide: recommends and confirms the correct git-flow base branch, checks the branch name against the approved formats, builds a Jira-linked title, and hands off to a browser-confirmed `gh pr create --web` (or a prefilled compare URL if `gh`/a browser isn't available) — nothing is created until you click **Create pull request** yourself.

- **[quick-review](./skills/quick-review/SKILL.md)** — runs a local stand-in for Pass 1 of the org's CI "Claude Code Review" GitHub Action before you push: security vulnerabilities, business-logic regressions checked against the branch's Jira ticket, in-repo cross-layer blast radius, breaking changes, significant code smells — the same categories and "only significant findings" bar, just the moment right before a push instead of after a PR is opened. Report-only — never edits code, commits, or pushes.

See the [Confluence writeup](https://rightship.atlassian.net/wiki/spaces/RS/pages/4002578455/Automated+Code+Review+with+quick-review+Skill) for the quick-review pitch, including a real before/after example, or `skills/quick-review/SKILL.md` for the skill's own detail.

- **[sonar-triage](./skills/sonar-triage/SKILL.md)** — triages SonarQube-style code issues with no SonarQube server or token needed: runs a target project's own ESLint config plus `eslint-plugin-sonarjs` (an offline port of a large chunk of SonarQube's real JS/TS rules), then classifies every finding by category, complexity, auto-fix safety, and whether the correct fix needs a human's product/business judgment — routing each into escalate-for-security-review, flag-for-review, auto-fix-with-spot-check, or auto-fix. Report-only — never auto-fixes or edits the target project.

See the [Confluence writeup](https://rightship.atlassian.net/wiki/spaces/RS/pages/4012048401/Local+SonarQube-Style+Triage+with+sonar-triage+Skill) for the sonar-triage pitch, including a real run against `common-ng/ui`, or `skills/sonar-triage/SKILL.md` for the skill's own detail.
