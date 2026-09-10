# Classification rubric

`scripts/rule-catalog.mjs` classifies every finding along four independent axes, then a pure
function (`decide()`) turns that classification into one `recommendedAction`. This doc explains
the axes and gives worked examples from the real `common-ng/ui` validation run, so future
maintainers extending `CATALOG` stay consistent with how existing entries were reasoned about.

## The four axes

### `category`: `security | bug-risk | code-smell | convention`

What kind of problem this is, in decreasing order of "an attacker or a user notices":
- **security** — the issue is or could be exploitable (injection, weak crypto, exposed secrets,
  sanitization bypasses, ReDoS).
- **bug-risk** — the code plausibly behaves wrong today, even without an attacker.
- **code-smell** — the code works, but is harder to read/maintain/test than it should be.
- **convention** — a style/consistency rule with no behavioral consequence either way.

### `complexity`: `trivial | low | medium | high`

How much *work* the fix is, mechanically — independent of whether it's safe to automate. A
one-line rename is `trivial` even if it happens to be unsafe to automate (see
`@angular-eslint/no-output-on-prefix` below); a cognitive-complexity refactor is `high` even
though nothing about it needs outside knowledge.

### `autoFixSafety`: `safe | caution | unsafe`

How much regression risk there is in letting a fix be applied automatically, from a pure
code-correctness standpoint:
- **safe** — a mechanical, well-understood transform with no realistic way to change behavior.
- **caution** — usually fine, but has a plausible failure mode worth a spot-check (an exported
  symbol, an assumption about evaluation order, a regex whose semantics might shift).
- **unsafe** — the "fix" is a nontrivial rewrite, or the correct edit isn't determinable from the
  rule violation alone.

### `domainJudgment`: boolean

This is a **separate axis from complexity/safety on purpose.** It answers a different question:
*does the correct fix require product/business knowledge the model can't infer from the code
alone* — not "is this hard" or "is this risky to automate."

A fix can be mechanically trivial and still need `domainJudgment: true`. The canonical example
in the catalog is `sonarjs/no-clear-text-protocols`: swapping `http://` to `https://` is a
one-character, textbook-safe-looking edit — `complexity: trivial`. But the *correct* answer
depends on something no amount of static analysis can see: is this URL pointing at a real
production endpoint (fix it), or a deliberate local/test fixture that's supposed to stay
plaintext (leave it)? That's a product-knowledge question, not a code-complexity one. Hence
`autoFixSafety: caution` (the mechanical edit itself is low-risk) *and* `domainJudgment: true`
(a human still has to answer the "is this real" question first). `decide()` treats
`domainJudgment: true` as an unconditional override to `flag-for-review`, ahead of every other
axis, for exactly this reason.

Conversely, a fix can be flagged `domainJudgment: false` while still being high-complexity or
unsafe to automate — `sonarjs/cognitive-complexity` is `complexity: high`, `autoFixSafety:
unsafe`, but `domainJudgment: false`: the *problem* (a function is too branchy) and the general
*shape* of a fix (extract sub-functions) are both fully visible in the code. What makes it risky
is the size of the refactor and the chance of a slip, not a missing fact about the business.

## Worked examples from the `common-ng` run

| Rule | category | complexity | autoFixSafety | domainJudgment | Why it lands where it does |
|---|---|---|---|---|---|
| `sonarjs/public-static-readonly` | convention | trivial | safe | false | Purely mechanical (add a keyword); nothing about it depends on intent or product knowledge. → `auto-fix`. |
| `sonarjs/no-hardcoded-passwords` | security | trivial | unsafe | true | Mechanically trivial-looking (it's "just" a string), but this rule has a high false-positive rate (a field named `password` isn't always a secret) and, if real, the correct replacement (env var? secret manager? which one?) is a business/infra decision. → `flag-for-review` (domainJudgment overrides even the security branch). |
| `sonarjs/cognitive-complexity` | code-smell | high | unsafe | false | A large, well-understood but nontrivial control-flow refactor. No missing business fact — just genuine size and regression risk. → `flag-for-review`. |
| `sonarjs/no-clear-text-protocols` | security | trivial | caution | true | The edit itself (`http`→`https`) is one character and low-risk in isolation, but whether it's *correct* depends on whether this is a real endpoint or a deliberate test fixture — that's the domain-judgment axis doing its job independently of how "hard" the edit looks. → `flag-for-review`. |

## Why `domainJudgment` is its own axis (recap)

`complexity` and `autoFixSafety` both describe the *mechanics* of the fix. `domainJudgment`
describes something orthogonal: whether picking the *right* fix (as opposed to *a* fix) needs
information that lives outside the code — what a business rule means, what an image actually
shows, whether a TODO's underlying task is done, whether a Math.random() call is
security-sensitive in this context. An LLM (or any purely static tool) can't resolve that by
reading more code harder; it needs a human who knows the product. Keeping it a separate boolean,
rather than folding it into `autoFixSafety: unsafe`, means the report can distinguish "this is
technically risky to automate" from "this needs someone who knows the business to even state the
correct outcome" — two different reasons a human ends up in the loop, worth showing separately
when triaging a large finding list.

## A caveat for `decide()`'s four buckets

`decide()` has four possible outputs, but with the `CATALOG` data as specified, only three are
currently reachable: `escalate-security-review`, `flag-for-review`, and `auto-fix`.
`auto-fix-with-spot-check` requires either (a) a `security` entry with `autoFixSafety: "safe"`, or
(b) any entry with `autoFixSafety: "safe"` and `complexity: "medium"` or `"high"` — and no current
entry satisfies either. This was confirmed empirically against the `common-ng/ui` validation run
(568 findings, 0 landed in that bucket). It is not a bug in `decide()` or in the catalog entries
that exist — it's a property of the data as a whole. If a future run needs that bucket populated,
that's a deliberate catalog decision (does some rule genuinely deserve `safe`+`medium/high`, or
`safe`+`security`?), not something to force by nudging an existing entry's rationale to fit.

## Extending `CATALOG`

- Ground new entries in an actual observed finding where possible, the same way this catalog's
  initial entries came from a real `common-ng/ui` triage run — a rule's abstract description can
  be misleading about how it actually fires in practice.
- Write `note` as a one-sentence rationale a reviewer can act on, not a restatement of the rule
  name.
- If a new rule doesn't cleanly fit, prefer being explicit that it's a judgment call in `note`
  rather than force-fitting it into a bucket that reads as more confident than it is.
- Rules not yet in `CATALOG` fall through to `classifyFallback()` in the same file, which infers a
  conservative best-guess entry from ESLint's own rule metadata (`meta.fixable`, `meta.type`) plus
  a keyword scan for security-sensitive rule names/descriptions. Its output is always fully
  populated but is explicitly marked as *inferred, not curated* in its `note` — treat a rule
  showing up there repeatedly as a signal to add it to `CATALOG` properly instead.
