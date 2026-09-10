// Rule catalog for sonar-triage.
//
// CATALOG maps an ESLint rule id (native ESLint/typescript-eslint/angular-eslint rules, or
// eslint-plugin-sonarjs rules under the `sonarjs/` prefix) to a hand-curated classification:
//
//   category        "security" | "bug-risk" | "code-smell" | "convention"
//   complexity      "trivial" | "low" | "medium" | "high"
//   autoFixSafety   "safe" | "caution" | "unsafe"
//   domainJudgment  boolean — true means the *correct* fix depends on product/business
//                   knowledge an LLM can't infer from the code alone (not just "is this hard")
//   note            one-sentence rationale
//
// See ../references/classification-rubric.md for the reasoning behind these four axes and
// worked examples. Extend this file rather than relying on classifyFallback() for any rule
// that shows up repeatedly in triage runs.

export const CATALOG = {
	"@typescript-eslint/naming-convention": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Rename is mechanical, but check whether the symbol is exported/public before renaming — private members are safe, public ones are a breaking change.",
	},
	"@typescript-eslint/no-unused-vars": {
		category: "code-smell",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Safe to delete, but verify the initializer has no side effects first.",
	},
	"@typescript-eslint/no-unsafe-function-type": {
		category: "bug-risk",
		complexity: "medium",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Needs the actual function signature, which an LLM may guess wrong.",
	},
	"@typescript-eslint/no-require-imports": {
		category: "convention",
		complexity: "low",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Usually a mechanical require->import swap; caution if the require is conditional/lazy-loaded.",
	},
	"@angular-eslint/template/prefer-control-flow": {
		category: "convention",
		complexity: "medium",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Structural template rewrite (*ngIf/*ngFor -> @if/@for) — verify rendering visually.",
	},
	"@angular-eslint/no-output-on-prefix": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "unsafe",
		domainJudgment: false,
		note: "Renaming a public @Output() is a breaking API change for template consumers.",
	},
	"@angular-eslint/template/alt-text": {
		category: "bug-risk",
		complexity: "trivial",
		autoFixSafety: "caution",
		domainJudgment: true,
		note: "Needs to know what the image actually represents to write correct alt text.",
	},
	"@angular-eslint/template/label-has-associated-control": {
		category: "bug-risk",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Needs correct for/id linkage, verify against the actual control.",
	},
	"@angular-eslint/prefer-inject": {
		category: "convention",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Mechanical but changes the constructor signature; check for subclasses relying on it.",
	},
	"@typescript-eslint/no-unused-expressions": {
		category: "bug-risk",
		complexity: "medium",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "Often signals a real bug (e.g. missing await/assignment) — figuring out the intended statement needs context an LLM doesn't have.",
	},
	"@angular-eslint/directive-selector": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Renaming a selector already used in templates elsewhere is a breaking change — check usages first.",
	},
	"prefer-const": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Textbook-safe autofix.",
	},
	"@angular-eslint/no-output-native": {
		category: "bug-risk",
		complexity: "low",
		autoFixSafety: "unsafe",
		domainJudgment: false,
		note: "Output shadows a native DOM event name (real collision risk), but renaming is a breaking API change.",
	},
	"sonarjs/public-static-readonly": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Just add the readonly keyword.",
	},
	"sonarjs/prefer-specific-assertions": {
		category: "code-smell",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Needs the semantically correct specific matcher, not just a syntactic swap.",
	},
	"sonarjs/cognitive-complexity": {
		category: "code-smell",
		complexity: "high",
		autoFixSafety: "unsafe",
		domainJudgment: false,
		note: "Nontrivial control-flow refactor; high regression risk without strong test coverage.",
	},
	"sonarjs/no-clear-text-protocols": {
		category: "security",
		complexity: "trivial",
		autoFixSafety: "caution",
		domainJudgment: true,
		note: "Could be a deliberate local/test endpoint — verify before blindly swapping http->https.",
	},
	"sonarjs/no-nested-functions": {
		category: "code-smell",
		complexity: "medium",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Structural extraction refactor.",
	},
	"sonarjs/no-nested-conditional": {
		category: "code-smell",
		complexity: "medium",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Restructuring branching logic risks changing behavior.",
	},
	"sonarjs/unused-import": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Safe deletion.",
	},
	"sonarjs/parameterized-tests": {
		category: "code-smell",
		complexity: "medium",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Restructuring duplicated tests must preserve original test intent.",
	},
	"sonarjs/concise-regex": {
		category: "code-smell",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Regex rewrites need an equivalence check — subtle semantics.",
	},
	"sonarjs/duplicates-in-character-class": {
		category: "bug-risk",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Likely a real regex bug; edit still needs verification.",
	},
	"sonarjs/todo-tag": {
		category: "code-smell",
		complexity: "medium",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "Can't resolve a TODO without doing the work it describes — classic human-decision item.",
	},
	"sonarjs/prefer-single-boolean-return": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Mechanical simplification.",
	},
	"sonarjs/no-redundant-boolean": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Mechanical simplification.",
	},
	"sonarjs/no-dead-store": {
		category: "bug-risk",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: true,
		note: "The dead write might indicate a bug (wrong variable read afterward) rather than truly dead code.",
	},
	"sonarjs/no-nested-template-literals": {
		category: "code-smell",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Readability refactor, low but nonzero behavior risk.",
	},
	"sonarjs/no-unused-vars": {
		category: "code-smell",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Same as @typescript-eslint/no-unused-vars.",
	},
	"sonarjs/no-trivial-assertions": {
		category: "code-smell",
		complexity: "medium",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "Signals an incomplete test — writing the real assertion needs to know what the test should actually check.",
	},
	"sonarjs/super-linear-regex": {
		category: "security",
		complexity: "medium",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "ReDoS risk; rewrite needs a careful equivalence check.",
	},
	"sonarjs/no-floating-point-equality": {
		category: "bug-risk",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: true,
		note: "Needs an appropriate domain-specific epsilon, not a generic one.",
	},
	"sonarjs/use-type-alias": {
		category: "convention",
		complexity: "low",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Mechanical extraction.",
	},
	"sonarjs/pseudo-random": {
		category: "security",
		complexity: "medium",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "High false-positive rate — need to know if this Math.random() use is actually security-sensitive.",
	},
	"sonarjs/assertions-in-tests": {
		category: "code-smell",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Test structure change, verify assertions still run.",
	},
	"sonarjs/no-globals-shadowing": {
		category: "bug-risk",
		complexity: "low",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Simple local rename.",
	},
	"sonarjs/prefer-promise-shorthand": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Mechanical simplification.",
	},
	"sonarjs/no-nested-assignment": {
		category: "code-smell",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Splitting the assignment is usually safe but verify order-of-evaluation isn't relied upon.",
	},
	"sonarjs/no-inverted-boolean-check": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Mechanical simplification.",
	},
	"sonarjs/no-hardcoded-passwords": {
		category: "security",
		complexity: "trivial",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "Classic false-positive-prone rule (a field literally named 'password' isn't always a secret) — always needs a human to confirm real vs. false positive, and if real, where the value should actually come from.",
	},
	"sonarjs/regex-complexity": {
		category: "code-smell",
		complexity: "medium",
		autoFixSafety: "caution",
		domainJudgment: false,
		note: "Regex rewrite, verify equivalence.",
	},
	"sonarjs/no-ignored-exceptions": {
		category: "bug-risk",
		complexity: "medium",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "Correct handling depends on the intended error semantics, which isn't visible in the code alone.",
	},
	"sonarjs/single-character-alternation": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Mechanical regex simplification.",
	},
	"sonarjs/no-angular-bypass-sanitization": {
		category: "security",
		complexity: "medium",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "Is the sanitization bypass genuinely required for legitimate rich content, or is it an XSS hole? Needs a human call.",
	},
	"sonarjs/no-invariant-returns": {
		category: "bug-risk",
		complexity: "medium",
		autoFixSafety: "unsafe",
		domainJudgment: true,
		note: "A function always returning the same value may be dead logic or a real bug — needs to know the intended behavior.",
	},

	// Common rules not seen in the validated common-ng run, but worth covering out of the box.
	"no-console": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Textbook-safe removal/gating.",
	},
	"no-debugger": {
		category: "bug-risk",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "Debugger statements should never ship; safe to remove.",
	},
	eqeqeq: {
		category: "bug-risk",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "== -> === is a mechanical, well-understood autofix.",
	},
	"no-var": {
		category: "convention",
		complexity: "trivial",
		autoFixSafety: "safe",
		domainJudgment: false,
		note: "var -> let/const is a textbook-safe autofix.",
	},
	"@typescript-eslint/no-explicit-any": {
		category: "bug-risk",
		complexity: "low",
		autoFixSafety: "caution",
		domainJudgment: true,
		note: "Picking the real type needs domain knowledge an LLM doesn't have from the code alone.",
	},
};

const FALLBACK_SECURITY_KEYWORDS = [
	"password",
	"secret",
	"token",
	"credential",
	"sanitiz",
	"xss",
	"inject",
	"protocol",
	"random",
	"crypt",
	"csrf",
	"cors",
	"eval",
];

/**
 * Best-guess classification for a rule id that isn't in CATALOG, derived from ESLint's own
 * rule metadata (`meta`) rather than hand-curated. Always returns a fully-populated entry.
 *
 * @param {string} ruleId
 * @param {{ fixable?: string, type?: string, docs?: { description?: string } } | undefined} meta
 */
export function classifyFallback(ruleId, meta) {
	const fixable = Boolean(meta?.fixable);
	const type = meta?.type;

	let category = "code-smell";
	if (type === "problem") {
		category = "bug-risk";
	}

	let complexity = fixable ? "trivial" : "medium";
	let autoFixSafety = fixable ? "safe" : "caution";
	let domainJudgment = false;

	const haystack = `${ruleId} ${meta?.docs?.description ?? ""}`.toLowerCase();
	const isSecurityMatch = FALLBACK_SECURITY_KEYWORDS.some((keyword) => haystack.includes(keyword));
	if (isSecurityMatch) {
		category = "security";
		domainJudgment = true;
	}

	return {
		category,
		complexity,
		autoFixSafety,
		domainJudgment,
		note: `Inferred from ESLint rule metadata (not curated) — rule "${ruleId}" is not yet in the sonar-triage catalog.`,
	};
}

/**
 * Pure decision function: maps a catalog entry to a recommended action.
 *
 * @param {{ category: string, complexity: string, autoFixSafety: string, domainJudgment: boolean }} entry
 * @returns {"flag-for-review" | "escalate-security-review" | "auto-fix-with-spot-check" | "auto-fix"}
 */
export function decide(entry) {
	if (entry.domainJudgment) return "flag-for-review";
	if (entry.category === "security") {
		return entry.autoFixSafety === "safe" ? "auto-fix-with-spot-check" : "escalate-security-review";
	}
	if (entry.autoFixSafety === "safe" && ["trivial", "low"].includes(entry.complexity)) return "auto-fix";
	if (entry.autoFixSafety === "safe") return "auto-fix-with-spot-check";
	return "flag-for-review";
}
