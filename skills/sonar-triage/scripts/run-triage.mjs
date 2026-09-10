#!/usr/bin/env node
// sonar-triage: run a local, offline SonarQube-equivalent lint pass (ESLint's own ruleset plus
// eslint-plugin-sonarjs) against a target project, classify every finding by complexity /
// auto-fix safety / domain-judgment-needed, and render a Markdown triage report.
//
// Report + classify only. This script never edits, fixes, or writes into the target project —
// it only reads the target's config/binaries to run a lint pass, and writes its report to
// --out (default: ./sonar-triage-report.md, resolved against the *invoking* cwd, never the
// target). See the non-negotiable node_modules safety rule below before touching anything here.

import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import os from "node:os";

import { CATALOG, classifyFallback, decide } from "./rule-catalog.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = resolve(SCRIPT_DIR, "..");
const CACHE_DIR = join(SKILL_DIR, ".cache");
const INVOKING_CWD = process.cwd();

const ACTION_ORDER = [
	"escalate-security-review",
	"flag-for-review",
	"auto-fix-with-spot-check",
	"auto-fix",
];

const ACTION_LABELS = {
	"escalate-security-review": "Escalate — security review",
	"flag-for-review": "Flag for human review",
	"auto-fix-with-spot-check": "Auto-fix with spot-check",
	"auto-fix": "Auto-fix",
};

function fail(message) {
	process.stderr.write(`sonar-triage: ${message}\n`);
	process.exit(1);
}

function expandHome(p) {
	if (!p) return p;
	if (p === "~") return os.homedir();
	if (p.startsWith("~/")) return join(os.homedir(), p.slice(2));
	return p;
}

function parseArgs(argv) {
	const args = { target: null, out: null };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--target" || arg === "-t") {
			args.target = argv[++i];
		} else if (arg.startsWith("--target=")) {
			args.target = arg.slice("--target=".length);
		} else if (arg === "--out" || arg === "-o") {
			args.out = argv[++i];
		} else if (arg.startsWith("--out=")) {
			args.out = arg.slice("--out=".length);
		} else if (arg === "--help" || arg === "-h") {
			args.help = true;
		}
	}
	return args;
}

function printHelp() {
	process.stdout.write(`Usage: node run-triage.mjs --target <path> [--out <path>]

  --target <path>  Path to the target project. Must contain eslint.config.js
                    (searched at the root and one level into common subdirs
                    like ui/) and an installed node_modules/.bin/eslint.
  --out <path>     Where to write the Markdown report. Defaults to
                    ./sonar-triage-report.md, resolved against the directory
                    this script is invoked from (never inside the target).

This script only reads the target project (its eslint.config.js and its own
installed ESLint binary) to run a lint pass. It never writes into the target,
never touches its package.json/lockfile, and never installs anything into its
node_modules. Report + classify only — no auto-fix is executed.
`);
}

// --- 1. Locate the target's eslint.config.js, mirroring how global__eslint.yml discovers it
//        (root first, then one level into common subdirs) --------------------------------------

const CONFIG_FILENAMES = ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs"];
const PRIORITY_SUBDIRS = ["ui", "app", "web", "client", "frontend", "src"];
const SKIP_SUBDIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".angular"]);

function findConfigIn(dir) {
	for (const filename of CONFIG_FILENAMES) {
		const candidate = join(dir, filename);
		if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
	}
	return null;
}

function findEslintConfig(targetRoot) {
	const searched = [targetRoot];
	const direct = findConfigIn(targetRoot);
	if (direct) return { configPath: direct, searched };

	for (const sub of PRIORITY_SUBDIRS) {
		const dir = join(targetRoot, sub);
		searched.push(dir);
		if (existsSync(dir) && statSync(dir).isDirectory()) {
			const found = findConfigIn(dir);
			if (found) return { configPath: found, searched };
		}
	}

	// Fallback: any other immediate subdirectory not already checked.
	let entries = [];
	try {
		entries = readdirSync(targetRoot, { withFileTypes: true });
	} catch {
		entries = [];
	}
	const rest = entries
		.filter((e) => e.isDirectory() && !SKIP_SUBDIRS.has(e.name) && !PRIORITY_SUBDIRS.includes(e.name))
		.map((e) => e.name)
		.sort();
	for (const sub of rest) {
		const dir = join(targetRoot, sub);
		searched.push(dir);
		const found = findConfigIn(dir);
		if (found) return { configPath: found, searched };
	}

	return { configPath: null, searched };
}

