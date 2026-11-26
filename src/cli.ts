#!/usr/bin/env node
// maisongr-typo check <files or folders…>   reports, exits 1 when something needs fixing (for CI)
// maisongr-typo fix <files or folders…>     rewrites the files
// maisongr-typo < in.txt > out.txt          typesets standard input
// Exit codes: 0 nothing to fix (or fixed), 1 problems found by check, 2 a usage error or a bug.

import { readFileSync, writeFileSync } from "node:fs";
import { expand, kindOf, processText, type FileIssue, type Kind } from "./files.js";
import type { Options } from "./options.js";

const HELP = `maisongr-typo: French typography, Québec first (OQLF), France on request.

Usage
  maisongr-typo check <files or folders…>   list what needs fixing; exit 1 if anything does
  maisongr-typo fix <files or folders…>     fix the files in place
  maisongr-typo [--format markdown] < in.txt > out.txt

Files: .md .mdx .markdown .html .htm .txt; .json named on the command line (its string values; never its keys);
JavaScript and TypeScript (.js .jsx .ts .tsx .mjs .cjs .mts .cts): their French strings, never the code. A French file
(fr.ts, fr-CA.js, locales/fr/…) whole; elsewhere strings under an fr key, or that read as French.
Folders are searched for the first ones, skipping node_modules, .git and build output.

Options
  --locale fr-CA|fr-FR      default fr-CA (Office québécois de la langue française)
  --narrow                  fr-CA: a narrow no-break space before ; ! ? (the OQLF accepts it; default: none)
  --keep "Toqué!,Yahoo!"    spellings to leave exactly as written
  --only-key fr             JSON: only strings under a key named fr
  --code                    in folders, read every JavaScript and TypeScript file, not only French ones
  --format text|markdown|html   for standard input (default text)
  --colon-hours             8:30 → 8 h 30 too
  --group-four-digits       1490 $ → 1 490 $ too
  --no-quotes --no-apostrophes --no-ellipsis --no-hours --no-ordinals --no-dollar-after
  --json                    print the report as JSON
  --version, --help
`;

interface Args { command: "check" | "fix" | "stdin"; paths: string[]; options: Options; onlyKey?: string; json: boolean; format?: Kind; code: boolean }

function parse(argv: string[]): Args {
  const options: Options = {};
  const args: Args = { command: "stdin", paths: [], options, json: false, code: false };
  const value = (i: number, flag: string) => {
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) throw new Usage(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    switch (a) {
      case "check": case "fix":
        if (args.command !== "stdin" || args.paths.length) throw new Usage(`unexpected "${a}"`);
        args.command = a; break;
      case "--locale": {
        const v = value(i++, a);
        if (v !== "fr-CA" && v !== "fr-FR") throw new Usage("--locale is fr-CA or fr-FR");
        options.locale = v; break;
      }
      case "--narrow": options.highPunctuation = "narrow"; break;
      case "--keep": options.keep = value(i++, a).split(",").map((s) => s.trim()).filter(Boolean); break;
      case "--only-key": args.onlyKey = value(i++, a); break;
      case "--code": args.code = true; break;
      case "--format": {
        const v = value(i++, a);
        if (v !== "text" && v !== "markdown" && v !== "html") throw new Usage("--format is text, markdown or html");
        args.format = v; break;
      }
      case "--colon-hours": options.colonHours = true; break;
      case "--group-four-digits": options.groupFourDigits = true; break;
      case "--no-quotes": options.quotes = false; break;
      case "--no-apostrophes": options.apostrophes = false; break;
      case "--no-ellipsis": options.ellipsis = false; break;
      case "--no-hours": options.hours = false; break;
      case "--no-ordinals": options.ordinals = false; break;
      case "--no-dollar-after": options.dollarAfter = false; break;
      case "--json": args.json = true; break;
      default:
        if (a.startsWith("-")) throw new Usage(`unknown option ${a}`);
        if (args.command === "stdin") throw new Usage(`"${a}": say check or fix first`);
        args.paths.push(a);
    }
  }
  if (args.command !== "stdin" && !args.paths.length) throw new Usage(`${args.command} needs at least one file or folder`);
  return args;
}

class Usage extends Error {}

/** A space the reader can see in a report: U+00A0 as ⍽, U+202F as ⸱. */
const show = (s: string) => JSON.stringify(s.replace(/ /g, "⍽").replace(/ /g, "⸱"));

function where(file: string, i: FileIssue): string {
  return i.key !== undefined ? `${file} [${i.key}] ${i.column}` : `${file}:${i.line}:${i.column}`;
}

function version(): string {
  return (JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string }).version;
}

function main(argv: string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) { process.stdout.write(HELP); return 0; }
  if (argv.includes("--version")) { process.stdout.write(`${version()}\n`); return 0; }
  const args = parse(argv);

  if (args.command === "stdin") {
    if (process.stdin.isTTY) { process.stdout.write(HELP); return 2; }
    const input = readFileSync(0, "utf8");
    process.stdout.write(processText(input, args.format ?? "text", args.options, args.onlyKey).output);
    return 0;
  }

  const report: { file: string; issues: FileIssue[]; fixed: boolean }[] = [];
  for (const file of expand(args.paths, args.code)) {
    const source = readFileSync(file, "utf8");
    const { issues, output } = processText(source, kindOf(file), args.options, args.onlyKey, file);
    const fixed = args.command === "fix" && output !== source;
    if (fixed) writeFileSync(file, output);
    report.push({ file, issues, fixed });
  }

  const total = report.reduce((n, r) => n + r.issues.length, 0);
  if (args.json) {
    process.stdout.write(`${JSON.stringify({ ok: args.command === "fix" || total === 0, files: report.length, issues: total, report }, null, 2)}\n`);
  } else {
    for (const { file, issues, fixed } of report) {
      for (const i of issues) process.stdout.write(`${where(file, i)}  ${i.rule}  ${show(i.found)} → ${show(i.expected)}  ${i.message}\n`);
      if (fixed) process.stdout.write(`fixed ${file}\n`);
    }
    const files = `${report.length} file${report.length === 1 ? "" : "s"}`;
    process.stdout.write(args.command === "fix"
      ? `${total} fix${total === 1 ? "" : "es"} in ${files}.\n`
      : total ? `${total} problem${total === 1 ? "" : "s"} in ${files}. Run "maisongr-typo fix" to fix them.\n` : `No problems in ${files}.\n`);
  }
  return args.command === "check" && total > 0 ? 1 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  process.stderr.write(e instanceof Usage ? `maisongr-typo: ${e.message}\nRun maisongr-typo --help.\n` : `maisongr-typo: ${(e as Error).stack ?? e}\n`);
  process.exitCode = 2;
}
