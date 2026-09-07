# claude-skills

Personal [Claude Code](https://claude.com/product/claude-code) skills, generalized so anyone on the team can use them.

## Install

```bash
npx skills@latest add anh-ngo-rightship/claude-skills --skill create-pr -a claude-code
```

## Skills

- **[create-pr](./skills/create-pr/SKILL.md)** — opens a GitHub pull request for a RightShip-Tech repo, following the RightShip DEV "GIT" Confluence guide: recommends and confirms the correct git-flow base branch, checks the branch name against the approved formats, builds a Jira-linked title, and hands off to a browser-confirmed `gh pr create --web` (or a prefilled compare URL if `gh`/a browser isn't available) — nothing is created until you click **Create pull request** yourself.

See `skills/create-pr/SKILL.md` for the full detail, or the RightShip DEV "GIT" Confluence space for the source-of-truth process docs it's built on.