function findEslintBinary(resolvedTargetDir) {
	const binPath = join(resolvedTargetDir, "node_modules", ".bin", "eslint");
	if (existsSync(binPath)) return { kind: "bin", path: binPath };
	const jsPath = join(resolvedTargetDir, "node_modules", "eslint", "bin", "eslint.js");
	if (existsSync(jsPath)) return { kind: "js", path: jsPath };
	return null;
}

// --- 2. Isolated cache dir for eslint-plugin-sonarjs. NEVER installed into the target. --------

function ensureCache() {
	mkdirSync(CACHE_DIR, { recursive: true });
	const pkgPath = join(CACHE_DIR, "package.json");
	if (!existsSync(pkgPath)) {
		writeFileSync(
			pkgPath,
			JSON.stringify({ name: "sonar-triage-cache", private: true, version: "1.0.0" }, null, 2) + "\n",
		);
	}
	const sonarjsInstalled = existsSync(join(CACHE_DIR, "node_modules", "eslint-plugin-sonarjs"));
	if (!sonarjsInstalled) {
		process.stdout.write("sonar-triage: installing eslint-plugin-sonarjs into isolated cache (one-time)...\n");
		const install = spawnSync("npm", ["install", "--no-save", "eslint-plugin-sonarjs"], {
			cwd: CACHE_DIR,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
		if (install.error || install.status !== 0) {
			fail(
				`failed to install eslint-plugin-sonarjs into the isolated cache (${CACHE_DIR}).\n` +
					(install.stderr || install.error?.message || "unknown npm error"),
			);
		}
	}
}

function writeOverlay(eslintConfigAbsPath) {
	const overlayPath = join(CACHE_DIR, "overlay.mjs");
	const content = `// AUTO-GENERATED by sonar-triage/scripts/run-triage.mjs — overwritten on every run.
// Imports the target's own eslint.config.js by absolute path (its bare-specifier imports resolve
// relative to ITS location in the target repo) and adds eslint-plugin-sonarjs, resolved relative
// to this file's location in the isolated cache dir, where it is installed.
import base from ${JSON.stringify(eslintConfigAbsPath)};
import sonarjs from "eslint-plugin-sonarjs";

const baseConfigs = Array.isArray(base) ? base : [base];

export default [
	...baseConfigs,
	{
		files: ["**/*.ts"],
		plugins: { sonarjs },
		rules: { ...sonarjs.configs.recommended.rules },
	},
];
`;
	writeFileSync(overlayPath, content);
	return overlayPath;
}

// --- 3. Run the target's own ESLint binary against the overlay config -------------------------

function runEslint(resolvedTargetDir, overlayPath) {
	const binary = findEslintBinary(resolvedTargetDir);
	if (!binary) {
		fail(
			`no installed ESLint found in ${resolvedTargetDir}/node_modules. ` +
				`Run \`bun install\` or \`npm install\` in that directory first, then re-run sonar-triage.`,
		);
	}

	const cliArgs = ["--config", overlayPath, ".", "--format", "json"];
	const spawnCmd = binary.kind === "bin" ? binary.path : process.execPath;
	const spawnArgs = binary.kind === "bin" ? cliArgs : [binary.path, ...cliArgs];

	const result = spawnSync(spawnCmd, spawnArgs, {
		cwd: resolvedTargetDir,
		encoding: "utf8",
		maxBuffer: 1024 * 1024 * 256,
	});

	if (result.error) {
		fail(`failed to spawn ESLint (${spawnCmd}): ${result.error.message}`);
	}

	// ESLint exits non-zero when it finds lint errors — that is NOT a script failure.
	// Only treat this as a real failure if stdout isn't parseable JSON at all.
	const stdout = result.stdout ?? "";
	let parsed;
	try {
		parsed = JSON.parse(stdout);
	} catch (err) {
		fail(
			`ESLint did not return parseable JSON (exit code ${result.status}).\n` +
				`--- stderr ---\n${(result.stderr || "").slice(0, 4000)}\n` +
				`--- stdout (first 2000 chars) ---\n${stdout.slice(0, 2000)}`,
		);
	}
	return parsed;
}

// --- 4. Best-effort rule-metadata lookup for classifyFallback (never fatal if it fails) -------

async function buildPluginRuleMetaIndex(overlayPath) {
	const index = new Map();
	try {
		const mod = await import(pathToFileURL(overlayPath).href);
		const config = mod.default;
		const configs = Array.isArray(config) ? config : [config];
		for (const c of configs) {
			if (!c || typeof c !== "object" || !c.plugins) continue;
			for (const [prefix, pluginObj] of Object.entries(c.plugins)) {
				if (!pluginObj || !pluginObj.rules) continue;
				for (const [ruleName, ruleDef] of Object.entries(pluginObj.rules)) {
					const id = `${prefix}/${ruleName}`;
					const meta = ruleDef?.meta;
					if (meta && !index.has(id)) index.set(id, meta);
				}
			}
		}
	} catch {
		// Best-effort only — classifyFallback handles a missing meta gracefully.
	}
	return index;
}

function buildCoreRuleMetaIndex(resolvedTargetDir) {
	const index = new Map();
	try {
		const req = createRequire(join(resolvedTargetDir, "package.json"));
		const { Linter } = req("eslint");
		const linter = new Linter();
		const rules = typeof linter.getRules === "function" ? linter.getRules() : null;
		if (rules) {
			for (const [name, rule] of rules) {
				if (rule?.meta) index.set(name, rule.meta);
			}
		}
	} catch {
		// Best-effort only.
	}
	return index;
}

// --- 5. Classification + report rendering ------------------------------------------------------

function escapeMd(str) {
	return String(str ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "\\|").trim();
}

function classifyFinding(ruleId, meta) {
	if (CATALOG[ruleId]) return CATALOG[ruleId];
	return classifyFallback(ruleId, meta);
}

function buildFindings(eslintResults, resolvedTargetDir, metaIndex) {
	const findings = [];
	for (const fileResult of eslintResults) {
		const relPath = relative(resolvedTargetDir, fileResult.filePath) || fileResult.filePath;
		for (const msg of fileResult.messages ?? []) {
			const ruleId = msg.ruleId ?? "(no-rule/parse-error)";
			const meta = msg.ruleId ? metaIndex.get(msg.ruleId) : undefined;
			const entry = msg.ruleId ? classifyFinding(msg.ruleId, meta) : {
				category: "bug-risk",
				complexity: "medium",
				autoFixSafety: "unsafe",
				domainJudgment: true,
				note: "Fatal parse/config error reported by ESLint, not a rule violation — needs manual investigation.",
			};
			const recommendedAction = decide(entry);
			const source = ruleId.startsWith("sonarjs/") ? "sonarjs" : "eslint-native";
			findings.push({
				file: relPath,
				line: msg.line ?? "-",
				ruleId,
				message: msg.message ?? "",
				severity: msg.severity,
				source,
				category: entry.category,
				complexity: entry.complexity,
				autoFixSafety: entry.autoFixSafety,
				domainJudgment: entry.domainJudgment,
				note: entry.note,
				recommendedAction,
			});
		}
	}
	return findings;
}

function summarize(findings) {
	const summary = {
		total: findings.length,
		byAction: Object.fromEntries(ACTION_ORDER.map((a) => [a, 0])),
		byCategory: { security: 0, "bug-risk": 0, "code-smell": 0, convention: 0 },
		bySource: { sonarjs: 0, "eslint-native": 0 },
	};
	for (const f of findings) {
		summary.byAction[f.recommendedAction] = (summary.byAction[f.recommendedAction] ?? 0) + 1;
		summary.byCategory[f.category] = (summary.byCategory[f.category] ?? 0) + 1;
		summary.bySource[f.source] = (summary.bySource[f.source] ?? 0) + 1;
	}
	return summary;
}

function renderReport({ targetRoot, resolvedTargetDir, findings, summary }) {
	const lines = [];
	lines.push("# sonar-triage report");
	lines.push("");
	lines.push(`- **Target:** \`${targetRoot}\` (linted from \`${resolvedTargetDir}\`)`);
	lines.push(`- **Generated:** ${new Date().toISOString()}`);
	lines.push(`- **Total findings:** ${summary.total}`);
	lines.push("");
	lines.push(
		"> This run only reads the target project (its `eslint.config.js` and its own installed " +
			"ESLint binary) to lint it. **It did not modify, fix, or write any file in the target " +
			"project.** Report + classify only — no auto-fix was executed.",
	);
	lines.push("");

	lines.push("## Summary");
	lines.push("");
	lines.push("| Recommended action | Count |");
	lines.push("|---|---|");
	for (const action of ACTION_ORDER) {
		lines.push(`| ${ACTION_LABELS[action]} | ${summary.byAction[action] ?? 0} |`);
	}
	lines.push("");
	lines.push("| Category | Count |");
	lines.push("|---|---|");
	for (const cat of ["security", "bug-risk", "code-smell", "convention"]) {
		lines.push(`| ${cat} | ${summary.byCategory[cat] ?? 0} |`);
	}
	lines.push("");
	lines.push("| Source | Count |");
	lines.push("|---|---|");
	lines.push(`| eslint-native (existing CI ruleset) | ${summary.bySource["eslint-native"] ?? 0} |`);
	lines.push(`| sonarjs (eslint-plugin-sonarjs overlay) | ${summary.bySource["sonarjs"] ?? 0} |`);
	lines.push("");

	for (const action of ACTION_ORDER) {
		const rows = findings.filter((f) => f.recommendedAction === action);
		lines.push(`## ${ACTION_LABELS[action]} (${rows.length})`);
		lines.push("");
		if (rows.length === 0) {
			lines.push("_None._");
			lines.push("");
			continue;
		}
		lines.push("| File:Line | Rule | Message | Complexity | Domain judgment? | Why |");
		lines.push("|---|---|---|---|---|---|");
		for (const f of rows) {
			lines.push(
				`| ${escapeMd(`${f.file}:${f.line}`)} | ${escapeMd(f.ruleId)} | ${escapeMd(f.message)} | ` +
					`${f.complexity} | ${f.domainJudgment ? "yes" : "no"} | ${escapeMd(f.note)} |`,
			);
		}
		lines.push("");
	}

	lines.push("## Out of scope for this POC");
	lines.push("");
	lines.push(
		"`api/` (the .NET side of RightShip-Tech repos) is not covered here. The natural extension " +
			"there is `SonarAnalyzer.CSharp` — a Roslyn analyzer NuGet package that, like this overlay, " +
			"runs fully offline/serverless at build time. Not built as part of this POC.",
	);
	lines.push("");

	return lines.join("\n");
}

// --- main ----------------------------------------------------------------------------------------

async function main() {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		return;
	}
	if (!args.target) {
		printHelp();
		fail("--target <path> is required.");
	}

	const targetRoot = resolve(expandHome(args.target));
	if (!existsSync(targetRoot) || !statSync(targetRoot).isDirectory()) {
		fail(`target path does not exist or is not a directory: ${targetRoot}`);
	}

	const { configPath, searched } = findEslintConfig(targetRoot);
	if (!configPath) {
		fail(
			`could not find eslint.config.js under ${targetRoot}. Searched:\n` +
				searched.map((s) => `  - ${s}`).join("\n"),
		);
	}
	const resolvedTargetDir = dirname(configPath);

	const eslintBinary = findEslintBinary(resolvedTargetDir);
	if (!eslintBinary) {
		fail(
			`found eslint.config.js at ${configPath} but no installed ESLint at ` +
				`${resolvedTargetDir}/node_modules/.bin/eslint (or node_modules/eslint/bin/eslint.js). ` +
				`Run \`bun install\` or \`npm install\` in ${resolvedTargetDir} first, then re-run sonar-triage.`,
		);
	}

	ensureCache();
	const overlayPath = writeOverlay(configPath);

	process.stdout.write(`sonar-triage: linting ${resolvedTargetDir} (this may take a moment)...\n`);
	const eslintResults = runEslint(resolvedTargetDir, overlayPath);

	const pluginMetaIndex = await buildPluginRuleMetaIndex(overlayPath);
	const coreMetaIndex = buildCoreRuleMetaIndex(resolvedTargetDir);
	const metaIndex = new Map([...coreMetaIndex, ...pluginMetaIndex]);

	const findings = buildFindings(eslintResults, resolvedTargetDir, metaIndex);
	const summary = summarize(findings);
	const report = renderReport({ targetRoot, resolvedTargetDir, findings, summary });

	const outPath = resolve(INVOKING_CWD, expandHome(args.out) || "sonar-triage-report.md");
	mkdirSync(dirname(outPath), { recursive: true });
	writeFileSync(outPath, report);

	process.stdout.write("\nsonar-triage summary\n");
	process.stdout.write("=====================\n");
	process.stdout.write(`Total findings: ${summary.total}\n`);
	process.stdout.write("By recommended action:\n");
	for (const action of ACTION_ORDER) {
		process.stdout.write(`  ${ACTION_LABELS[action]}: ${summary.byAction[action] ?? 0}\n`);
	}
	process.stdout.write("By category:\n");
	for (const cat of ["security", "bug-risk", "code-smell", "convention"]) {
		process.stdout.write(`  ${cat}: ${summary.byCategory[cat] ?? 0}\n`);
	}
	process.stdout.write("By source:\n");
	process.stdout.write(`  eslint-native: ${summary.bySource["eslint-native"] ?? 0}\n`);
	process.stdout.write(`  sonarjs: ${summary.bySource["sonarjs"] ?? 0}\n`);
	process.stdout.write(`Report written to: ${outPath}\n`);
	process.stdout.write("No files in the target project were modified.\n");
}

main().catch((err) => {
	fail(err?.stack || err?.message || String(err));
});
